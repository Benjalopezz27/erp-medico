import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { normalizeEmail } from '../../common/utils/string.utils';
import { UserRole } from '@erp/shared-types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { DUMMY_BCRYPT_HASH } from './constants/auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'auth', status: 'initialized' };
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.usersService.createInternal({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.VENDEDOR,
      isActive: false,
    });
    return { message: 'Account created, pending administrator approval' };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = normalizeEmail(loginDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail, true);
    const storedHash = user?.passwordHash;
    const hashToCompare = storedHash ?? DUMMY_BCRYPT_HASH;

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(loginDto.password, hashToCompare);
    } catch {
      // If the stored hash is corrupt or unparseable, execute dummy comparison to mitigate timing differences
      await bcrypt.compare(loginDto.password, DUMMY_BCRYPT_HASH);
    }

    if (!user || !storedHash || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only reachable with a correct password, so it does not reveal whether an email exists.
    if (!user.isActive) {
      throw new ForbiddenException('Account pending approval');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }
}
