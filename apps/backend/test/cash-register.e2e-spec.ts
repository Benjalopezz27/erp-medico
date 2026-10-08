import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryAccountType, TreasuryMovementType } from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { CashRegisterService } from '../src/modules/cash-register/cash-register.service';
import { TreasuryService } from '../src/modules/treasury/treasury.service';
import { User } from '../src/modules/users/entities/user.entity';

describe('Cash register close vs concurrent cash movements (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let userId: string;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await runInitialSeed(ds, {
      adminEmail: 'cash-admin@erp.com',
      adminPassword: 'AdminPassword123!',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    userId = (
      await ds.getRepository(User).findOneByOrFail({
        email: 'cash-admin@erp.com',
      })
    ).id;
  });

  beforeEach(async () => {
    await ds.query(
      'TRUNCATE TABLE treasury_movements, cash_registers RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  it('counts a cash movement still in flight when the register is closed', async () => {
    const cash = app.get(CashRegisterService);
    const treasury = app.get(TreasuryService);
    await cash.open({ openingBalance: '100.00' }, userId);

    let movementInserted!: () => void;
    const inserted = new Promise<void>((r) => (movementInserted = r));
    const inFlight = ds.transaction(async (manager) => {
      await treasury.recordMovement(manager, {
        accountType: TreasuryAccountType.EFECTIVO,
        movementType: TreasuryMovementType.INGRESO,
        amount: '50.00',
        concept: 'Venta en vuelo',
        userId,
      });
      movementInserted();
      await new Promise((r) => setTimeout(r, 300)); // not committed yet
    });
    await inserted;

    // Close races the uncommitted movement: it must wait for it.
    const closed = await cash.close({ actualBalance: '150.00' }, userId);
    await inFlight;

    expect(closed.expectedBalance).toBe('150.00');
    expect(closed.difference).toBe('0.00');
  });
});
