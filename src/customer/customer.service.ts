import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ResponseCustomerDto } from './dto/response-customer.dto';
import { CustomerDocument, CustomerStatus } from './schemas/customer.schema';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<ResponseCustomerDto> {
    this.logger.log(`Creating customer: ${createCustomerDto.email || createCustomerDto.phone}`);
    
    try {
      // Check if email already exists (only if email provided)
      if (createCustomerDto.email) {
        const existingEmail = await this.customerRepository.findByEmail(
          createCustomerDto.email,
        );
        if (existingEmail) {
          this.logger.warn(`Customer with email ${createCustomerDto.email} already exists`);
          throw new ConflictException('Customer with this email already exists');
        }
      }

      // Check if phone already exists (only if phone provided)
      if (createCustomerDto.phone) {
        const existingPhone = await this.customerRepository.findByPhone(
          createCustomerDto.phone,
        );
        if (existingPhone) {
          this.logger.warn(`Customer with phone ${createCustomerDto.phone} already exists`);
          throw new ConflictException('Customer with this phone already exists');
        }
      }

      const customer = await this.customerRepository.create(createCustomerDto);
      this.logger.log(`Customer created successfully: ${customer.customerId}`);
      return this.mapToResponseDto(customer);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 11000) {
        // Duplicate key error
        this.logger.error(`Duplicate key error when creating customer: ${error.message}`, error.stack);
        throw new ConflictException('Customer already exists');
      }
      this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create customer');
    }
  }

  async findAll(): Promise<ResponseCustomerDto[]> {
    this.logger.log('Fetching all customers');
    try {
      const customers = await this.customerRepository.findAll();
      this.logger.log(`Found ${customers.length} customers`);
      return customers.map((customer) => this.mapToResponseDto(customer));
    } catch (error) {
      this.logger.error(`Failed to fetch all customers: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<ResponseCustomerDto> {
    this.logger.log(`Fetching customer by ID: ${id}`);
    try {
      const customer = await this.customerRepository.findById(id);
      if (!customer) {
        this.logger.warn(`Customer not found: ${id}`);
        throw new BadRequestException('Customer not found');
      }
      this.logger.log(`Customer found: ${customer.customerId}`);
      return this.mapToResponseDto(customer);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to fetch customer by ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStatus(id: string, status: CustomerStatus): Promise<ResponseCustomerDto> {
    this.logger.log(`Updating customer status: ${id} to ${status}`);
    try {
      const customer = await this.customerRepository.updateStatus(id, status);
      if (!customer) {
        this.logger.warn(`Customer not found for status update: ${id}`);
        throw new BadRequestException('Customer not found');
      }
      this.logger.log(`Customer status updated successfully: ${customer.customerId} to ${status}`);
      return this.mapToResponseDto(customer);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update customer status ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<CustomerDocument | null> {
    if (!email) return null;
    return this.customerRepository.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    if (!phone) return null;
    return this.customerRepository.findByPhone(phone);
  }

  async updateCustomer(id: string, updateData: any): Promise<CustomerDocument> {
    this.logger.log(`Updating customer: ${id}`);
    try {
      const customer = await this.customerRepository.update(id, updateData);
      if (!customer) {
        this.logger.warn(`Customer not found for update: ${id}`);
        throw new BadRequestException('Customer not found');
      }
      this.logger.log(`Customer updated successfully: ${customer.customerId}`);
      return customer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update customer ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByTelegramId(telegramId: number): Promise<CustomerDocument | null> {
    return this.customerRepository.findByTelegramId(telegramId);
  }

  private mapToResponseDto(customer: CustomerDocument): ResponseCustomerDto {
    return new ResponseCustomerDto({
      id: customer._id.toString(),
      customerId: customer.customerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }
}
