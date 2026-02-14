import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ResponseCustomerDto } from './dto/response-customer.dto';
import { CustomerDocument, CustomerStatus } from './schemas/customer.schema';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<ResponseCustomerDto> {
    // Check if email already exists
    const existingEmail = await this.customerRepository.findByEmail(
      createCustomerDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Customer with this email already exists');
    }

    // Check if phone already exists
    const existingPhone = await this.customerRepository.findByPhone(
      createCustomerDto.phone,
    );
    if (existingPhone) {
      throw new ConflictException('Customer with this phone already exists');
    }

    try {
      const customer = await this.customerRepository.create(createCustomerDto);
      return this.mapToResponseDto(customer);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        throw new ConflictException('Customer already exists');
      }
      throw new BadRequestException('Failed to create customer');
    }
  }

  async findAll(): Promise<ResponseCustomerDto[]> {
    const customers = await this.customerRepository.findAll();
    return customers.map((customer) => this.mapToResponseDto(customer));
  }

  async findById(id: string): Promise<ResponseCustomerDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    return this.mapToResponseDto(customer);
  }

  async updateStatus(id: string, status: CustomerStatus): Promise<ResponseCustomerDto> {
    const customer = await this.customerRepository.updateStatus(id, status);
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    return this.mapToResponseDto(customer);
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
