import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UsePipes,
  Query,
} from '@nestjs/common';
import { CustomerSettingsService } from './customer-settings.service';
import type { CreateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { CreateCustomerSettingsSchema } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';

@Controller('customer-settings')
export class CustomerSettingsController {
  constructor(
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateCustomerSettingsSchema))
  async create(@Body() createCustomerSettingsDto: CreateCustomerSettingsDto): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    const customerSettings = await this.customerSettingsService.create(
      createCustomerSettingsDto,
    );
    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings created successfully',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('customerId') customerId?: string,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto[];
    message: string;
  }> {
    const customerSettings = customerId
      ? await this.customerSettingsService.findByCustomerId(customerId)
      : await this.customerSettingsService.findAll();
    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    const customerSettings = await this.customerSettingsService.findById(id);
    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCustomerSettingsDto>,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    const customerSettings = await this.customerSettingsService.update(
      id,
      updateData,
    );
    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.customerSettingsService.delete(id);
    return {
      success: true,
      message: 'Customer settings deleted successfully',
    };
  }
}
