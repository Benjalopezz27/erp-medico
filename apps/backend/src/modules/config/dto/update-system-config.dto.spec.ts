import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSystemConfigDto } from './update-system-config.dto';

const errorsFor = async (plain: object) =>
  (await validate(plainToInstance(UpdateSystemConfigDto, plain))).map(
    (e) => e.property,
  );

describe('UpdateSystemConfigDto', () => {
  it('accepts a valid partial payload', async () => {
    await expect(
      errorsFor({
        issuerCuit: '20123456786',
        issuerTaxCondition: 'MONOTRIBUTO',
        arcaPuntoVenta: '5',
        operatingCurrency: 'USD',
        issuerRazonSocial: 'Distribuidora Sur SA',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts an empty payload', async () => {
    await expect(errorsFor({})).resolves.toEqual([]);
  });

  it.each([
    ['issuerCuit', '20123456787'],
    ['issuerTaxCondition', 'OTRA'],
    ['arcaPuntoVenta', 0],
    ['arcaPuntoVenta', 100000],
    ['arcaPuntoVenta', 1.5],
    ['operatingCurrency', 'EUR'],
    ['issuerRazonSocial', ''],
    ['issuerRazonSocial', 'x'.repeat(151)],
  ])('rejects invalid %s = %p', async (field, value) => {
    await expect(errorsFor({ [field]: value })).resolves.toEqual([field]);
  });
});
