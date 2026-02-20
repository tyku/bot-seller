import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { CustomerSettingsRepository } from '../customer-settings.repository';
import { BotStatus, BotType } from '../schemas/customer-settings.schema';
import { WebhookSecretService } from './webhook-secret.service';

export interface CachedBotData {
  webhookSecret: string;
  customerId: string;
  botType: string;
}

const CACHE_PREFIX = 'bot:wh:';
const CACHE_TTL = 1800; // 30 min

@Injectable()
export class BotCacheService implements OnModuleInit {
  private readonly logger = new Logger(BotCacheService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly repository: CustomerSettingsRepository,
    private readonly secretService: WebhookSecretService,
  ) {}

  async onModuleInit() {
    await this.warmUp();
  }

  async get(botId: string): Promise<CachedBotData | null> {
    const key = `${CACHE_PREFIX}${botId}`;

    try {
      const raw = await this.redis.get(key);
      if (raw) {
        await this.redis.expire(key, CACHE_TTL);
        return JSON.parse(raw);
      }
    } catch (error) {
      this.logger.error(`Cache read failed for ${botId}: ${error.message}`);
    }

    return this.fetchAndCache(botId);
  }

  async set(botId: string, data: CachedBotData): Promise<void> {
    const key = `${CACHE_PREFIX}${botId}`;
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
    } catch (error) {
      this.logger.error(`Cache write failed for ${botId}: ${error.message}`);
    }
  }

  async invalidate(botId: string): Promise<void> {
    const key = `${CACHE_PREFIX}${botId}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache invalidation failed for ${botId}: ${error.message}`);
    }
  }

  private async fetchAndCache(botId: string): Promise<CachedBotData | null> {
    const bot = await this.repository.findById(botId);
    if (!bot || !bot.webhookSecret || bot.status !== BotStatus.ACTIVE) {
      return null;
    }

    const data: CachedBotData = {
      webhookSecret: this.secretService.decrypt(bot.webhookSecret),
      customerId: bot.customerId,
      botType: bot.botType,
    };

    await this.set(botId, data);
    return data;
  }

  private async warmUp(): Promise<void> {
    try {
      const activeBots = await this.repository.findByStatusAndBotType(
        BotStatus.ACTIVE,
        BotType.TG,
      );

      let count = 0;
      for (const bot of activeBots) {
        if (!bot.webhookSecret) continue;

        try {
          await this.set(bot._id.toString(), {
            webhookSecret: this.secretService.decrypt(bot.webhookSecret),
            customerId: bot.customerId,
            botType: bot.botType,
          });
          count++;
        } catch (error) {
          this.logger.error(
            `Failed to cache bot ${bot._id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Cache warmed up with ${count} active Telegram bots`);
    } catch (error) {
      this.logger.error(`Cache warmup failed: ${error.message}`, error.stack);
    }
  }
}
