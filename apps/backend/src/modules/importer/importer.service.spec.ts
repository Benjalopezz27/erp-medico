import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImporterErrorCode, TaxCondition } from '@erp/shared-types';
import { SuppliersService } from '../suppliers/suppliers.service';
import { ImporterService } from './importer.service';

const supplier = {
  id: '56ab5c44-90a6-4e22-a940-3bb67939dc1f',
  businessName: 'Proveedor Médico',
  cuit: '30712345678',
  taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function file(contents = 'SKU,Costo\n001,1250\n'): Express.Multer.File {
  const buffer = Buffer.from(contents);
  return {
    fieldname: 'file',
    originalname: 'lista.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    size: buffer.length,
    destination: '',
    filename: '',
    path: '',
    buffer,
    stream: undefined,
  } as Express.Multer.File;
}

describe('ImporterService', () => {
  const findOne = jest.fn();
  const service = new ImporterService({
    findOne,
  } as unknown as SuppliersService);

  beforeEach(() => {
    findOne.mockReset();
    findOne.mockResolvedValue(supplier);
  });

  it('returns a bounded read-only upload response', async () => {
    const result = await service.uploadFile(
      { supplierId: supplier.id },
      file(),
    );
    expect(result.supplier).toEqual({
      id: supplier.id,
      businessName: supplier.businessName,
      cuit: supplier.cuit,
    });
    expect(result.headers).toEqual(['SKU', 'Costo']);
    expect(result.sampleRows).toEqual([
      { rowNumber: 2, cells: ['001', '1250'] },
    ]);
    expect(result.fileChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('returns stable missing, not-found and inactive errors', async () => {
    await expect(
      service.uploadFile({ supplierId: supplier.id }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);

    findOne.mockRejectedValueOnce(new NotFoundException());
    await expect(
      service.uploadFile({ supplierId: supplier.id }, file()),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND,
      }),
    });

    findOne.mockResolvedValueOnce({ ...supplier, isActive: false });
    await expect(
      service.uploadFile({ supplierId: supplier.id }, file()),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
      }),
    });
  });
});
