import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { DEDUP_KEY_PREFIX, DEDUP_TTL_SECONDS } from '../constants';

@Injectable()
export class DeduplicationService implements OnModuleDestroy {
  private readonly logger = new Logger(DeduplicationService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Returns true if this update_id was already seen (duplicate).
   * Uses Redis SET NX with TTL for atomic check-and-set.
   */
  async isDuplicate(botId: string, updateId: number): Promise<boolean> {
    const key = `${DEDUP_KEY_PREFIX}${botId}:${updateId}`;

    try {
      const result = await this.redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
      // NX returns null if key already exists (duplicate), 'OK' if set successfully (new)
      return result === null;
    } catch (error) {
      this.logger.error(
        `Redis dedup check failed for ${key}: ${error.message}`,
        error.stack,
      );
      // Fail open: if Redis is down, let the message through
      return false;
    }
  }
}
