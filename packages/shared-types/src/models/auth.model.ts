import { UserRole } from '../enums/roles.enum';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAuditLog {
  id: string;
  userId: string;
  action: string;
  entityName: string;
  entityId: string;
  previousValueJSON?: string | null;
  newValueJSON?: string | null;
  createdAt: Date | string;
}

export interface IAuthSession {
  accessToken: string;
  user: IUser;
}
