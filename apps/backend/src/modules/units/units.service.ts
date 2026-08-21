import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { toUnitResponseDto } from './mappers/unit.mapper';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  /**
   * Retrieves all units sorted alphabetically by name.
   */
  async findAll(): Promise<UnitResponseDto[]> {
    const units = await this.unitRepository.find({
      order: { name: 'ASC' },
    });
    return units.map(toUnitResponseDto);
  }

  /**
   * Retrieves a single unit by its UUID.
   */
  async findById(id: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidad de medida no encontrada');
    }
    return toUnitResponseDto(unit);
  }

  /**
   * Creates a new unit enforcing trimmed normalized uniqueness on both name and symbol.
   */
  async create(dto: CreateUnitDto): Promise<UnitResponseDto> {
    const normalizedName = dto.name.trim();
    const normalizedSymbol = dto.symbol.trim();

    // Check duplicate name
    const existingName = await this.unitRepository
      .createQueryBuilder('unit')
      .where('LOWER(TRIM(unit.name)) = LOWER(:name)', { name: normalizedName })
      .getOne();

    if (existingName) {
      throw new ConflictException(
        'Ya existe una unidad de medida con ese nombre',
      );
    }

    // Check duplicate symbol
    const existingSymbol = await this.unitRepository
      .createQueryBuilder('unit')
      .where('LOWER(TRIM(unit.symbol)) = LOWER(:symbol)', {
        symbol: normalizedSymbol,
      })
      .getOne();

    if (existingSymbol) {
      throw new ConflictException(
        'Ya existe una unidad de medida con ese símbolo',
      );
    }

    const unit = this.unitRepository.create({
      name: normalizedName,
      symbol: normalizedSymbol,
    });

    try {
      const saved = await this.unitRepository.save(unit);
      return toUnitResponseDto(saved);
    } catch (error: any) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  /**
   * Updates an existing unit with partial modifications.
   */
  async update(id: string, dto: UpdateUnitDto): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidad de medida no encontrada');
    }

    const hasName = dto.name !== undefined;
    const hasSymbol = dto.symbol !== undefined;

    if (!hasName && !hasSymbol) {
      throw new BadRequestException(
        'No se detectaron modificaciones en los datos de la unidad de medida',
      );
    }

    if (hasName) {
      const normalizedName = dto.name!.trim();
      if (normalizedName.toLowerCase() !== unit.name.trim().toLowerCase()) {
        const existingName = await this.unitRepository
          .createQueryBuilder('unit')
          .where('LOWER(TRIM(unit.name)) = LOWER(:name)', {
            name: normalizedName,
          })
          .andWhere('unit.id != :id', { id })
          .getOne();

        if (existingName) {
          throw new ConflictException(
            'Ya existe una unidad de medida con ese nombre',
          );
        }
      }
      unit.name = normalizedName;
    }

    if (hasSymbol) {
      const normalizedSymbol = dto.symbol!.trim();
      if (normalizedSymbol.toLowerCase() !== unit.symbol.trim().toLowerCase()) {
        const existingSymbol = await this.unitRepository
          .createQueryBuilder('unit')
          .where('LOWER(TRIM(unit.symbol)) = LOWER(:symbol)', {
            symbol: normalizedSymbol,
          })
          .andWhere('unit.id != :id', { id })
          .getOne();

        if (existingSymbol) {
          throw new ConflictException(
            'Ya existe una unidad de medida con ese símbolo',
          );
        }
      }
      unit.symbol = normalizedSymbol;
    }

    try {
      const saved = await this.unitRepository.save(unit);
      return toUnitResponseDto(saved);
    } catch (error: any) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  /**
   * Deletes a unit if not referenced by foreign keys.
   */
  async delete(id: string): Promise<void> {
    const unit = await this.unitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidad de medida no encontrada');
    }

    try {
      await this.unitRepository.remove(unit);
    } catch (error: any) {
      if (error?.code === '23503') {
        throw new ConflictException(
          'No se puede eliminar la unidad de medida porque está asociada a productos existentes',
        );
      }
      throw error;
    }
  }

  /**
   * Inspects database unique violation error and throws specific ConflictException.
   */
  private handleUniqueViolation(error: any): void {
    if (error?.code === '23505') {
      const constraint = (
        error?.driverError?.constraint ||
        error?.detail ||
        ''
      ).toLowerCase();
      if (constraint.includes('symbol') || constraint.includes('simbolo')) {
        throw new ConflictException(
          'Ya existe una unidad de medida con ese símbolo',
        );
      }
      throw new ConflictException(
        'Ya existe una unidad de medida con ese nombre',
      );
    }
  }
}
