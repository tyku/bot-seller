import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
import { UserService } from '../../user/user.service';
import { SourceType } from '../../user/schemas/user.schema';
import { TELEGRAM_INCOMING_QUEUE } from '../constants';
import type { TelegramIncomingJob } from '../interfaces/telegram-update.interface';

const ECHO_REPLIES = [
  'Принял! Скоро тут будет умный ответ.',
  'Сообщение получено, обрабатываю...',
  'Я пока учусь, но уже слышу тебя!',
  'Roger that!',
  '👋 Привет! Я бот-заглушка. Скоро стану умнее.',
];

@Processor(TELEGRAM_INCOMING_QUEUE)
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  constructor(
    private readonly settingsRepository: CustomerSettingsRepository,
    private readonly userService: UserService,
  ) {
    super();
  }

  async process(job: Job<TelegramIncomingJob>): Promise<void> {
    const { botId, customerId, update } = job.data;

    this.logger.log(
      `Processing update ${update.update_id} for bot ${botId} (customer ${customerId})`,
    );

    const chatId = update.message?.chat?.id;
    if (!chatId) {
      this.logger.debug(`No chat_id in update ${update.update_id}, skipping reply`);
      return;
    }

    const isStartCommand = /^\/start(\s|@|$)/i.test(
      (update.message?.text ?? '').trim(),
    );
    const from = update.message?.from ?? update.callback_query?.from;
    if (from && isStartCommand) {
      try {
        await this.userService.upsertByExternalId(
          SourceType.TG,
          String(from.id),
          {
            chatId: String(chatId),
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username ?? undefined,
            languageCode: from.language_code ?? undefined,
          },
        );
        this.logger.log(`User ${from.id} saved/updated after /start for bot ${botId}`);
      } catch (err) {
        this.logger.warn(`Failed to upsert user ${from.id}: ${err.message}`);
      }
    }

    const settings = await this.settingsRepository.findById(botId);
    if (!settings) {
      this.logger.warn(`Bot ${botId} not found in DB, cannot reply`);
      return;
    }

    const reply = ECHO_REPLIES[Math.floor(Math.random() * ECHO_REPLIES.length)];
    const userText = update.message?.text ?? '';
    const text = userText
      ? `${reply}\n\nТы написал: «${userText}»`
      : reply;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${settings.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        },
      );
      const result = await res.json();

      if (!result.ok) {
        this.logger.error(`sendMessage failed: ${result.description}`);
      } else {
        this.logger.log(`Reply sent to chat ${chatId} for bot ${botId}`);
      }
    } catch (error) {
      this.logger.error(`sendMessage network error: ${error.message}`);
      throw error;
    }
  }
}
