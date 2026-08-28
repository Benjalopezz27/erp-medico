import { AddPriceReviewDecisions1700000000020 } from './migrations/1700000000020-AddPriceReviewDecisions';

describe('AddPriceReviewDecisions1700000000020', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new AddPriceReviewDecisions1700000000020();

  beforeEach(() => jest.clearAllMocks());

  it('backfills compatible decisions and enforces the state machine', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('decision_action');
    expect(sql).toContain('decision_reason');
    expect(sql).toContain('APPROVE_SUGGESTED');
    expect(sql).toContain('APPROVE_CUSTOM');
    expect(sql).toContain("'REOPEN'");
    expect(sql).toContain('CHK_price_review_state_decision');
    expect(sql).toContain('IDX_price_review_product_created');
    expect(sql).toContain('confirmed_by_user_id');
  });

  it('removes only the workflow additions on rollback', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('DROP INDEX "IDX_price_review_product_created"');
    expect(sql).toContain('DROP CONSTRAINT "CHK_price_review_state_decision"');
    expect(sql).toContain('DROP COLUMN "decision_action"');
  });
});
