import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import {
  getCategoriesApi,
  getCategoryByIdApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from './categories.api';

describe('categories.api HTTP client functions', () => {
  const baseUrl = getApiUrl();

  const mockCategory = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Analgésicos',
    description: 'Medicamentos analgésicos',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
  };

  it('getCategoriesApi fetches all categories', async () => {
    server.use(
      http.get(`${baseUrl}/categories`, () => {
        return HttpResponse.json([mockCategory]);
      }),
    );

    const result = await getCategoriesApi();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Analgésicos');
  });

  it('getCategoryByIdApi fetches category by id', async () => {
    server.use(
      http.get(`${baseUrl}/categories/${mockCategory.id}`, () => {
        return HttpResponse.json(mockCategory);
      }),
    );

    const result = await getCategoryByIdApi(mockCategory.id);
    expect(result.id).toBe(mockCategory.id);
  });

  it('createCategoryApi sends POST and returns created category', async () => {
    let capturedBody: any;
    server.use(
      http.post(`${baseUrl}/categories`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockCategory, ...capturedBody }, { status: 201 });
      }),
    );

    const result = await createCategoryApi({
      name: 'Antibióticos',
      description: 'Línea antibiótica',
    });

    expect(capturedBody).toEqual({
      name: 'Antibióticos',
      description: 'Línea antibiótica',
    });
    expect(result.name).toBe('Antibióticos');
  });

  it('updateCategoryApi sends PATCH and returns updated category', async () => {
    let capturedBody: any;
    server.use(
      http.patch(`${baseUrl}/categories/${mockCategory.id}`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockCategory, ...capturedBody });
      }),
    );

    const result = await updateCategoryApi(mockCategory.id, {
      name: 'Analgésicos y Sedantes',
    });

    expect(capturedBody).toEqual({ name: 'Analgésicos y Sedantes' });
    expect(result.name).toBe('Analgésicos y Sedantes');
  });

  it('deleteCategoryApi sends DELETE request', async () => {
    let deletedId = '';
    server.use(
      http.delete(`${baseUrl}/categories/:id`, ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteCategoryApi(mockCategory.id);
    expect(deletedId).toBe(mockCategory.id);
  });
});
