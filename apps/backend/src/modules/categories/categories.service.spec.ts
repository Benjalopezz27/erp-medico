import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockCategory: Category = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Analgésicos',
    description: 'Medicamentos analgésicos',
    createdAt: new Date('2026-08-21T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
    normalizeFields: jest.fn(),
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('returns all categories ordered by name', async () => {
      repo.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Analgésicos');
    });
  });

  describe('findById', () => {
    it('returns category when found', async () => {
      repo.findOneBy.mockResolvedValue(mockCategory);

      const result = await service.findById(mockCategory.id);

      expect(result.id).toBe(mockCategory.id);
      expect(result.name).toBe(mockCategory.name);
    });

    it('throws NotFoundException when category does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates category with trimmed normalized name and description', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.create.mockReturnValue(mockCategory);
      repo.save.mockResolvedValue(mockCategory);

      const result = await service.create({
        name: '  Analgésicos  ',
        description: '  Medicamentos analgésicos  ',
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Analgésicos',
        description: 'Medicamentos analgésicos',
      });
      expect(result.name).toBe('Analgésicos');
    });

    it('converts empty description to null on creation', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.create.mockReturnValue({ ...mockCategory, description: null });
      repo.save.mockResolvedValue({ ...mockCategory, description: null });

      const result = await service.create({
        name: 'Antibióticos',
        description: '   ',
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Antibióticos',
        description: null,
      });
      expect(result.description).toBeNull();
    });

    it('throws ConflictException when normalized name already exists (pre-check)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCategory),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.create({ name: 'analgésicos' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when database throws 23505 unique violation', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.create.mockReturnValue(mockCategory);
      repo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create({ name: 'Analgésicos' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are modified', async () => {
      repo.findOneBy.mockResolvedValue(mockCategory);

      await expect(service.update(mockCategory.id, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('clears description when null or empty string is passed', async () => {
      const targetCategory = { ...mockCategory };
      repo.findOneBy.mockResolvedValue(targetCategory);
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.update(mockCategory.id, {
        description: null,
      });

      expect(result.description).toBeNull();
    });

    it('updates name and checks duplicate excluding self', async () => {
      const targetCategory = { ...mockCategory };
      repo.findOneBy.mockResolvedValue(targetCategory);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.update(mockCategory.id, {
        name: 'Analgésicos Generales',
      });

      expect(result.name).toBe('Analgésicos Generales');
    });

    it('throws ConflictException when updating to an existing category name', async () => {
      const targetCategory = { ...mockCategory };
      repo.findOneBy.mockResolvedValue(targetCategory);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValue({ id: 'other-id', name: 'Antibióticos' }),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update(mockCategory.id, { name: 'Antibióticos' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('removes category when it exists', async () => {
      repo.findOneBy.mockResolvedValue(mockCategory);
      repo.remove.mockResolvedValue(mockCategory);

      await expect(service.delete(mockCategory.id)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('throws NotFoundException when deleting non-existent category', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.delete('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when foreign key constraint 23503 is violated', async () => {
      repo.findOneBy.mockResolvedValue(mockCategory);
      repo.remove.mockRejectedValue({ code: '23503' });

      await expect(service.delete(mockCategory.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
