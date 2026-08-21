import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import { UserRole, IUser } from '@erp/shared-types';
import {
  getUsersApi,
  getUserByIdApi,
  createUserApi,
  updateUserApi,
  deactivateUserApi,
  reactivateUserApi,
} from './users.api';

const mockUser: IUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Carlos Gomez',
  email: 'carlos@erp.com',
  role: UserRole.VENDEDOR,
  isActive: true,
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};

describe('users.api HTTP client functions', () => {
  const baseUrl = getApiUrl();

  it('getUsersApi requests users with query parameters', async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get(`${baseUrl}/users`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          data: [mockUser],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );

    const result = await getUsersApi({
      page: 1,
      limit: 10,
      search: 'carlos',
      role: UserRole.VENDEDOR,
      isActive: true,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('carlos@erp.com');
    expect(capturedUrl).toContain('page=1');
    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).toContain('search=carlos');
    expect(capturedUrl).toContain('role=VENDEDOR');
    expect(capturedUrl).toContain('isActive=true');
  });

  it('getUserByIdApi fetches a single user by ID', async () => {
    server.use(
      http.get(`${baseUrl}/users/:id`, ({ params }) => {
        return HttpResponse.json({ ...mockUser, id: params.id });
      }),
    );

    const result = await getUserByIdApi('user-123');
    expect(result.id).toBe('user-123');
    expect(result.name).toBe('Carlos Gomez');
  });

  it('createUserApi sends POST request with payload', async () => {
    server.use(
      http.post(`${baseUrl}/users`, async ({ request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json(
          {
            ...mockUser,
            name: body.name,
            email: body.email,
            role: body.role,
          },
          { status: 201 },
        );
      }),
    );

    const result = await createUserApi({
      name: 'Ana Ventas',
      email: 'ana@erp.com',
      password: 'Password123!',
      role: UserRole.VENDEDOR,
    });

    expect(result.name).toBe('Ana Ventas');
    expect(result.email).toBe('ana@erp.com');
  });

  it('updateUserApi sends PATCH request with delta payload', async () => {
    server.use(
      http.patch(`${baseUrl}/users/:id`, async ({ params, request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json({
          ...mockUser,
          id: params.id,
          ...body,
        });
      }),
    );

    const result = await updateUserApi('user-123', {
      name: 'Carlos Actualizado',
      role: UserRole.ADMINISTRADOR,
    });

    expect(result.id).toBe('user-123');
    expect(result.name).toBe('Carlos Actualizado');
    expect(result.role).toBe(UserRole.ADMINISTRADOR);
  });

  it('deactivateUserApi sends DELETE request to soft-delete user', async () => {
    server.use(
      http.delete(`${baseUrl}/users/:id`, ({ params }) => {
        return HttpResponse.json({
          ...mockUser,
          id: params.id,
          isActive: false,
        });
      }),
    );

    const result = await deactivateUserApi('user-123');
    expect(result.id).toBe('user-123');
    expect(result.isActive).toBe(false);
  });

  it('reactivateUserApi sends PATCH request with isActive: true', async () => {
    server.use(
      http.patch(`${baseUrl}/users/:id`, async ({ params, request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json({
          ...mockUser,
          id: params.id,
          isActive: body.isActive,
        });
      }),
    );

    const result = await reactivateUserApi('user-123');
    expect(result.id).toBe('user-123');
    expect(result.isActive).toBe(true);
  });
});
