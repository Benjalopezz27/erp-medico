import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole, AuditAction } from '@erp/shared-types';
import { normalizeEmail } from '../../common/utils/string.utils';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { AuditQueryDto } from '../audit/dto/audit-query.dto';
import { PaginatedAuditLogsResponseDto } from '../audit/dto/paginated-audit-response.dto';
import { toUserResponseDto, toPublicUserSnapshot } from './mappers/user.mapper';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  private readonly ADMIN_MUTATION_LOCK_KEY = 42001;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'users', status: 'initialized' };
  }

  // --------------------------------------------------------------------------
  // Internal / Authentication Contracts (Preserved for Auth & Seeds)
  // --------------------------------------------------------------------------
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<User | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return null;
    }

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: normalized });

    if (includePassword) {
      query.addSelect('user.passwordHash');
    }

    return query.getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createInternal(input: CreateUserInput): Promise<User> {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException(
        `User with email "${normalizedEmail}" already exists`,
      );
    }

    const user = this.userRepository.create({
      ...input,
      email: normalizedEmail,
    });

    return this.userRepository.save(user);
  }

  async create(input: CreateUserInput): Promise<User> {
    return this.createInternal(input);
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }

  // --------------------------------------------------------------------------
  // Administrative User CRUD (Issue #42)
  // --------------------------------------------------------------------------
  async findAll(query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const skip = (page - 1) * limit;
    const qb = this.userRepository.createQueryBuilder('user');

    if (search && search.trim() !== '') {
      const searchNormalized = `%${search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: searchNormalized },
      );
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    const allowedSortFields: Record<string, string> = {
      name: 'user.name',
      email: 'user.email',
      role: 'user.role',
      isActive: 'user.isActive',
      createdAt: 'user.createdAt',
      updatedAt: 'user.updatedAt',
    };

    const sortColumn = allowedSortFields[sortBy] || 'user.createdAt';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortColumn, direction).skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: users.map(toUserResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getByIdOrFail(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return toUserResponseDto(user);
  }

  async createByAdmin(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const normalizedEmail = normalizeEmail(dto.email);

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const userRepo = manager.getRepository(User);

      const existing = await userRepo.findOne({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new ConflictException(
          `User with email "${normalizedEmail}" already exists`,
        );
      }

      const passwordHash = await bcrypt.hash(dto.password, 12);
      const user = userRepo.create({
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: dto.role ?? UserRole.VENDEDOR,
        isActive: true,
      });

      let savedUser: User;
      try {
        savedUser = await userRepo.save(user);
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new ConflictException(
            `User with email "${normalizedEmail}" already exists`,
          );
        }
        throw err;
      }

      const newSnapshot = toPublicUserSnapshot(savedUser);

      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityName: 'User',
        entityId: savedUser.id,
        previousValues: null,
        newValues: newSnapshot,
      });

      return toUserResponseDto(savedUser);
    });
  }

  async updateByAdmin(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('Update payload must not be empty');
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const userRepo = manager.getRepository(User);

      // Acquire advisory lock to serialize operations modifying administrator status
      if (dto.role !== undefined || dto.isActive !== undefined) {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [
          this.ADMIN_MUTATION_LOCK_KEY,
        ]);
      }

      const targetUser = await userRepo.findOne({ where: { id } });
      if (!targetUser) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }

      const normalizedNewEmail = dto.email
        ? normalizeEmail(dto.email)
        : undefined;

      const hasNameChange =
        dto.name !== undefined && dto.name.trim() !== targetUser.name;
      const hasEmailChange =
        normalizedNewEmail !== undefined &&
        normalizedNewEmail !== targetUser.email;
      const hasRoleChange =
        dto.role !== undefined && dto.role !== targetUser.role;
      const hasActiveChange =
        dto.isActive !== undefined &&
        dto.isActive !== targetUser.isActive;

      if (
        !hasNameChange &&
        !hasEmailChange &&
        !hasRoleChange &&
        !hasActiveChange
      ) {
        throw new BadRequestException(
          'No effective changes detected in update payload',
        );
      }

      // Invariant: Self-deactivation prevention
      if (dto.isActive === false && actor.id === targetUser.id) {
        throw new ConflictException(
          'Cannot deactivate your own user account',
        );
      }

      // Invariant: Last active administrator protection
      const isDemotingAdmin =
        targetUser.role === UserRole.ADMINISTRADOR &&
        hasRoleChange &&
        dto.role !== UserRole.ADMINISTRADOR;

      const isDeactivatingAdmin =
        targetUser.role === UserRole.ADMINISTRADOR &&
        targetUser.isActive &&
        dto.isActive === false;

      if (isDemotingAdmin || isDeactivatingAdmin) {
        const activeAdminCount = await userRepo.count({
          where: { role: UserRole.ADMINISTRADOR, isActive: true },
        });

        if (activeAdminCount <= 1) {
          throw new ConflictException(
            isDeactivatingAdmin
              ? 'Cannot deactivate the last remaining active administrator'
            : 'Cannot demote the last remaining active administrator',
          );
        }
      }

      // Action precedence: DEACTIVATE > ACTIVATE > ROLE_CHANGE > UPDATE
      const action =
        dto.isActive === false && targetUser.isActive
          ? AuditAction.DEACTIVATE
        : dto.isActive === true && !targetUser.isActive
          ? AuditAction.ACTIVATE
        : hasRoleChange
          ? AuditAction.ROLE_CHANGE
        : AuditAction.UPDATE;

      const previousSnapshot = toPublicUserSnapshot(targetUser);

      if (hasNameChange) targetUser.name = dto.name!.trim();
      if (hasEmailChange) targetUser.email = normalizedNewEmail!;
      if (hasRoleChange) targetUser.role = dto.role!;
      if (hasActiveChange) targetUser.isActive = dto.isActive!;

      let updatedUser: User;
      try {
        updatedUser = await userRepo.save(targetUser);
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new ConflictException(
            `User with email "${normalizedNewEmail}" already exists`,
          );
        }
        throw err;
      }

      const newSnapshot = toPublicUserSnapshot(updatedUser);

      await this.auditService.record(manager, {
        actorId: actor.id,
        action,
        entityName: 'User',
        entityId: updatedUser.id,
        previousValues: previousSnapshot,
        newValues: newSnapshot,
      });

      return toUserResponseDto(updatedUser);
    });
  }

  async deactivateByAdmin(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.updateByAdmin(id, { isActive: false }, actor);
  }

  async getAuditLogsForUser(
    id: string,
    query: AuditQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return this.auditService.findEntityAuditLogs('User', id, query);
  }
}
