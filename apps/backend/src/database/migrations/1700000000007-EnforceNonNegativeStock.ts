import { MigrationInterface, QueryRunner, TableCheck } from 'typeorm';

export class EnforceNonNegativeStock1700000000007 implements MigrationInterface {
  name = 'EnforceNonNegativeStock1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Pre-validation: Abort with descriptive error if negative stock records already exist
    const negativeRecords: { count: string }[] = await queryRunner.query(`
      SELECT COUNT(*)::text as count
      FROM "stocks"
      WHERE "current_base_stock" < 0;
    `);

    const negativeCount = parseInt(negativeRecords[0]?.count || '0', 10);
    if (negativeCount > 0) {
      throw new Error(
        `Migration 1700000000007 aborted: Found ${negativeCount} stock record(s) with negative balance. Manual reconciliation required before applying CHK_stocks_current_base_stock_non_negative constraint.`,
      );
    }

    // 2. Add authoritative PostgreSQL CHECK constraint
    await queryRunner.createCheckConstraint(
      'stocks',
      new TableCheck({
        name: 'CHK_stocks_current_base_stock_non_negative',
        expression: `"current_base_stock" >= 0`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropCheckConstraint(
      'stocks',
      'CHK_stocks_current_base_stock_non_negative',
    );
  }
}
