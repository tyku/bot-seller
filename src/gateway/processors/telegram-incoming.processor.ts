import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TELEGRAM_INCOMING_QUEUE } from '../constants';
import type { TelegramIncomingJob } from '../interfaces/telegram-update.interface';

@Processor(TELEGRAM_INCOMING_QUEUE)
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  async process(job: Job<TelegramIncomingJob>): Promise<void> {
    const { botId, customerId, update } = job.data;

    this.logger.log(
      `Processing update ${update.update_id} for bot ${botId} (customer ${customerId})`,
    );

    // TODO: здесь будет роутинг к бизнес-логике:
    //  - определить тип update (message, callback_query, ...)
    //  - достать промпты бота из customer-settings
    //  - отправить в LLM / обработать команду
    //  - сформировать и отправить ответ через Telegram API

    if (update.message?.text) {
      this.logger.debug(
        `chat=${update.message.chat.id} text="${update.message.text}"`,
      );
    }

    this.logger.log(`Update ${update.update_id} processed (stub)`);
  }
}
