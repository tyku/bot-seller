import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  LLM_RATE_LIMIT_DEFAULT_PER_BOT_PER_HOUR,
  LLM_RATE_LIMIT_MESSAGE,
} from './constants';

const RATE_LIMIT_KEY_PREFIX = 'llm:ratelimit:';
const WINDOW_TTL_SECONDS = 7200; // 2 hours so key expires after hour boundary

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

@Injectable()
export class LlmRateLimitService {
  private readonly limitPerBotPerHour: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.limitPerBotPerHour =
      this.configService.get<number>('openRouter.rateLimitPerBotPerHour') ??
      LLM_RATE_LIMIT_DEFAULT_PER_BOT_PER_HOUR;
  }

  /**
   * Лимит запросов к LLM на бота в час. В будущем брать из тарифного плана (БД/SubscriptionService).
   */
  getLimitPerBotPerHour(_botId?: string): number {
    return this.limitPerBotPerHour;
  }

  /**
   * Проверяет лимит и увеличивает счётчик. Если лимит превышен — возвращает allowed: false и сообщение для пользователя.
   */
  async checkAndConsume(botId: string): Promise<RateLimitResult> {
    const key = this.buildKey(botId);
    const limit = this.getLimitPerBotPerHour(botId);

    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, WINDOW_TTL_SECONDS);
      }

      if (current > limit) {
        return {
          allowed: false,
          message: LLM_RATE_LIMIT_MESSAGE,
        };
      }
      return { allowed: true };
    } catch (error) {
      // Fail open: при недоступности Redis разрешаем запрос
      return { allowed: true };
    }
  }

  private buildKey(botId: string): string {
    const now = new Date();
    const hour = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + '-' + String(now.getHours()).padStart(2, '0');
    return `${RATE_LIMIT_KEY_PREFIX}${botId}:${hour}`;
  }
}
