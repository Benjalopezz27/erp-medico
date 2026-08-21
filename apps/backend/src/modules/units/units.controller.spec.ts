import { Test, TestingModule } from '@nestjs/testing';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

describe('UnitsController', () => {
  let controller: UnitsController;
  let service: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUnitDto = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Unidad',
    symbol: 'u',
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
      controllers: [UnitsController],
      providers: [
        {
          provide: UnitsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UnitsController>(UnitsController);
  });

  it('delegates findAll to service', async () => {
    service.findAll.mockResolvedValue([mockUnitDto]);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([mockUnitDto]);
  });

  it('delegates findById to service', async () => {
    service.findById.mockResolvedValue(mockUnitDto);

    const result = await controller.findById(mockUnitDto.id);

    expect(service.findById).toHaveBeenCalledWith(mockUnitDto.id);
    expect(result).toEqual(mockUnitDto);
  });

  it('delegates create to service', async () => {
    service.create.mockResolvedValue(mockUnitDto);

    const result = await controller.create({
      name: 'Unidad',
      symbol: 'u',
    });

    expect(service.create).toHaveBeenCalledWith({
      name: 'Unidad',
      symbol: 'u',
    });
    expect(result).toEqual(mockUnitDto);
  });

  it('delegates update to service', async () => {
    service.update.mockResolvedValue(mockUnitDto);

    const result = await controller.update(mockUnitDto.id, {
      name: 'Unidad Modificada',
      symbol: 'um',
    });

    expect(service.update).toHaveBeenCalledWith(mockUnitDto.id, {
      name: 'Unidad Modificada',
      symbol: 'um',
    });
    expect(result).toEqual(mockUnitDto);
  });

  it('delegates delete to service', async () => {
    service.delete.mockResolvedValue(undefined);

    await expect(controller.delete(mockUnitDto.id)).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(mockUnitDto.id);
  });
});
