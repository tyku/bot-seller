import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

@Injectable()
export class DemoRateLimitService {
  private readonly logger = new Logger(DemoRateLimitService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Лимит по IP: ключ redis, windowSeconds, maxHits.
   * Возвращает true если запрос разрешён.
   */
  async consume(
    key: string,
    windowSeconds: number,
    maxHits: number,
  ): Promise<void> {
    const fullKey = `demo:rl:${key}`;
    const n = await this.redis.incr(fullKey);
    if (n === 1) {
      await this.redis.expire(fullKey, windowSeconds);
    }
    if (n > maxHits) {
      this.logger.warn(`Demo rate limit exceeded: ${fullKey}`);
      throw new HttpException(
        'Too many requests, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  getCreateLimitPerMinute(): number {
    return (
      this.configService.get<number>('demo.rateLimit.createPerMinute') ?? 30
    );
  }

  getReadWriteLimitPerMinute(): number {
    return (
      this.configService.get<number>('demo.rateLimit.readWritePerMinute') ?? 120
    );
  }
}
