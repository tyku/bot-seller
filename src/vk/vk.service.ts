import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BotStatus, BotType } from '../customer-settings/schemas/customer-settings.schema';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { VK_INCOMING_QUEUE } from '../gateway/constants';
import type { VkIncomingJob, VkLongPollUpdate } from '../gateway/interfaces/vk-update.interface';
import { callVkApi } from '../common/vk-api';

type VkLongPollServer = {
  key: string;
  server: string;
  ts: string;
};

type WorkerState = {
  running: boolean;
};

@Injectable()
export class VkService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VkService.name);
  private readonly workers = new Map<string, WorkerState>();
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    @InjectQueue(VK_INCOMING_QUEUE) private readonly vkQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncActiveBots();
    this.syncTimer = setInterval(() => {
      this.syncActiveBots().catch((err) =>
        this.logger.error(`VK sync failed: ${err?.message ?? err}`),
      );
    }, 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    for (const state of this.workers.values()) {
      state.running = false;
    }
  }

  private async syncActiveBots(): Promise<void> {
    const activeVkBots = await this.customerSettingsRepository.findByStatusAndBotType(
      BotStatus.ACTIVE,
      BotType.VK,
    );
    const activeIds = new Set(activeVkBots.map((b) => String(b._id)));

    for (const [botId, state] of this.workers.entries()) {
      if (!activeIds.has(botId)) {
        state.running = false;
        this.workers.delete(botId);
        this.logger.log(`Stopped VK long poll for bot ${botId}`);
      }
    }

    for (const bot of activeVkBots) {
      const botId = String(bot._id);
      if (this.workers.has(botId)) {
        continue;
      }
      const state: WorkerState = { running: true };
      this.workers.set(botId, state);
      this.runLongPollLoop(botId, bot.customerId, bot.token, state).catch((err) =>
        this.logger.error(`VK loop crashed for bot ${botId}: ${err?.message ?? err}`),
      );
      this.logger.log(`Started VK long poll for bot ${botId}`);
    }
  }

  private async runLongPollLoop(
    botId: string,
    customerId: string,
    token: string,
    state: WorkerState,
  ): Promise<void> {
    let lp: VkLongPollServer | null = null;
    let backoffMs = 1000;

    while (state.running) {
      try {
        if (!lp) {
          lp = await this.getLongPollServer(token);
        }

        const url = `https://${lp.server}`;
        const response = await fetch(
          `${url}?act=a_check&key=${encodeURIComponent(lp.key)}&ts=${encodeURIComponent(lp.ts)}&wait=25`,
        );
        const data = (await response.json()) as {
          ts?: string;
          updates?: VkLongPollUpdate[];
          failed?: number;
        };

        if (data.failed) {
          if (data.failed === 1 && data.ts) {
            lp.ts = data.ts;
            continue;
          }
          lp = null;
          continue;
        }

        if (data.ts) {
          lp.ts = data.ts;
        }

        const updates = data.updates ?? [];
        for (const update of updates) {
          if (update.type !== 'message_new' || !update.object?.message) {
            continue;
          }

          const message = update.object.message;
          const updateId =
            update.event_id ??
            `${message.peer_id}:${message.id}:${message.date}`;

          const job: VkIncomingJob = {
            botId,
            customerId,
            botType: BotType.VK,
            updateId,
            update,
            receivedAt: Date.now(),
          };

          await this.vkQueue.add(
            `update:${updateId}`,
            job,
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: { age: 3600 },
              removeOnFail: { age: 86400 },
            },
          );
        }

        backoffMs = 1000;
      } catch (error) {
        this.logger.warn(
          `VK poll error for bot ${botId}: ${(error as Error)?.message ?? error}`,
        );
        await this.sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
        lp = null;
      }
    }
  }

  private async getLongPollServer(token: string): Promise<VkLongPollServer> {
    const group = await callVkApi<Array<{ id: number }>>(
      'groups.getById',
      {},
      token,
    );
    const groupId = group[0]?.id;
    if (!groupId) {
      throw new Error('Failed to resolve VK group id');
    }
    const server = await callVkApi<VkLongPollServer>(
      'groups.getLongPollServer',
      { group_id: groupId },
      token,
    );
    if (!server?.key || !server?.server || !server?.ts) {
      throw new Error('Invalid VK long poll server response');
    }
    return server;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

