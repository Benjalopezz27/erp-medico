import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockCategoryDto = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Analgésicos',
    description: 'Medicamentos analgésicos',
    createdAt: new Date('2026-08-21T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('delegates findAll to service', async () => {
    service.findAll.mockResolvedValue([mockCategoryDto]);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([mockCategoryDto]);
  });

  it('delegates findById to service', async () => {
    service.findById.mockResolvedValue(mockCategoryDto);

    const result = await controller.findById(mockCategoryDto.id);

    expect(service.findById).toHaveBeenCalledWith(mockCategoryDto.id);
    expect(result).toEqual(mockCategoryDto);
  });

  it('delegates create to service', async () => {
    service.create.mockResolvedValue(mockCategoryDto);

    const result = await controller.create({
      name: 'Analgésicos',
      description: 'Medicamentos analgésicos',
    });

    expect(service.create).toHaveBeenCalledWith({
      name: 'Analgésicos',
      description: 'Medicamentos analgésicos',
    });
    expect(result).toEqual(mockCategoryDto);
  });

  it('delegates update to service', async () => {
    service.update.mockResolvedValue(mockCategoryDto);

    const result = await controller.update(mockCategoryDto.id, {
      name: 'Analgésicos Modificados',
    });

    expect(service.update).toHaveBeenCalledWith(mockCategoryDto.id, {
      name: 'Analgésicos Modificados',
    });
    expect(result).toEqual(mockCategoryDto);
  });

  it('delegates delete to service', async () => {
    service.delete.mockResolvedValue(undefined);

    await expect(
      controller.delete(mockCategoryDto.id),
    ).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(mockCategoryDto.id);
  });
});
