import { Unit } from '../entities/unit.entity';
import { UnitResponseDto } from '../dto/unit-response.dto';

export function toUnitResponseDto(unit: Unit): UnitResponseDto {
  return {
    id: unit.id,
    name: unit.name,
    symbol: unit.symbol,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}
