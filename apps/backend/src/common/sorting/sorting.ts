import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortOrder } from '@erp/shared-types';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Query mixin: `class QueryXDto extends SortableQuery(['name', 'createdAt'] as const) {...}`.
 * Both params are optional; without them the endpoint keeps its default order.
 */
export function SortableQuery<const TField extends string>(
  fields: readonly TField[],
) {
  class SortableQueryDto {
    @ApiPropertyOptional({ enum: fields as unknown as string[] })
    @IsOptional()
    @IsIn(fields as unknown as string[])
    sortBy?: TField;

    @ApiPropertyOptional({ enum: ['ASC', 'DESC', 'asc', 'desc'] })
    @IsOptional()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    sortOrder?: SortOrder | 'asc' | 'desc';
  }
  return SortableQueryDto;
}

export interface ResolvedSort {
  column: string;
  direction: SortOrder;
}

/**
 * Maps a whitelisted `sortBy` key to its SQL column/expression.
 * Returns null when no sort was requested so callers keep their default ORDER BY.
 */
export function resolveSort<TField extends string>(
  columns: Record<TField, string>,
  sortBy: TField | undefined,
  sortOrder: string | undefined,
): ResolvedSort | null {
  if (!sortBy || !Object.prototype.hasOwnProperty.call(columns, sortBy))
    return null;
  return {
    column: columns[sortBy],
    direction: sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
  };
}
