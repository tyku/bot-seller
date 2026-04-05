import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

/** FIFO очередь «нужен оператор»: ZSET, score = время постановки (мс), TTL записи 1 ч. */
const QUEUE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class OperatorInboxQueueService {
  private readonly logger = new Logger(OperatorInboxQueueService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private key(customerId: number): string {
    return `inbox:operator:${customerId}`;
  }

  /**
   * Удаляет устаревшие записи (старше TTL), возвращает id диалогов по FIFO:
   * от более старой постановки к более новой.
   */
  async cleanupAndGetOrderedConversationIds(
    customerId: number,
  ): Promise<string[]> {
    try {
      const k = this.key(customerId);
      const minValidScore = Date.now() - QUEUE_TTL_MS;
      await this.redis.zremrangebyscore(k, '-inf', minValidScore);
      return this.redis.zrange(k, 0, -1);
    } catch (err) {
      this.logger.warn(
        `operator inbox queue read failed: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Поставить в очередь (FIFO: время первой постановки сохраняется).
   */
  async enqueueIfMissing(
    customerId: number,
    conversationId: string,
  ): Promise<void> {
    try {
      const k = this.key(customerId);
      const exists = await this.redis.zscore(k, conversationId);
      if (exists !== null) {
        return;
      }
      await this.redis.zadd(k, Date.now(), conversationId);
    } catch (err) {
      this.logger.warn(
        `operator inbox queue enqueue failed: ${(err as Error).message}`,
      );
    }
  }

  async remove(customerId: number, conversationId: string): Promise<void> {
    try {
      await this.redis.zrem(this.key(customerId), conversationId);
    } catch (err) {
      this.logger.warn(
        `operator inbox queue remove failed: ${(err as Error).message}`,
      );
    }
  }
}
