import { IUser, UserRole, IAuthUser } from '@erp/shared-types';

export { UserRole };
export type { IUser, IAuthUser };

export const USER_SORT_FIELDS = ['name', 'email', 'role', 'isActive', 'createdAt'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export interface UserSearchParams {
  sortBy?: UserSortField;
  sortOrder?: 'ASC' | 'DESC';
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedUsersResponse {
  data: IUser[];
  meta: PaginationMeta;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}
