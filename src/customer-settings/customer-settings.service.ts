import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CustomerSettingsRepository } from './customer-settings.repository';
import { CreateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import { CustomerSettingsDocument } from './schemas/customer-settings.schema';

@Injectable()
export class CustomerSettingsService {
  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
  ) {}

  async create(
    createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<ResponseCustomerSettingsDto> {
    try {
      const customerSettings = await this.customerSettingsRepository.create(
        createCustomerSettingsDto,
      );
      return this.mapToResponseDto(customerSettings);
    } catch (error) {
      throw new BadRequestException('Failed to create customer settings');
    }
  }

  async findAll(): Promise<ResponseCustomerSettingsDto[]> {
    const customerSettings = await this.customerSettingsRepository.findAll();
    return customerSettings.map((settings) => this.mapToResponseDto(settings));
  }

  async findById(id: string): Promise<ResponseCustomerSettingsDto> {
    const customerSettings = await this.customerSettingsRepository.findById(id);
    if (!customerSettings) {
      throw new NotFoundException('Customer settings not found');
    }
    return this.mapToResponseDto(customerSettings);
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<ResponseCustomerSettingsDto[]> {
    const customerSettings =
      await this.customerSettingsRepository.findByCustomerId(customerId);
    return customerSettings.map((settings) => this.mapToResponseDto(settings));
  }

  async update(
    id: string,
    updateData: Partial<CreateCustomerSettingsDto>,
  ): Promise<ResponseCustomerSettingsDto> {
    const customerSettings = await this.customerSettingsRepository.update(
      id,
      updateData,
    );
    if (!customerSettings) {
      throw new NotFoundException('Customer settings not found');
    }
    return this.mapToResponseDto(customerSettings);
  }

  async delete(id: string): Promise<void> {
    const customerSettings = await this.customerSettingsRepository.delete(id);
    if (!customerSettings) {
      throw new NotFoundException('Customer settings not found');
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
