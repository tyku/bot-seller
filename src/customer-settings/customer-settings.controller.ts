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
  Query,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CustomerSettingsService } from './customer-settings.service';
import type { CreateCustomerSettingsDto, UpdateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { CreateCustomerSettingsSchema, UpdateCustomerSettingsSchema } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('customer-settings')
export class CustomerSettingsController {
  private readonly logger = new Logger(CustomerSettingsController.name);

  constructor(
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(CreateCustomerSettingsSchema)) createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    this.logger.log('POST /customer-settings - Create settings request received');
    
    // Ensure user can only create settings for themselves
    if (createCustomerSettingsDto.customerId !== user.customerId.toString()) {
      this.logger.warn(`Forbidden: User ${user.customerId} tried to create settings for ${createCustomerSettingsDto.customerId}`);
      throw new ForbiddenException('You can only create settings for your own account');
    }

    const customerSettings = await this.customerSettingsService.create(
      createCustomerSettingsDto,
    );
    this.logger.log('POST /customer-settings - Settings created successfully');
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
    this.logger.log('GET /customer-settings - Find all settings request received');
    
    // Users can only view their own settings
    const targetCustomerId = customerId || user.customerId.toString();
    
    if (targetCustomerId !== user.customerId.toString()) {
      this.logger.warn(`Forbidden: User ${user.customerId} tried to view settings for ${targetCustomerId}`);
      throw new ForbiddenException('You can only view your own settings');
    }

    const customerSettings = await this.customerSettingsService.findByCustomerId(targetCustomerId);
    this.logger.log('GET /customer-settings - Settings retrieved successfully');
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
    @Body(new ZodValidationPipe(UpdateCustomerSettingsSchema)) updateData: UpdateCustomerSettingsDto,
  ): Promise<{
    success: boolean;
    data: ResponseCustomerSettingsDto;
    message: string;
  }> {
    this.logger.log(`PATCH /customer-settings/${id} - Update settings request received`);
    
    // Check ownership before update
    const existing = await this.customerSettingsService.findById(id);
    if (existing.customerId !== user.customerId.toString()) {
      this.logger.warn(`Forbidden: User ${user.customerId} tried to update settings ${id} owned by ${existing.customerId}`);
      throw new ForbiddenException('You can only update your own settings');
    }

    const customerSettings = await this.customerSettingsService.update(
      id,
      updateData,
    );
    this.logger.log(`PATCH /customer-settings/${id} - Settings updated successfully`);
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
    this.logger.log(`DELETE /customer-settings/${id} - Delete settings request received`);
    
    // Check ownership before delete
    const existing = await this.customerSettingsService.findById(id);
    if (existing.customerId !== user.customerId.toString()) {
      this.logger.warn(`Forbidden: User ${user.customerId} tried to delete settings ${id} owned by ${existing.customerId}`);
      throw new ForbiddenException('You can only delete your own settings');
    }

    await this.customerSettingsService.delete(id);
    this.logger.log(`DELETE /customer-settings/${id} - Settings deleted successfully`);
    return {
      success: true,
      message: 'Customer settings deleted successfully',
    };
  }
}
