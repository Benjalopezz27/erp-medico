import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTreasuryMovementDto } from './treasury.dto';

const errorsFor = async (plain: object) =>
  (await validate(plainToInstance(CreateTreasuryMovementDto, plain))).map(
    (e) => e.property,
  );
const valid = {
  accountType: 'EFECTIVO',
  movementType: 'EGRESO',
  amount: '10.50',
  concept: 'Gasto',
};

describe('CreateTreasuryMovementDto', () => {
  it('accepts a valid manual movement', async () => {
    await expect(errorsFor(valid)).resolves.toEqual([]);
  });

  it.each([
    ['accountType', 'CHEQUES_CARTERA'],
    ['movementType', 'TRANSFERENCIA'],
    ['amount', '1.001'],
    ['amount', '-1'],
    ['concept', ''],
    ['concept', 'x'.repeat(201)],
  ])('rejects invalid %s = %p', async (field, value) => {
    await expect(errorsFor({ ...valid, [field]: value })).resolves.toEqual([
      field,
    ]);
  });
});
