import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { BotType } from '../customer-settings/schemas/customer-settings.schema';
import { DeduplicationService } from './services/deduplication.service';
import { SubscriptionService } from './services/subscription.service';
import { TELEGRAM_INCOMING_QUEUE } from './constants';
import type { TelegramUpdate, TelegramIncomingJob } from './interfaces/telegram-update.interface';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly deduplicationService: DeduplicationService,
    private readonly subscriptionService: SubscriptionService,
    @InjectQueue(TELEGRAM_INCOMING_QUEUE) private readonly telegramQueue: Queue,
  ) {}

  async handleTelegramWebhook(
    botId: string,
    secretToken: string | undefined,
    update: TelegramUpdate,
  ): Promise<void> {
    const settings = await this.customerSettingsRepository.findById(botId);

    if (!settings) {
      this.logger.warn(`Bot not found: ${botId}`);
      throw new NotFoundException('Bot not found');
    }

    if (settings.botType !== BotType.TG) {
      this.logger.warn(`Bot ${botId} is not a Telegram bot`);
      throw new BadRequestException('Bot type mismatch');
    }

    if (!settings.webhookSecret) {
      this.logger.warn(`Bot ${botId} has no webhookSecret configured`);
      throw new ForbiddenException('Webhook not configured');
    }

    if (!secretToken || secretToken !== settings.webhookSecret) {
      this.logger.warn(`Invalid secret token for bot ${botId}`);
      throw new ForbiddenException('Invalid secret token');
    }

    const isActive = await this.subscriptionService.isSubscriptionActive(
      settings.customerId,
    );
    if (!isActive) {
      this.logger.warn(`Subscription inactive for customer ${settings.customerId}`);
      throw new ForbiddenException('Subscription inactive');
    }

    if (!update.update_id) {
      this.logger.warn(`Missing update_id in webhook payload for bot ${botId}`);
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
      customerId: settings.customerId,
      botType: settings.botType,
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
      `Enqueued update ${update.update_id} for bot ${botId} (customer ${settings.customerId})`,
    );
  }
}
