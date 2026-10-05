import { TaxCondition, type ISystemConfig } from '@erp/shared-types';
import { describe, expect, it } from 'vitest';
import { buildPatch, toForm } from './system-config.form';

const current: ISystemConfig = {
  issuerRazonSocial: 'Distribuidora Sur SA',
  issuerCuit: '20123456786',
  issuerTaxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  arcaPuntoVenta: 1,
  operatingCurrency: 'ARS',
};

describe('buildPatch', () => {
  it('sends only changed fields, with punto de venta as number', () => {
    const { patch, errors } = buildPatch(current, {
      ...toForm(current),
      arcaPuntoVenta: '5',
      issuerRazonSocial: ' Nueva SA ',
    });
    expect(errors).toEqual({});
    expect(patch).toEqual({ arcaPuntoVenta: 5, issuerRazonSocial: 'Nueva SA' });
  });

  it('returns an empty patch when nothing changed', () => {
    expect(buildPatch(current, toForm(current)).patch).toEqual({});
  });

  it('flags invalid changed fields and omits them from the patch', () => {
    const { patch, errors } = buildPatch(current, {
      ...toForm(current),
      issuerCuit: '20123456787',
      arcaPuntoVenta: '0',
    });
    expect(Object.keys(errors).sort()).toEqual(['arcaPuntoVenta', 'issuerCuit']);
    expect(patch).toEqual({});
  });

  it('does not complain about unconfigured fields left untouched', () => {
    const empty = { ...current, issuerCuit: null, issuerRazonSocial: null };
    expect(buildPatch(empty, toForm(empty)).errors).toEqual({});
  });
});
