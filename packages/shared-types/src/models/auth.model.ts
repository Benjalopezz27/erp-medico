import { UserRole } from '../enums/roles.enum';
import { AuditAction } from '../enums/audit.enum';

export interface IAuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface IAuthSession {
  accessToken: string;
  user: IAuthUser;
}

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
  actorId: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt: Date | string;
}

export interface IAuditLogWithActor extends IAuditLog {
  actor?: IAuthUser;
}
