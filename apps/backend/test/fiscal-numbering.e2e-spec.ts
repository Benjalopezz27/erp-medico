import { DataSource } from 'typeorm';
import { FiscalDocumentType, PaymentMethod } from '@erp/shared-types';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { User } from '../src/modules/users/entities/user.entity';
import { FiscalDocument } from '../src/modules/sales/entities/fiscal-document.entity';
import { FiscalNumberingService } from '../src/modules/sales/services/fiscal-numbering.service';

describe('FiscalNumberingService concurrency (E2E, real Postgres)', () => {
  let ds: DataSource;
  let service: FiscalNumberingService;
  let userId: string;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await runInitialSeed(ds, {
      adminEmail: 'fiscal-numbering-admin@erp.com',
      adminPassword: 'AdminPassword123!',
    });
    const admin = await ds
      .getRepository(User)
      .findOneByOrFail({ email: 'fiscal-numbering-admin@erp.com' });
    userId = admin.id;
    service = new FiscalNumberingService(ds);
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  async function seedFiscalDocument(saleNumberSuffix: string): Promise<string> {
    const [sale] = await ds.query(
      `INSERT INTO sales (sale_number, customer_id, status, is_credit_sale, requires_fiscal_invoice, payment_method, user_id)
       VALUES ($1, NULL, 'CONFIRMADA', false, true, $2, $3)
       RETURNING id`,
      [`FN-TEST-${saleNumberSuffix}`, PaymentMethod.EFECTIVO, userId],
    );
    const [fiscalDoc] = await ds.query(
      `INSERT INTO fiscal_documents (sale_id, arca_status)
       VALUES ($1, 'PENDIENTE_FACTURACION')
       RETURNING id`,
      [sale.id],
    );
    return fiscalDoc.id;
  }

  it('assigns consecutive numbers to two concurrent jobs for the same point of sale and type, without collision', async () => {
    const pointOfSale = 999; // dedicated test point of sale, unused elsewhere
    const documentType = FiscalDocumentType.FACTURA_B;
    const docIdA = await seedFiscalDocument('A');
    const docIdB = await seedFiscalDocument('B');

    // Shared "ARCA" state: both concurrent calls read from and race against
    // this counter. Without the advisory lock serializing access, both
    // reads would return the same value before either write lands.
    let lastAuthorized = 100;
    const getLastAuthorized = async (): Promise<number> => {
      const snapshot = lastAuthorized;
      await new Promise((resolve) => setTimeout(resolve, 25)); // simulate WSFE latency
      lastAuthorized = snapshot + 1;
      return snapshot;
    };

    const [numberA, numberB] = await Promise.all([
      service.reserveNextNumber(
        docIdA,
        documentType,
        pointOfSale,
        getLastAuthorized,
      ),
      service.reserveNextNumber(
        docIdB,
        documentType,
        pointOfSale,
        getLastAuthorized,
      ),
    ]);

    expect(numberA).not.toBe(numberB);
    expect([numberA, numberB].sort((a, b) => a - b)).toEqual([101, 102]);

    const persistedA = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: docIdA });
    const persistedB = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: docIdB });
    expect(
      [persistedA.documentNumber, persistedB.documentNumber].sort(
        (a, b) => (a ?? 0) - (b ?? 0),
      ),
    ).toEqual([101, 102]);
  });
});
