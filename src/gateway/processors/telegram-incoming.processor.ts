import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
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
