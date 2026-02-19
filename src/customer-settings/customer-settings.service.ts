import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CustomerSettingsRepository } from './customer-settings.repository';
import { CreateCustomerSettingsDto, UpdateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import { CustomerSettingsDocument } from './schemas/customer-settings.schema';

@Injectable()
export class CustomerSettingsService {
  private readonly logger = new Logger(CustomerSettingsService.name);

  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
  ) {}

  async create(
    createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<ResponseCustomerSettingsDto> {
    this.logger.log(`Creating customer settings for customer: ${createCustomerSettingsDto.customerId}`);
    
    try {
      const customerSettings = await this.customerSettingsRepository.create(
        createCustomerSettingsDto,
      );
      this.logger.log(`Customer settings created successfully: ${customerSettings._id}`);
      return this.mapToResponseDto(customerSettings);
    } catch (error) {
      this.logger.error(
        `Failed to create customer settings for customer ${createCustomerSettingsDto.customerId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create customer settings');
    }
  }

  async findAll(): Promise<ResponseCustomerSettingsDto[]> {
    this.logger.log('Fetching all customer settings');
    try {
      const customerSettings = await this.customerSettingsRepository.findAll();
      this.logger.log(`Found ${customerSettings.length} customer settings`);
      return customerSettings.map((settings) => this.mapToResponseDto(settings));
    } catch (error) {
      this.logger.error(`Failed to fetch all customer settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<ResponseCustomerSettingsDto> {
    this.logger.log(`Fetching customer settings by ID: ${id}`);
    try {
      const customerSettings = await this.customerSettingsRepository.findById(id);
      if (!customerSettings) {
        this.logger.warn(`Customer settings not found: ${id}`);
        throw new NotFoundException('Customer settings not found');
      }
      this.logger.log(`Customer settings found: ${id}`);
      return this.mapToResponseDto(customerSettings);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch customer settings by ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<ResponseCustomerSettingsDto[]> {
    this.logger.log(`Fetching customer settings for customer: ${customerId}`);
    try {
      const customerSettings =
        await this.customerSettingsRepository.findByCustomerId(customerId);
      this.logger.log(`Found ${customerSettings.length} settings for customer ${customerId}`);
      return customerSettings.map((settings) => this.mapToResponseDto(settings));
    } catch (error) {
      this.logger.error(`Failed to fetch settings for customer ${customerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: UpdateCustomerSettingsDto,
  ): Promise<ResponseCustomerSettingsDto> {
    this.logger.log(`Updating customer settings: ${id}`);
    try {
      const customerSettings = await this.customerSettingsRepository.update(
        id,
        updateData,
      );
      if (!customerSettings) {
        this.logger.warn(`Customer settings not found for update: ${id}`);
        throw new NotFoundException('Customer settings not found');
      }
      this.logger.log(`Customer settings updated successfully: ${id}`);
      return this.mapToResponseDto(customerSettings);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update customer settings ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting customer settings: ${id}`);
    try {
      const customerSettings = await this.customerSettingsRepository.delete(id);
      if (!customerSettings) {
        this.logger.warn(`Customer settings not found for deletion: ${id}`);
        throw new NotFoundException('Customer settings not found');
      }
      this.logger.log(`Customer settings deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete customer settings ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToResponseDto(
    customerSettings: CustomerSettingsDocument,
  ): ResponseCustomerSettingsDto {
    return new ResponseCustomerSettingsDto({
      id: customerSettings._id.toString(),
      customerId: customerSettings.customerId,
      name: customerSettings.name,
      token: customerSettings.token,
      botType: customerSettings.botType,
      status: customerSettings.status,
      prompts: customerSettings.prompts.map((prompt) => ({
        name: prompt.name,
        body: prompt.body,
        type: prompt.type,
      })),
      createdAt: customerSettings.createdAt,
      updatedAt: customerSettings.updatedAt,
    });
  }
}
