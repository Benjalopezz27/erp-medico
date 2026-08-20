import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { PaginationMetaDto } from '../../audit/dto/paginated-audit-response.dto';

export { PaginationMetaDto };

export class PaginatedUsersResponseDto {
  @ApiProperty({
    description: 'List of users on current page',
    type: [UserResponseDto],
  })
  data!: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

export { PaginatedUsersResponseDto as PaginatedUserResponseDto };
