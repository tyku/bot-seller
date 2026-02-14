import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerStatus } from './schemas/customer.schema';

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: CustomerRepository;

  const mockRepository = {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repository = module.get<CustomerRepository>(CustomerRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    };

    it('should create a customer successfully', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.findByPhone.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        customerId: 1,
        ...createCustomerDto,
        status: CustomerStatus.CREATED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createCustomerDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createCustomerDto.name);
      expect(result.email).toBe(createCustomerDto.email);
      expect(result.customerId).toBe(1);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(createCustomerDto.email);
      expect(mockRepository.findByPhone).toHaveBeenCalledWith(createCustomerDto.phone);
      expect(mockRepository.create).toHaveBeenCalledWith(createCustomerDto);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: createCustomerDto.email,
      });

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createCustomerDto)).rejects.toThrow(
        'Customer with this email already exists',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if phone already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.findByPhone.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        phone: createCustomerDto.phone,
      });

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createCustomerDto)).rejects.toThrow(
        'Customer with this phone already exists',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of customers', async () => {
      const customers = [
        {
          _id: '507f1f77bcf86cd799439011',
          customerId: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          status: CustomerStatus.CREATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAll.mockResolvedValue(customers);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
  });
});
