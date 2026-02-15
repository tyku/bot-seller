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
  ForbiddenException,
} from '@nestjs/common';
import { CustomerSettingsService } from './customer-settings.service';
import type { CreateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { CreateCustomerSettingsSchema } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('customer-settings')
export class CustomerSettingsController {
  constructor(
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateCustomerSettingsSchema))
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    // Ensure user can only create settings for themselves
    if (createCustomerSettingsDto.customerId !== user.customerId.toString()) {
      throw new ForbiddenException('You can only create settings for your own account');
    }

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
    @CurrentUser() user: CurrentUserData,
    @Query('customerId') customerId?: string,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto[];
    message: string;
  }> {
    // Users can only view their own settings
    const targetCustomerId = customerId || user.customerId.toString();
    
    if (targetCustomerId !== user.customerId.toString()) {
      throw new ForbiddenException('You can only view your own settings');
    }

    const customerSettings = await this.customerSettingsService.findByCustomerId(targetCustomerId);
    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    const customerSettings = await this.customerSettingsService.findById(id);
    
    // Ensure user owns this setting
    if (customerSettings.customerId !== user.customerId.toString()) {
      throw new ForbiddenException('You can only view your own settings');
    }

    return {
      success: true,
      data: customerSettings,
      message: 'Customer settings retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCustomerSettingsDto>,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    // Check ownership before update
    const existing = await this.customerSettingsService.findById(id);
    if (existing.customerId !== user.customerId.toString()) {
      throw new ForbiddenException('You can only update your own settings');
    }

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
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Check ownership before delete
    const existing = await this.customerSettingsService.findById(id);
    if (existing.customerId !== user.customerId.toString()) {
      throw new ForbiddenException('You can only delete your own settings');
    }

    await this.customerSettingsService.delete(id);
    return {
      success: true,
      message: 'Customer settings deleted successfully',
    };
  }
}
