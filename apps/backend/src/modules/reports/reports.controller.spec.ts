import 'reflect-metadata';
import {
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { UserRole } from '@erp/shared-types';
import { ROLES_KEY } from '../auth/constants/auth.constants';
import { ReportsController } from './reports.controller';
import { ExportService } from './export.service';
import { ReportDefinition, ReportResult } from './report.types';

const result: ReportResult = {
  title: 'Ventas',
  columns: [{ key: 'a', header: 'A' }],
  rows: [{ a: 'x' }],
};

describe('ReportsController', () => {
  const generate = jest.fn().mockResolvedValue(result);
  const definition: ReportDefinition = { type: 'sales', generate };
  const exporter = {
    toExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    toPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  } as unknown as ExportService;
  const controller = new ReportsController([definition], exporter);
  const res = () => ({ set: jest.fn() }) as never;

  beforeEach(() => jest.clearAllMocks());

  it('returns json by default', async () => {
    await expect(controller.run('sales', {}, res())).resolves.toEqual(result);
  });

  it('passes filters without format to the report', async () => {
    await controller.run(
      'sales',
      { from: '2026-01-01', format: 'json' },
      res(),
    );
    expect(generate).toHaveBeenCalledWith({ from: '2026-01-01' });
  });

  it('404 on unknown type', async () => {
    await expect(controller.run('nope', {}, res())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('400 on invalid format', async () => {
    await expect(
      controller.run('sales', { format: 'csv' }, res()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    [
      'excel',
      'xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    ['pdf', 'pdf', 'application/pdf'],
  ])('sends %s as attachment', async (format, ext, type) => {
    const r = res();
    const out = await controller.run('sales', { format }, r);
    expect(out).toBeInstanceOf(StreamableFile);
    const [headers] = (r as unknown as { set: jest.Mock }).set.mock.calls[0];
    expect(headers['Content-Type']).toBe(type);
    expect(headers['Content-Disposition']).toMatch(
      new RegExp(
        `^attachment; filename="sales-\\d{4}-\\d{2}-\\d{2}\\.${ext}"$`,
      ),
    );
  });

  it('is restricted to ADMINISTRADOR', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ReportsController.prototype.run,
    );
    expect(roles).toEqual([UserRole.ADMINISTRADOR]);
  });
});
