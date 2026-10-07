import { DataSource } from 'typeorm';
import { FiscalDocumentType, PaymentMethod } from '@erp/shared-types';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { User } from '../src/modules/users/entities/user.entity';
import { FiscalNumberingService } from '../src/modules/sales/services/fiscal-numbering.service';

describe('FiscalNumberingService concurrency (E2E, real Postgres)', () => {
  let ds: DataSource;
  let service: FiscalNumberingService;
  let userId: string;

  const cleanup = async (): Promise<void> => {
    await ds.query(
      `DELETE FROM fiscal_documents WHERE sale_id IN (SELECT id FROM sales WHERE sale_number LIKE 'FN-TEST-%')`,
    );
    await ds.query(`DELETE FROM sales WHERE sale_number LIKE 'FN-TEST-%'`);
  };

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
    await cleanup();
    service = new FiscalNumberingService();
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await cleanup();
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

  it('assigns distinct numbers to concurrent workers when ARCA only advances on requestCAE', async () => {
    const pointOfSale = 999; // dedicated test point of sale, unused elsewhere
    const documentType = FiscalDocumentType.FACTURA_B;
    const docIdA = await seedFiscalDocument('A');
    const docIdB = await seedFiscalDocument('B');

    // Fake ARCA like the real one: "last authorized" moves ONLY when a CAE is
    // granted, never when it is read.
    let lastAuthorized = 100;
    const getLastAuthorized = async (): Promise<number> => lastAuthorized;
    const requestCAE = async (number: number): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 50)); // WSFE latency
      if (number !== lastAuthorized + 1) {
        throw new Error(`out of sequence: ${number} after ${lastAuthorized}`);
      }
      lastAuthorized = number;
    };

    // Same shape as FiscalInvoiceProcessor: reserve + CAE inside ONE tx.
    const worker = (docId: string) =>
      ds.transaction(async (manager) => {
        const number = await service.reserveNextNumber(
          docId,
          documentType,
          pointOfSale,
          getLastAuthorized,
          manager,
        );
        await requestCAE(number);
        return number;
      });

    const [numberA, numberB] = await Promise.all([
      worker(docIdA),
      worker(docIdB),
    ]);

    expect([numberA, numberB].sort((a, b) => a - b)).toEqual([101, 102]);
  });

  it('skips numbers already reserved by a pending document awaiting ARCA', async () => {
    const pointOfSale = 998;
    const documentType = FiscalDocumentType.FACTURA_B;
    const docIdA = await seedFiscalDocument('C');
    const docIdB = await seedFiscalDocument('D');

    const reserve = (docId: string) =>
      ds.transaction((manager) =>
        service.reserveNextNumber(
          docId,
          documentType,
          pointOfSale,
          async () => 200,
          manager,
        ),
      );

    // A reserves 201 and commits without a CAE (retrying); ARCA still says 200.
    expect(await reserve(docIdA)).toBe(201);
    expect(await reserve(docIdB)).toBe(202);
  });
});
