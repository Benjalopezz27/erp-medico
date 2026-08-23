import { ServiceUnavailableException } from '@nestjs/common';
import { ArcaDisabledService } from './arca-disabled.service';
import { FiscalDocumentData } from '@erp/shared-types';

describe('ArcaDisabledService', () => {
  let service: ArcaDisabledService;

  beforeEach(() => {
    service = new ArcaDisabledService();
  });

  it('should throw ServiceUnavailableException on login()', async () => {
    await expect(service.login()).rejects.toThrow(ServiceUnavailableException);
    await expect(service.login()).rejects.toThrow(
      /El servicio de facturación electrónica ARCA está deshabilitado/,
    );
  });

  it('should throw ServiceUnavailableException on requestCAE()', async () => {
    const mockData = {} as FiscalDocumentData;
    await expect(service.requestCAE(mockData)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException on queryDocument()', async () => {
    await expect(service.queryDocument(1, 1, 1)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
