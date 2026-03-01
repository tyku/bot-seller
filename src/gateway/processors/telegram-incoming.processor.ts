import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
import { UserService } from '../../user/user.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { ConversationPlatform } from '../../conversations/schemas/conversation.schema';
import { SourceType } from '../../user/schemas/user.schema';
import { LlmService } from '../../llm/llm.service';
import { LlmRateLimitService } from '../../llm/llm-rate-limit.service';
import { TELEGRAM_INCOMING_QUEUE } from '../constants';
import type {
  TelegramIncomingJob,
  TelegramUpdate,
} from '../interfaces/telegram-update.interface';

@Processor(TELEGRAM_INCOMING_QUEUE)
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  constructor(
    private readonly settingsRepository: CustomerSettingsRepository,
    private readonly userService: UserService,
    private readonly conversationsService: ConversationsService,
    private readonly llmService: LlmService,
    private readonly llmRateLimit: LlmRateLimitService,
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
      this.logger.debug(
        `No chat_id in update ${update.update_id}, skipping reply`,
      );
      return;
    }

    await this.ensureUserOnStart(update, chatId, botId);

    const settings = await this.settingsRepository.findById(botId);
    if (!settings) {
      this.logger.warn(`Bot ${botId} not found in DB, cannot reply`);
      return;
    }

    const userText =
      update.message?.text ?? update.callback_query?.data ?? '';
    await this.addUserMessageToConversation(chatId, botId, userText);

    const messages = await this.conversationsService.getMessages(
      ConversationPlatform.TG,
      String(chatId),
      botId,
    );
    const hasContext = userText.trim() !== '' || messages.length > 0;

    if (hasContext) {
      const rateLimit = await this.llmRateLimit.checkAndConsume(botId);
      if (!rateLimit.allowed) {
        await this.sendReply(
          settings.token,
          chatId,
          rateLimit.message ?? 'Оператор работает над вашим запросом, ожидайте обработки.',
          botId,
        );
        return;
      }
    }

    const text = await this.llmService.chatWithContext(
      botId,
      ConversationPlatform.TG,
      String(chatId),
    );
    await this.sendReply(settings.token, chatId, text, botId);
  }

  private async ensureUserOnStart(
    update: TelegramUpdate,
    chatId: number,
    botId: string,
  ): Promise<void> {
    const isStartCommand = /^\/start(\s|@|$)/i.test(
      (update.message?.text ?? '').trim(),
    );
    const from = update.message?.from ?? update.callback_query?.from;

    if (!from || !isStartCommand) {
      return;
    }

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
      this.logger.log(
        `User ${from.id} saved/updated after /start for bot ${botId}`,
      );
    } catch (err) {
      this.logger.warn(`Failed to upsert user ${from.id}: ${err.message}`);
    }
  }

  private async addUserMessageToConversation(
    chatId: number,
    botId: string,
    userText: string,
  ): Promise<void> {
    if (!userText) {
      return;
    }

    try {
      await this.conversationsService.addUserMessage(
        ConversationPlatform.TG,
        String(chatId),
        botId,
        userText,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to add message to conversation: ${err?.message ?? err}`,
      );
    }
  }

  private async sendReply(
    token: string,
    chatId: number,
    text: string,
    botId: string,
  ): Promise<void> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
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
