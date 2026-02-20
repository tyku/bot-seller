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
import { BotType } from '../customer-settings/schemas/customer-settings.schema';
import { DeduplicationService } from './services/deduplication.service';
import { SubscriptionService } from './services/subscription.service';
import { TELEGRAM_INCOMING_QUEUE } from './constants';
import type { TelegramUpdate, TelegramIncomingJob } from './interfaces/telegram-update.interface';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly botCacheService: BotCacheService,
    private readonly deduplicationService: DeduplicationService,
    private readonly subscriptionService: SubscriptionService,
    @InjectQueue(TELEGRAM_INCOMING_QUEUE) private readonly telegramQueue: Queue,
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

    const isActive = await this.subscriptionService.isSubscriptionActive(
      bot.customerId,
    );
    if (!isActive) {
      this.logger.warn(`Subscription inactive for customer ${bot.customerId}`);
      throw new ForbiddenException('Subscription inactive');
    }

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
}
