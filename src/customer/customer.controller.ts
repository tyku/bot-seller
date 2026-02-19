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
  Logger,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerSchema } from './dto/create-customer.dto';
import { ResponseCustomerDto } from './dto/response-customer.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { CustomerStatus } from './schemas/customer.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('customers')
export class CustomerController {
  private readonly logger = new Logger(CustomerController.name);

  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateCustomerSchema))
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    this.logger.log('POST /customers - Create customer request received');
    const customer = await this.customerService.create(createCustomerDto);
    this.logger.log('POST /customers - Customer created successfully');
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
    this.logger.log('GET /customers - Find all customers request received');
    const customers = await this.customerService.findAll();
    this.logger.log('GET /customers - Customers retrieved successfully');
    return {
      success: true,
      data: customers,
      message: 'Customers retrieved successfully',
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@CurrentUser() user: CurrentUserData): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    this.logger.log('GET /customers/me - Get current user request received');
    const customer = await this.customerService.findById(user._id);
    this.logger.log('GET /customers/me - Current user retrieved successfully');
    return {
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
    };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateCurrentUser(
    @CurrentUser() user: CurrentUserData,
    @Body() updateData: { name?: string },
  ): Promise<{
    success: boolean;
    data: ResponseCustomerDto;
    message: string;
  }> {
    this.logger.log('PATCH /customers/me - Update current user request received');
    const customer = await this.customerService.updateCustomer(user._id, {
      name: updateData.name,
    });
    this.logger.log('PATCH /customers/me - Current user updated successfully');
    return {
      success: true,
      data: new ResponseCustomerDto({
        id: customer._id.toString(),
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }),
      message: 'Customer updated successfully',
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
    this.logger.log(`PATCH /customers/${id}/status - Update status request received`);
    const customer = await this.customerService.updateStatus(id, status);
    this.logger.log(`PATCH /customers/${id}/status - Status updated successfully`);
    return {
      success: true,
      data: customer,
      message: 'Customer status updated successfully',
    };
  }
}
