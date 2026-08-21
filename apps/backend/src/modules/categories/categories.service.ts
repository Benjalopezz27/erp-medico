import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { toCategoryResponseDto } from './mappers/category.mapper';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Retrieves all categories sorted alphabetically by name.
   */
  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });
    return categories.map(toCategoryResponseDto);
  }

  /**
   * Retrieves a single category by its UUID.
   */
  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return toCategoryResponseDto(category);
  }

  /**
   * Creates a new category enforcing trimmed normalized uniqueness.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const normalizedName = dto.name.trim();
    const normalizedDescription =
      dto.description !== undefined && dto.description !== null
        ? dto.description.trim() === ''
          ? null
          : dto.description.trim()
        : null;

    // Check duplicate using case-insensitive trimmed query
    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(TRIM(category.name)) = LOWER(:name)', {
        name: normalizedName,
      })
      .getOne();

    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    const category = this.categoryRepository.create({
      name: normalizedName,
      description: normalizedDescription,
    });

    try {
      const saved = await this.categoryRepository.save(category);
      return toCategoryResponseDto(saved);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      throw error;
    }
  }

  /**
   * Updates an existing category with partial modifications.
   */
  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const hasName = dto.name !== undefined;
    const hasDescription = dto.description !== undefined;

    if (!hasName && !hasDescription) {
      throw new BadRequestException(
        'No se detectaron modificaciones en los datos de la categoría',
      );
    }

    if (hasName) {
      const normalizedName = dto.name!.trim();
      if (normalizedName.toLowerCase() !== category.name.trim().toLowerCase()) {
        const existing = await this.categoryRepository
          .createQueryBuilder('category')
          .where('LOWER(TRIM(category.name)) = LOWER(:name)', {
            name: normalizedName,
          })
          .andWhere('category.id != :id', { id })
          .getOne();

        if (existing) {
          throw new ConflictException('Ya existe una categoría con ese nombre');
        }
      }
      category.name = normalizedName;
    }

    if (hasDescription) {
      if (dto.description === null || dto.description.trim() === '') {
        category.description = null;
      } else {
        category.description = dto.description.trim();
      }
    }

    try {
      const saved = await this.categoryRepository.save(category);
      return toCategoryResponseDto(saved);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      throw error;
    }
  }

  /**
   * Deletes a category if not referenced by foreign keys.
   */
  async delete(id: string): Promise<void> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    try {
      await this.categoryRepository.remove(category);
    } catch (error: any) {
      if (error?.code === '23503') {
        throw new ConflictException(
          'No se puede eliminar la categoría porque está asociada a productos existentes',
        );
      }
      throw error;
    }
  }
}
