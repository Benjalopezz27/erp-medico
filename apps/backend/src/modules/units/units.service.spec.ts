import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { Unit } from './entities/unit.entity';

describe('UnitsService', () => {
  let service: UnitsService;
  let repo: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockUnit: Unit = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Unidad',
    symbol: 'u',
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
        UnitsService,
        {
          provide: getRepositoryToken(Unit),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  describe('findAll', () => {
    it('returns all units ordered by name', async () => {
      repo.find.mockResolvedValue([mockUnit]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Unidad');
    });
  });

  describe('findById', () => {
    it('returns unit when found', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit);

      const result = await service.findById(mockUnit.id);

      expect(result.id).toBe(mockUnit.id);
      expect(result.symbol).toBe(mockUnit.symbol);
    });

    it('throws NotFoundException when unit does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates unit with trimmed name and symbol', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.create.mockReturnValue(mockUnit);
      repo.save.mockResolvedValue(mockUnit);

      const result = await service.create({
        name: '  Unidad  ',
        symbol: '  u  ',
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Unidad',
        symbol: 'u',
      });
      expect(result.symbol).toBe('u');
    });

    it('throws ConflictException when name is duplicated (pre-check)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockUnit),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create({ name: 'unidad', symbol: 'x' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when symbol is duplicated (pre-check)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(null) // name is unique
          .mockResolvedValueOnce(mockUnit), // symbol exists
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create({ name: 'Nueva Unidad', symbol: 'U' }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles PostgreSQL 23505 distinguishing name vs symbol error', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.create.mockReturnValue(mockUnit);

      // Symbol violation
      repo.save.mockRejectedValueOnce({
        code: '23505',
        driverError: { constraint: 'UQ_units_symbol_normalized' },
      });
      await expect(
        service.create({ name: 'Unidad Extra', symbol: 'u' }),
      ).rejects.toThrow('Ya existe una unidad de medida con ese símbolo');

      // Name violation
      repo.save.mockRejectedValueOnce({
        code: '23505',
        driverError: { constraint: 'UQ_units_name_normalized' },
      });
      await expect(
        service.create({ name: 'Unidad', symbol: 'ue' }),
      ).rejects.toThrow('Ya existe una unidad de medida con ese nombre');
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are modified', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit);

      await expect(service.update(mockUnit.id, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates name and symbol excluding self from conflict check', async () => {
      const targetUnit = { ...mockUnit };
      repo.findOneBy.mockResolvedValue(targetUnit);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.update(mockUnit.id, {
        name: 'Caja',
        symbol: 'cj',
      });

      expect(result.name).toBe('Caja');
      expect(result.symbol).toBe('cj');
    });
  });

  describe('delete', () => {
    it('removes unit when it exists', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit);
      repo.remove.mockResolvedValue(mockUnit);

      await expect(service.delete(mockUnit.id)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockUnit);
    });

    it('throws NotFoundException when deleting non-existent unit', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.delete('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when foreign key constraint 23503 is violated', async () => {
      repo.findOneBy.mockResolvedValue(mockUnit);
      repo.remove.mockRejectedValue({ code: '23503' });

      await expect(service.delete(mockUnit.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
