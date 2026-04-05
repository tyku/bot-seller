import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
import { CustomerSettingsService } from '../../customer-settings/customer-settings.service';
import { UserService } from '../../user/user.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { ConversationReplyService } from '../../conversations/conversation-reply.service';
import { ConversationPlatform } from '../../conversations/schemas/conversation.schema';
import { SourceType } from '../../user/schemas/user.schema';
import { LlmRateLimitService } from '../../llm/llm-rate-limit.service';
import { TariffUsageService } from '../../tariff-usage/tariff-usage.service';
import { TELEGRAM_INCOMING_QUEUE } from '../constants';
import type {
  TelegramIncomingJob,
  TelegramUpdate,
} from '../interfaces/telegram-update.interface';
import type { TelegramBotApiResponse } from '../../common/telegram-bot-api.types';

const LIMITS_MESSAGE = 'Лимиты закончились.';

@Processor(TELEGRAM_INCOMING_QUEUE)
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  constructor(
    private readonly settingsRepository: CustomerSettingsRepository,
    private readonly customerSettingsService: CustomerSettingsService,
    private readonly userService: UserService,
    private readonly conversationsService: ConversationsService,
    private readonly conversationReplyService: ConversationReplyService,
    private readonly llmRateLimit: LlmRateLimitService,
    private readonly tariffUsageService: TariffUsageService,
  ) {
    super();
  }

  async process(job: Job<TelegramIncomingJob>): Promise<void> {
    const { botId, customerId, update } = job.data;

    this.logger.log(
      `Processing update ${update.update_id} for bot ${botId} (customer ${customerId})`,
    );

    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (!chatId) {
      this.logger.debug(
        `No chat_id in update ${update.update_id}, skipping reply`,
      );
      return;
    }

    const settings = await this.settingsRepository.findById(botId);
    if (!settings) {
      this.logger.warn(`Bot ${botId} not found in DB, cannot reply`);
      return;
    }

    const customerIdNum = Number(customerId);
    const isStartCommand = /^\/start(\s|@|$)/i.test(
      (update.message?.text ?? update.callback_query?.data ?? '').trim(),
    );
    if (!Number.isNaN(customerIdNum) && isStartCommand) {
      const chatResult = await this.tariffUsageService.tryConsumeChat(
        customerIdNum,
        String(chatId),
      );
      if (!chatResult.allowed) {
        await this.sendReply(
          settings.token,
          chatId,
          LIMITS_MESSAGE,
          botId,
        );
        return;
      }
    }

    await this.ensureUserOnStart(update, chatId, botId);

    const userText =
      update.message?.text ?? update.callback_query?.data ?? '';

    const { systemPrompt, normalizedPromptVersion } =
      await this.customerSettingsService.resolvePromptContext(settings);

    await this.addUserMessageToConversation(chatId, botId, userText, {
      normalizedPromptVersion,
    });

    const messages = await this.conversationsService.getMessages(
      ConversationPlatform.TG,
      String(chatId),
      botId,
    );
    const hasContext = userText.trim() !== '' || messages.length > 0;

    if (hasContext) {
      if (!Number.isNaN(customerIdNum)) {
        const requestResult =
          await this.tariffUsageService.tryConsumeRequest(customerIdNum);
        if (!requestResult.allowed) {
          await this.sendReply(
            settings.token,
            chatId,
            LIMITS_MESSAGE,
            botId,
          );
          return;
        }
      }

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

    const text = await this.conversationReplyService.replyInContext(
      botId,
      ConversationPlatform.TG,
      String(chatId),
      systemPrompt,
    );
    await this.saveAssistantReply(chatId, botId, text);
    await this.sendReply(settings.token, chatId, text, botId);

    if (!Number.isNaN(customerIdNum)) {
      await this.tariffUsageService
        .checkAndSend75Notification(customerIdNum)
        .catch((err) =>
          this.logger.warn(`75% notification check failed: ${err?.message}`),
        );
    }
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
    options?: {
      normalizedPromptVersion?: number;
      questionId?: string;
    },
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
        options,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to add message to conversation: ${err?.message ?? err}`,
      );
    }
  }

  private async saveAssistantReply(
    chatId: number,
    botId: string,
    text: string,
  ): Promise<void> {
    if (!text) {
      return;
    }
    try {
      await this.conversationsService.addAssistantMessage(
        ConversationPlatform.TG,
        String(chatId),
        botId,
        text,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to save assistant reply to conversation: ${err?.message ?? err}`,
      );
    }
  }

  /**
   * Конвертирует Markdown (**bold**, ~~strikethrough~~, *italic*, `code`) в HTML для Telegram.
   * @see https://core.telegram.org/bots/api#html-style
   */
  private markdownToTelegramHtml(text: string): string {
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    out = out
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/__(.+?)__/g, '<b>$1</b>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
      .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
  }

  private async sendReply(
    token: string,
    chatId: number,
    text: string,
    botId: string,
  ): Promise<void> {
    try {
      const html = this.markdownToTelegramHtml(text);
      const { data: result } = await axios.post<TelegramBotApiResponse>(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text: html,
          parse_mode: 'HTML',
        },
        { headers: { 'Content-Type': 'application/json' } },
      );

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
