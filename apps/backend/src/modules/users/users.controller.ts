import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { AuditQueryDto } from '../audit/dto/audit-query.dto';
import { PaginatedAuditLogsResponseDto } from '../audit/dto/paginated-audit-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check Users module status' })
  @ApiResponse({ status: 200, description: 'Users module operational' })
  getStatus() {
    return this.usersService.getStatus();
  }

  // `me` routes must be declared before `:id` so the param route does not capture them.
  @Get('me')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() actor: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.getMe(actor);
  }

  @Patch('me')
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Update own name' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or no-op payload' })
  updateMe(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMe(actor, dto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...Object.values(UserRole))
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_LIMIT_LOGIN || 5),
      ttl: Number(process.env.THROTTLE_TTL_MS || 60000),
    },
  })
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({
    status: 400,
    description: 'Invalid, current password incorrect, or same as current',
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(actor, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user with automatic audit trail' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Email address already registered',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.createByAdmin(createUserDto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List users with pagination, sorting, and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list',
    type: PaginatedUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  async findAll(
    @Query() query: UserQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getByIdOrFail(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user attributes with immutable audit logging',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or empty/no-op update payload',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict: Email already exists, self-deactivation attempt, or last admin protection',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.updateByAdmin(id, updateUserDto, actor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete (deactivate) user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deactivated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict: Cannot deactivate own account or last active administrator',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.deactivateByAdmin(id, actor);
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'Get paginated audit logs for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Paginated user audit history',
    type: PaginatedAuditLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    return this.usersService.getAuditLogsForUser(id, query);
  }
}
