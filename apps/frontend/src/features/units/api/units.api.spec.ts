import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import {
  getUnitsApi,
  getUnitByIdApi,
  createUnitApi,
  updateUnitApi,
  deleteUnitApi,
} from './units.api';

describe('units.api HTTP client functions', () => {
  const baseUrl = getApiUrl();

  const mockUnit = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Unidad',
    symbol: 'u',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
  };

  it('getUnitsApi fetches all units', async () => {
    server.use(
      http.get(`${baseUrl}/units`, () => {
        return HttpResponse.json([mockUnit]);
      }),
    );

    const result = await getUnitsApi();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Unidad');
  });

  it('getUnitByIdApi fetches unit by id', async () => {
    server.use(
      http.get(`${baseUrl}/units/${mockUnit.id}`, () => {
        return HttpResponse.json(mockUnit);
      }),
    );

    const result = await getUnitByIdApi(mockUnit.id);
    expect(result.id).toBe(mockUnit.id);
  });

  it('createUnitApi sends POST and returns created unit', async () => {
    let capturedBody: any;
    server.use(
      http.post(`${baseUrl}/units`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockUnit, ...capturedBody }, { status: 201 });
      }),
    );

    const result = await createUnitApi({
      name: 'Caja',
      symbol: 'cj',
    });

    expect(capturedBody).toEqual({
      name: 'Caja',
      symbol: 'cj',
    });
    expect(result.symbol).toBe('cj');
  });

  it('updateUnitApi sends PATCH and returns updated unit', async () => {
    let capturedBody: any;
    server.use(
      http.patch(`${baseUrl}/units/${mockUnit.id}`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockUnit, ...capturedBody });
      }),
    );

    const result = await updateUnitApi(mockUnit.id, {
      symbol: 'cjm',
    });

    expect(capturedBody).toEqual({ symbol: 'cjm' });
    expect(result.symbol).toBe('cjm');
  });

  it('deleteUnitApi sends DELETE request', async () => {
    let deletedId = '';
    server.use(
      http.delete(`${baseUrl}/units/:id`, ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteUnitApi(mockUnit.id);
    expect(deletedId).toBe(mockUnit.id);
  });
});
