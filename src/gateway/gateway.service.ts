import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BotCacheService } from '../customer-settings/services/bot-cache.service';
import {
  BotType,
  BotStatus,
} from '../customer-settings/schemas/customer-settings.schema';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { WebhookSecretService } from '../customer-settings/services/webhook-secret.service';
import { DeduplicationService } from './services/deduplication.service';
import { TELEGRAM_INCOMING_QUEUE, VK_INCOMING_QUEUE } from './constants';
import type { TelegramUpdate, TelegramIncomingJob } from './interfaces/telegram-update.interface';
import type { VkCallbackEvent, VkIncomingJob } from './interfaces/vk-update.interface';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly botCacheService: BotCacheService,
    private readonly deduplicationService: DeduplicationService,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly webhookSecretService: WebhookSecretService,
    @InjectQueue(TELEGRAM_INCOMING_QUEUE) private readonly telegramQueue: Queue,
    @InjectQueue(VK_INCOMING_QUEUE) private readonly vkQueue: Queue,
  ) {}

  async handleTelegramWebhook(
    botId: string,
    secretToken: string | undefined,
    update: TelegramUpdate,
  ): Promise<void> {
    if (!secretToken) {
      throw new ForbiddenException('Missing secret token');
    }

    const bot = await this.botCacheService.get(botId);
    if (!bot) {
      this.logger.warn(`Bot not found or inactive: ${botId}`);
      throw new NotFoundException('Bot not found');
    }

    if (bot.botType !== BotType.TG) {
      throw new BadRequestException('Bot type mismatch');
    }

    if (secretToken !== bot.webhookSecret) {
      this.logger.warn(`Invalid secret token for bot ${botId}`);
      throw new ForbiddenException('Invalid secret token');
    }

    // Проверка подписки и лимитов выполняется в процессоре — чтобы отправить в чат "Лимиты закончились"

    if (!update.update_id) {
      throw new BadRequestException('Invalid update: missing update_id');
    }

    const isDuplicate = await this.deduplicationService.isDuplicate(
      botId,
      update.update_id,
    );
    
    if (isDuplicate) {
      this.logger.debug(`Duplicate update_id ${update.update_id} for bot ${botId}, skipping`);
      return;
    }

    const job: TelegramIncomingJob = {
      botId,
      customerId: bot.customerId,
      botType: bot.botType,
      update,
      receivedAt: Date.now(),
    };

    await this.telegramQueue.add(
      `update:${update.update_id}`,
      job,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );

    this.logger.log(
      `Enqueued update ${update.update_id} for bot ${botId} (customer ${bot.customerId})`,
    );
  }

  /**
   * VK Callback API: подтверждение вебхука или событие (например message_new).
   */
  async handleVkCallback(
    botId: string,
    body: VkCallbackEvent,
  ): Promise<{ kind: 'confirmation'; code: string } | { kind: 'ok' }> {
    const settings = await this.customerSettingsRepository.findById(botId);
    if (
      !settings ||
      settings.status !== BotStatus.ACTIVE ||
      settings.botType !== BotType.VK
    ) {
      this.logger.warn(`VK webhook: bot ${botId} not found or inactive`);
      throw new NotFoundException('Bot not found');
    }

    if (settings.vkCallbackSecret) {
      const expected = this.webhookSecretService.decrypt(
        settings.vkCallbackSecret,
      );
      if (body.secret !== expected) {
        this.logger.warn(`VK webhook: invalid secret for bot ${botId}`);
        throw new ForbiddenException('Invalid callback secret');
      }
    }

    if (body.type === 'confirmation') {
      const code = settings.vkConfirmationCode?.trim();
      if (!code) {
        throw new BadRequestException('VK confirmation code is not configured');
      }
      return { kind: 'confirmation', code };
    }

    if (body.type === 'message_new' && body.object?.message) {
      const msg = body.object.message;
      if (msg.from_id == null) {
        return { kind: 'ok' };
      }

      const updateId =
        body.event_id?.trim() ||
        (msg.id != null
          ? `m:${msg.id}:${msg.from_id}:${msg.date ?? 0}`
          : `e:${body.group_id ?? 0}:${msg.from_id}:${msg.date ?? 0}:${(msg.text ?? '').slice(0, 48)}`);

      const isDup = await this.deduplicationService.isDuplicateVk(
        botId,
        updateId,
      );
      if (isDup) {
        this.logger.debug(`Duplicate VK event ${updateId} for bot ${botId}`);
        return { kind: 'ok' };
      }

      const job: VkIncomingJob = {
        botId,
        customerId: settings.customerId,
        botType: settings.botType,
        updateId,
        update: body,
        receivedAt: Date.now(),
      };

      await this.vkQueue.add(`vk:${updateId}`, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      });

      this.logger.log(`Enqueued VK event ${updateId} for bot ${botId}`);
    }

    return { kind: 'ok' };
  }
}
