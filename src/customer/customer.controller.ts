import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerSchema } from './dto/create-customer.dto';
import { ResponseCustomerDto } from './dto/response-customer.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { CustomerStatus } from './schemas/customer.schema';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateCustomerSchema))
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    const customer = await this.customerService.create(createCustomerDto);
    return {
      success: true,
      data: customer,
      message: 'Customer created successfully',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<{
    success: boolean;
    data: ResponseCustomerDto[];
    message: string;
  }> {
    const customers = await this.customerService.findAll();
    return {
      success: true,
      data: customers,
      message: 'Customers retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    const customer = await this.customerService.findById(id);
    return {
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CustomerStatus,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    const customer = await this.customerService.updateStatus(id, status);
    return {
      success: true,
      data: customer,
      message: 'Customer status updated successfully',
    };
  }
}
