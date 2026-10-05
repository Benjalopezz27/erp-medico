import { ReceiptsController } from './receipts.controller';

describe('ReceiptsController.getPdf', () => {
  it('renders the receipt with the effective issuer from system settings', async () => {
    const receipt = { receiptNumber: '0001-00000001' };
    const receiptsService = { getDetail: jest.fn().mockResolvedValue(receipt) };
    const pdfService = {
      render: jest.fn().mockResolvedValue(new Uint8Array(1)),
    };
    const settings = {
      getIssuer: jest.fn().mockResolvedValue({
        razonSocial: 'Distribuidora Sur SA',
        cuit: '20123456786',
        taxCondition: null,
      }),
    };
    const controller = new ReceiptsController(
      receiptsService as any,
      pdfService as any,
      settings as any,
    );

    await controller.getPdf('id-1', { set: jest.fn() } as any);

    expect(pdfService.render).toHaveBeenCalledWith({
      receipt,
      emisor: { razonSocial: 'Distribuidora Sur SA', cuit: '20123456786' },
    });
  });

  it('falls back to a placeholder when the issuer is not configured', async () => {
    const pdfService = {
      render: jest.fn().mockResolvedValue(new Uint8Array(1)),
    };
    const controller = new ReceiptsController(
      { getDetail: jest.fn().mockResolvedValue({ receiptNumber: 'x' }) } as any,
      pdfService as any,
      {
        getIssuer: jest.fn().mockResolvedValue({
          razonSocial: null,
          cuit: null,
          taxCondition: null,
        }),
      } as any,
    );

    await controller.getPdf('id-1', { set: jest.fn() } as any);

    expect(pdfService.render).toHaveBeenCalledWith(
      expect.objectContaining({
        emisor: { razonSocial: 'Emisor no configurado', cuit: '' },
      }),
    );
  });
});
