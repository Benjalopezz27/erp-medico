import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '@erp/shared-types';
import { normalizeEmail } from '../../common/utils/string.utils';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'users', status: 'initialized' };
  }

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

  async create(input: CreateUserInput): Promise<User> {
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

  async count(): Promise<number> {
    return this.userRepository.count();
  }
}
