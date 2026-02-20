import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CustomerSettingsRepository } from './customer-settings.repository';
import { CreateCustomerSettingsDto, UpdateCustomerSettingsDto } from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import {
  CustomerSettingsDocument,
  BotStatus,
  BotType,
} from './schemas/customer-settings.schema';
import { WebhookSecretService } from './services/webhook-secret.service';
import { BotCacheService } from './services/bot-cache.service';
import { TelegramWebhookService } from './services/telegram-webhook.service';

@Injectable()
export class CustomerSettingsService {
  private readonly logger = new Logger(CustomerSettingsService.name);

  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly webhookSecretService: WebhookSecretService,
    private readonly botCacheService: BotCacheService,
    private readonly telegramWebhookService: TelegramWebhookService,
  ) {}

  async create(
    createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<ResponseCustomerSettingsDto> {
    this.logger.log(`Creating customer settings for customer: ${createCustomerSettingsDto.customerId}`);

    try {
      let webhookSecret: string | undefined;

      if (createCustomerSettingsDto.botType === BotType.TG) {
        const plainSecret = this.webhookSecretService.generate();
        webhookSecret = this.webhookSecretService.encrypt(plainSecret);
      }

      const customerSettings = await this.customerSettingsRepository.create({
        ...createCustomerSettingsDto,
        webhookSecret,
      });

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

    const current = await this.customerSettingsRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Customer settings not found');
    }

    if (updateData.token && updateData.token !== current.token && current.status === BotStatus.ACTIVE) {
      throw new BadRequestException('Deactivate bot before changing token');
    }

    const isActivating =
      updateData.status === BotStatus.ACTIVE && current.status !== BotStatus.ACTIVE;
    const isDeactivating =
      updateData.status !== undefined &&
      updateData.status !== BotStatus.ACTIVE &&
      current.status === BotStatus.ACTIVE;

    if (isActivating && current.botType === BotType.TG) {
      await this.activateTelegramBot(id, current);
    }

    try {
      const updated = await this.customerSettingsRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundException('Customer settings not found');
      }

      if (isDeactivating && current.botType === BotType.TG) {
        await this.deactivateTelegramBot(id, current);
      }

      this.logger.log(`Customer settings updated successfully: ${id}`);
      return this.mapToResponseDto(updated);
    } catch (error) {
      if (isActivating && current.botType === BotType.TG) {
        await this.deactivateTelegramBot(id, current).catch((e) =>
          this.logger.error(`Cleanup after failed update: ${e.message}`),
        );
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update customer settings ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting customer settings: ${id}`);
    try {
      const customerSettings = await this.customerSettingsRepository.findById(id);
      if (!customerSettings) {
        this.logger.warn(`Customer settings not found for deletion: ${id}`);
        throw new NotFoundException('Customer settings not found');
      }

      if (customerSettings.status === BotStatus.ACTIVE && customerSettings.botType === BotType.TG) {
        await this.deactivateTelegramBot(id, customerSettings);
      }

      await this.customerSettingsRepository.delete(id);
      this.logger.log(`Customer settings deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete customer settings ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ─────────────── Telegram Bot Lifecycle ───────────────

  private async activateTelegramBot(
    botId: string,
    settings: CustomerSettingsDocument,
  ): Promise<void> {
    if (!settings.webhookSecret) {
      throw new BadRequestException('Webhook secret not configured for this bot');
    }

    const decryptedSecret = this.webhookSecretService.decrypt(settings.webhookSecret);

    await this.telegramWebhookService.registerWebhook(
      settings.token,
      botId,
      decryptedSecret,
    );

    await this.botCacheService.set(botId, {
      webhookSecret: decryptedSecret,
      customerId: settings.customerId,
      botType: settings.botType,
    });

    this.logger.log(`Telegram bot ${botId} activated: webhook registered, cache populated`);
  }

  private async deactivateTelegramBot(
    botId: string,
    settings: CustomerSettingsDocument,
  ): Promise<void> {
    await this.telegramWebhookService
      .deleteWebhook(settings.token)
      .catch((e) =>
        this.logger.error(`Failed to delete webhook for bot ${botId}: ${e.message}`),
      );

    await this.botCacheService
      .invalidate(botId)
      .catch((e) =>
        this.logger.error(`Failed to invalidate cache for bot ${botId}: ${e.message}`),
      );

    this.logger.log(`Telegram bot ${botId} deactivated: webhook deleted, cache invalidated`);
  }

  // ─────────────── Mapping ───────────────

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
