import { amountToWords } from './amount-words';

describe('amountToWords', () => {
  it.each([
    ['0.00', 'cero con 00/100'],
    ['1.00', 'uno con 00/100'],
    ['1250.50', 'mil doscientos cincuenta con 50/100'],
    ['250000.00', 'doscientos cincuenta mil con 00/100'],
    ['100.00', 'cien con 00/100'],
    ['121.05', 'ciento veintiuno con 05/100'],
    ['21000.00', 'veintiún mil con 00/100'],
    [
      '2345678.9',
      'dos millones trescientos cuarenta y cinco mil seiscientos setenta y ocho con 90/100',
    ],
  ])('%s → %s', (input, expected) => {
    expect(amountToWords(input)).toBe(expected);
  });

  it('rejects malformed amounts', () => {
    expect(() => amountToWords('-5.00')).toThrow('Importe inválido');
    expect(() => amountToWords('abc')).toThrow('Importe inválido');
  });
});
