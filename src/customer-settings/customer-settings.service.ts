import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CustomerSettingsRepository } from './customer-settings.repository';
import {
  CreateCustomerSettingsDto,
  UpdateCustomerSettingsDto,
} from './dto/create-customer-settings.dto';
import { ResponseCustomerSettingsDto } from './dto/response-customer-settings.dto';
import {
  CustomerSettingsDocument,
  BotStatus,
  BotType,
} from './schemas/customer-settings.schema';
import { WebhookSecretService } from './services/webhook-secret.service';
import { BotCacheService } from './services/bot-cache.service';
import { TelegramWebhookService } from './services/telegram-webhook.service';
import { Types } from 'mongoose';
import { TariffUsageService } from '../tariff-usage/tariff-usage.service';
import { LlmService } from '../llm/llm.service';
import { NormalizedPromptRepository } from '../normalized-prompt/normalized-prompt.repository';

@Injectable()
export class CustomerSettingsService {
  private readonly logger = new Logger(CustomerSettingsService.name);

  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly webhookSecretService: WebhookSecretService,
    private readonly botCacheService: BotCacheService,
    private readonly telegramWebhookService: TelegramWebhookService,
    private readonly tariffUsageService: TariffUsageService,
    private readonly llmService: LlmService,
    private readonly normalizedPromptRepository: NormalizedPromptRepository,
  ) {}

  async create(
    createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<ResponseCustomerSettingsDto> {
    this.logger.log(`Creating customer settings for customer: ${createCustomerSettingsDto.customerId}`);

    const customerIdNum = Number(createCustomerSettingsDto.customerId);
    if (!Number.isNaN(customerIdNum)) {
      const botResult =
        await this.tariffUsageService.tryConsumeBot(customerIdNum);
      if (!botResult.allowed) {
        const message =
          botResult.reason === 'subscription_inactive'
            ? 'Нет активной подписки. Оформите тариф для создания бота.'
            : 'Достигнут лимит ботов по тарифу. Увеличьте тариф или купите доп. пакет.';
        throw new BadRequestException(message);
      }
    }

    try {
      let webhookSecret: string | undefined;

      if (createCustomerSettingsDto.botType === BotType.TG) {
        const plainSecret = this.webhookSecretService.generate();
        webhookSecret = this.webhookSecretService.encrypt(plainSecret);
      }

      const normalizedBody = await this.computeNormalizedPrompt(
        createCustomerSettingsDto.prompts ?? [],
      );

      const tokenResolved =
        createCustomerSettingsDto.botType === BotType.VK
          ? (
              createCustomerSettingsDto.vkToken?.trim() ||
              createCustomerSettingsDto.token?.trim() ||
              ''
            )
          : createCustomerSettingsDto.token?.trim() || '';

      let vkCallbackSecretEnc: string | undefined;
      if (createCustomerSettingsDto.vkCallbackSecret?.trim()) {
        vkCallbackSecretEnc = this.webhookSecretService.encrypt(
          createCustomerSettingsDto.vkCallbackSecret.trim(),
        );
      }

      let customerSettings = await this.customerSettingsRepository.create({
        customerId: createCustomerSettingsDto.customerId,
        name: createCustomerSettingsDto.name,
        token: tokenResolved,
        botType: createCustomerSettingsDto.botType,
        prompts: createCustomerSettingsDto.prompts ?? [],
        webhookSecret,
        vkConfirmationCode:
          createCustomerSettingsDto.botType === BotType.VK
            ? createCustomerSettingsDto.vkConfirmationCode?.trim()
            : undefined,
        vkCallbackSecret: vkCallbackSecretEnc,
      });

      if (normalizedBody != null) {
        const np = await this.normalizedPromptRepository.create({
          customerId: createCustomerSettingsDto.customerId,
          customerSettingsId: customerSettings._id.toString(),
          version: 1,
          body: normalizedBody,
        });
        const withPrompt = await this.customerSettingsRepository.update(
          customerSettings._id.toString(),
          { currentNormalizedPromptId: np._id },
        );
        if (withPrompt) {
          customerSettings = withPrompt;
        }
      }

      if (!Number.isNaN(customerIdNum)) {
        await this.tariffUsageService.recordBotCreated(customerIdNum);
      }

      this.logger.log(`Customer settings created successfully: ${customerSettings._id}`);
      return await this.mapToResponseDto(customerSettings);
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
      return Promise.all(
        customerSettings.map((settings) => this.mapToResponseDto(settings)),
      );
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
      return await this.mapToResponseDto(customerSettings);
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
      return Promise.all(
        customerSettings.map((settings) => this.mapToResponseDto(settings)),
      );
    } catch (error) {
      this.logger.error(`Failed to fetch settings for customer ${customerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** Количество ботов без архива (для прослойки при смене тарифа). */
  async getActiveBotsCount(customerId: number): Promise<number> {
    return this.customerSettingsRepository.countNonArchivedByCustomerId(
      String(customerId),
    );
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

    if (updateData.token !== undefined || updateData.vkToken !== undefined) {
      const proposed =
        current.botType === BotType.VK
          ? (updateData.vkToken?.trim() ??
              updateData.token?.trim() ??
              undefined)
          : updateData.token?.trim();
      if (
        proposed !== undefined &&
        proposed !== current.token &&
        current.status === BotStatus.ACTIVE
      ) {
        throw new BadRequestException('Deactivate bot before changing token');
      }
    }

    const isActivating =
      updateData.status === BotStatus.ACTIVE && current.status !== BotStatus.ACTIVE;
    const isDeactivating =
      updateData.status !== undefined &&
      updateData.status !== BotStatus.ACTIVE &&
      current.status === BotStatus.ACTIVE;
    const isReactivating =
      current.status === BotStatus.ARCHIVED &&
      updateData.status !== undefined &&
      updateData.status !== BotStatus.ARCHIVED;

    if (isReactivating) {
      const customerIdNum = Number(current.customerId);
      if (!Number.isNaN(customerIdNum)) {
        const botResult =
          await this.tariffUsageService.tryConsumeBot(customerIdNum);
        if (!botResult.allowed) {
          const message =
            botResult.reason === 'subscription_inactive'
              ? 'Нет активной подписки. Оформите тариф для реактивации бота.'
              : 'Достигнут лимит ботов по тарифу. Увеличьте тариф или архивируйте другой бот.';
          throw new BadRequestException(message);
        }
      }
    }

    if (isActivating && current.botType === BotType.TG) {
      await this.activateTelegramBot(id, current);
    }

    const {
      vkToken,
      vkCallbackSecret: vkCallbackSecretPlain,
      ...updateDataRest
    } = updateData;

    let dataToUpdate: UpdateCustomerSettingsDto & {
      currentNormalizedPromptId?: Types.ObjectId;
      token?: string;
      vkConfirmationCode?: string;
      vkCallbackSecret?: string;
    } = { ...updateDataRest };

    if (current.botType === BotType.VK && vkToken !== undefined) {
      dataToUpdate.token = vkToken.trim();
    }

    if (vkCallbackSecretPlain !== undefined) {
      const trimmed = vkCallbackSecretPlain.trim();
      if (trimmed) {
        dataToUpdate.vkCallbackSecret =
          this.webhookSecretService.encrypt(trimmed);
      }
    }
    if (updateData.prompts !== undefined) {
      const normalizedBody = await this.computeNormalizedPrompt(
        updateData.prompts,
      );
      if (normalizedBody != null) {
        const maxV = await this.normalizedPromptRepository.getMaxVersion(id);
        const np = await this.normalizedPromptRepository.create({
          customerId: current.customerId,
          customerSettingsId: id,
          version: maxV + 1,
          body: normalizedBody,
        });
        dataToUpdate = {
          ...dataToUpdate,
          currentNormalizedPromptId: np._id,
        };
      }
    }

    try {
      const updated = await this.customerSettingsRepository.update(id, dataToUpdate);
      if (!updated) {
        throw new NotFoundException('Customer settings not found');
      }

      if (isDeactivating && current.botType === BotType.TG) {
        await this.deactivateTelegramBot(id, current);
      }

      const isArchiving =
        updateData.status === BotStatus.ARCHIVED &&
        current.status !== BotStatus.ARCHIVED;
      if (isArchiving) {
        const customerIdNum = Number(current.customerId);
        if (!Number.isNaN(customerIdNum)) {
          await this.tariffUsageService.recordBotArchived(customerIdNum);
        }
      }

      if (isReactivating) {
        const customerIdNum = Number(current.customerId);
        if (!Number.isNaN(customerIdNum)) {
          await this.tariffUsageService.recordBotCreated(customerIdNum);
        }
      }

      this.logger.log(`Customer settings updated successfully: ${id}`);
      return await this.mapToResponseDto(updated);
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

      if (customerSettings.status !== BotStatus.ARCHIVED) {
        const customerIdNum = Number(customerSettings.customerId);
        if (!Number.isNaN(customerIdNum)) {
          await this.tariffUsageService.recordBotArchived(customerIdNum);
        }
      }

      await this.normalizedPromptRepository.deleteByCustomerSettingsId(id);
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

  // ─────────────── Normalized prompt ───────────────

  /**
   * Текст для системного промпта LLM и версия нормализованного промпта (привязка диалога к снимку промпта).
   */
  async resolvePromptContext(settings: CustomerSettingsDocument): Promise<{
    systemPrompt: string;
    normalizedPromptVersion?: number;
  }> {
    let normalizedBody: string | undefined;
    let normalizedPromptVersion: number | undefined;
    if (settings.currentNormalizedPromptId) {
      const np = await this.normalizedPromptRepository.findById(
        settings.currentNormalizedPromptId.toString(),
      );
      if (np) {
        normalizedBody = np.body;
        normalizedPromptVersion = np.version;
      }
    }
    const fallback =
      settings.prompts
        ?.map((p) => p.body?.trim())
        .filter((b): b is string => Boolean(b))
        .join('\n\n') ?? '';
    const systemPrompt = (normalizedBody?.trim() || fallback).trim();
    return { systemPrompt, normalizedPromptVersion };
  }

  /**
   * Берёт пользовательский промпт (context), системный с типом prompt, собирает запрос в LLM,
   * возвращает тело для новой версии в коллекции normalized-prompts. Если пользовательского промпта нет — null.
   */
  private async computeNormalizedPrompt(
    prompts: Array<{ body?: string }>,
  ): Promise<string | null> {
    const userPrompt = prompts
      ?.map((p) => p.body?.trim())
      .filter((b): b is string => Boolean(b))
      .join('\n\n');
    if (!userPrompt) {
      return null;
    }
    try {
      return await this.llmService.normalizePrompt(userPrompt);
    } catch (error) {
      this.logger.warn(
        `Failed to compute normalized prompt: ${(error as Error).message}`,
      );
      return null;
    }
  }

  // ─────────────── Mapping ───────────────

  private async mapToResponseDto(
    customerSettings: CustomerSettingsDocument,
  ): Promise<ResponseCustomerSettingsDto> {
    let normalizedPrompt: string | undefined;
    let normalizedPromptVersion: number | undefined;
    if (customerSettings.currentNormalizedPromptId) {
      const np = await this.normalizedPromptRepository.findById(
        customerSettings.currentNormalizedPromptId.toString(),
      );
      if (np) {
        normalizedPrompt = np.body;
        normalizedPromptVersion = np.version;
      }
    }
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
      ...(customerSettings.botType === BotType.VK && {
        vkConfirmationCode: customerSettings.vkConfirmationCode,
        hasVkCallbackSecret: Boolean(customerSettings.vkCallbackSecret),
      }),
      normalizedPrompt,
      normalizedPromptVersion,
      createdAt: customerSettings.createdAt,
      updatedAt: customerSettings.updatedAt,
    });
  }
}
