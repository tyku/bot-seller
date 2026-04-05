import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
import { CustomerSettingsService } from '../../customer-settings/customer-settings.service';
import { UserService } from '../../user/user.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { ConversationReplyService } from '../../conversations/conversation-reply.service';
import { ConversationHandoffService } from '../../conversations/conversation-handoff.service';
import {
  ConversationControlMode,
  ConversationPlatform,
} from '../../conversations/schemas/conversation.schema';
import { CustomerService } from '../../customer/customer.service';
import { SourceType } from '../../user/schemas/user.schema';
import { LlmRateLimitService } from '../../llm/llm-rate-limit.service';
import { TariffUsageService } from '../../tariff-usage/tariff-usage.service';
import { TELEGRAM_INCOMING_QUEUE } from '../constants';
import type {
  TelegramIncomingJob,
  TelegramUpdate,
} from '../interfaces/telegram-update.interface';
import type { TelegramBotApiResponse } from '../../common/telegram-bot-api.types';
import { sendTelegramHtmlMessage } from '../../common/telegram-html-message';
import { HANDOFF_DEFAULT_USER_MESSAGE } from '../../conversations/handoff-messages';

const LIMITS_MESSAGE = 'Лимиты закончились.';

const BACK_TO_BOT_USER_MESSAGE =
  'Диалог с оператором завершён. Снова отвечает бот.';

const OP_END_CALLBACK_PREFIX = 'op:end:';

function buildOperatorEndCallbackData(
  botId: string,
  userChatId: string,
): string {
  return `${OP_END_CALLBACK_PREFIX}${botId}:${userChatId}`;
}

function parseOperatorEndCallback(
  data: string,
): { botId: string; userChatId: string } | null {
  if (!data.startsWith(OP_END_CALLBACK_PREFIX)) {
    return null;
  }
  const rest = data.slice(OP_END_CALLBACK_PREFIX.length);
  const lastColon = rest.lastIndexOf(':');
  if (lastColon <= 0 || lastColon >= rest.length - 1) {
    return null;
  }
  const botId = rest.slice(0, lastColon);
  const userChatId = rest.slice(lastColon + 1);
  if (!botId || !userChatId) {
    return null;
  }
  return { botId, userChatId };
}

@Processor(TELEGRAM_INCOMING_QUEUE)
export class TelegramIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramIncomingProcessor.name);

  constructor(
    private readonly settingsRepository: CustomerSettingsRepository,
    private readonly customerSettingsService: CustomerSettingsService,
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly conversationsService: ConversationsService,
    private readonly conversationReplyService: ConversationReplyService,
    private readonly conversationHandoff: ConversationHandoffService,
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

    const settings = await this.settingsRepository.findById(botId);
    if (!settings) {
      this.logger.warn(`Bot ${botId} not found in DB, cannot reply`);
      return;
    }

    if (update.callback_query?.data?.startsWith(OP_END_CALLBACK_PREFIX)) {
      await this.handleOperatorEndCallback(
        update,
        settings.token,
        botId,
        customerId,
      );
      return;
    }

    const chatId = update.message?.chat?.id;
    if (!chatId) {
      this.logger.debug(
        `No chat_id in update ${update.update_id}, skipping reply`,
      );
      return;
    }

    const customerIdNum = Number(customerId);
    const userText = (update.message?.text ?? '').trim();

    const isStartCommand = /^\/start(\s|@|$)/i.test(userText);
    if (!Number.isNaN(customerIdNum) && isStartCommand) {
      const chatResult = await this.tariffUsageService.tryConsumeChat(
        customerIdNum,
        String(chatId),
      );
      if (!chatResult.allowed) {
        await this.sendReply(settings.token, chatId, LIMITS_MESSAGE, botId);
        return;
      }
    }

    await this.ensureUserOnStart(update, chatId, botId);

    const { systemPrompt, normalizedPromptVersion } =
      await this.customerSettingsService.resolvePromptContext(settings);

    await this.addUserMessageToConversation(chatId, botId, userText, {
      normalizedPromptVersion,
      customerId: !Number.isNaN(customerIdNum) ? customerIdNum : undefined,
    });

    const controlMode = await this.conversationsService.getControlMode(
      ConversationPlatform.TG,
      String(chatId),
      botId,
    );
    if (controlMode === ConversationControlMode.OPERATOR) {
      return;
    }

    const messages = await this.conversationsService.getMessages(
      ConversationPlatform.TG,
      String(chatId),
      botId,
    );

    const cycle = this.conversationHandoff.shouldHandoffForRepeatedUserMessages(
      messages,
    );

    if (cycle) {
      await this.performHandoffToOperator(
        settings.token,
        chatId,
        botId,
        customerIdNum,
      );
      return;
    }

    const hasContext = userText !== '' || messages.length > 0;

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
          rateLimit.message ??
            'Оператор работает над вашим запросом, ожидайте обработки.',
          botId,
        );
        return;
      }
    }

    const { reply: llmReply, handoff: llmHandoff } =
      await this.conversationReplyService.replyInContext(
        botId,
        ConversationPlatform.TG,
        String(chatId),
        systemPrompt,
      );

    if (llmHandoff) {
      await this.performHandoffToOperator(
        settings.token,
        chatId,
        botId,
        customerIdNum,
        llmReply,
      );
      return;
    }

    await this.saveAssistantReply(chatId, botId, llmReply);
    await this.sendReply(settings.token, chatId, llmReply, botId);

    if (!Number.isNaN(customerIdNum)) {
      await this.tariffUsageService
        .checkAndSend75Notification(customerIdNum)
        .catch((err) =>
          this.logger.warn(`75% notification check failed: ${err?.message}`),
        );
    }
  }

  private async handleOperatorEndCallback(
    update: TelegramUpdate,
    token: string,
    expectedBotId: string,
    customerId: string,
  ): Promise<void> {
    const cq = update.callback_query;
    if (!cq?.data || !cq.id || !cq.from) {
      return;
    }

    const parsed = parseOperatorEndCallback(cq.data);
    if (!parsed || parsed.botId !== expectedBotId) {
      await this.answerCallbackQuery(
        token,
        cq.id,
        'Некорректные данные кнопки.',
      );
      return;
    }

    const customerIdNum = Number(customerId);
    if (Number.isNaN(customerIdNum)) {
      await this.answerCallbackQuery(token, cq.id, 'Ошибка клиента.');
      return;
    }

    const customer = await this.customerService.findByCustomerId(
      customerIdNum,
    );
    if (!customer?.telegramId) {
      await this.answerCallbackQuery(
        token,
        cq.id,
        'У аккаунта не привязан Telegram.',
      );
      return;
    }

    if (cq.from.id !== customer.telegramId) {
      await this.answerCallbackQuery(
        token,
        cq.id,
        'Эта кнопка доступна только владельцу бота.',
      );
      return;
    }

    const userChatIdStr = parsed.userChatId;
    const userChatIdNum = Number(userChatIdStr);
    if (Number.isNaN(userChatIdNum)) {
      await this.answerCallbackQuery(token, cq.id, 'Некорректный чат.');
      return;
    }

    try {
      await this.conversationsService.setControlMode(
        ConversationPlatform.TG,
        userChatIdStr,
        expectedBotId,
        ConversationControlMode.BOT,
      );
      await this.conversationsService.addSystemMessage(
        ConversationPlatform.TG,
        userChatIdStr,
        expectedBotId,
        BACK_TO_BOT_USER_MESSAGE,
      );
      await this.sendReply(
        token,
        userChatIdNum,
        BACK_TO_BOT_USER_MESSAGE,
        expectedBotId,
      );
      await this.answerCallbackQuery(token, cq.id, 'Диалог переведён на бота.');
      await this.removeInlineKeyboard(
        token,
        cq.message?.chat.id,
        cq.message?.message_id,
      );
    } catch (err) {
      this.logger.warn(
        `handleOperatorEndCallback failed: ${err?.message ?? err}`,
      );
      await this.answerCallbackQuery(
        token,
        cq.id,
        'Не удалось завершить диалог. Попробуйте снова.',
      );
    }
  }

  private async performHandoffToOperator(
    token: string,
    userChatId: number,
    botId: string,
    customerIdNum: number,
    /** Текст от LLM при handoff из JSON; иначе фиксированная фраза. */
    userFacingMessage?: string,
  ): Promise<void> {
    const userChatIdStr = String(userChatId);
    const trimmed = userFacingMessage?.trim() ?? '';
    const line = trimmed !== '' ? trimmed : HANDOFF_DEFAULT_USER_MESSAGE;

    await this.conversationsService.setControlMode(
      ConversationPlatform.TG,
      userChatIdStr,
      botId,
      ConversationControlMode.OPERATOR,
    );
    await this.conversationsService.addAssistantMessage(
      ConversationPlatform.TG,
      userChatIdStr,
      botId,
      line,
    );
    await this.sendReply(token, userChatId, line, botId);

    const cbData = buildOperatorEndCallbackData(botId, userChatIdStr);
    if (Buffer.byteLength(cbData, 'utf8') > 64) {
      this.logger.error(
        `callback_data exceeds 64 bytes for bot ${botId}, chat ${userChatIdStr}`,
      );
    }

    if (!Number.isNaN(customerIdNum)) {
      const customer = await this.customerService.findByCustomerId(
        customerIdNum,
      );
      if (customer?.telegramId) {
        const notify = `Чат с пользователем перешёл на ручной режим (chat_id: ${userChatIdStr}). Нажмите кнопку, когда можно снова включить ответы бота.`;
        await sendTelegramHtmlMessage(token, customer.telegramId, notify, {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: 'Завершить диалог',
                  callback_data: cbData,
                },
              ],
            ],
          },
        });
      } else {
        this.logger.warn(
          `Handoff: customer ${customerIdNum} has no telegramId — operator button not sent`,
        );
      }
    }
  }

  private async answerCallbackQuery(
    token: string,
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
    try {
      await axios.post<TelegramBotApiResponse>(
        `https://api.telegram.org/bot${token}/answerCallbackQuery`,
        {
          callback_query_id: callbackQueryId,
          text,
        },
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.warn(`answerCallbackQuery failed: ${err?.message ?? err}`);
    }
  }

  private async removeInlineKeyboard(
    token: string,
    chatId: number | undefined,
    messageId: number | undefined,
  ): Promise<void> {
    if (chatId == null || messageId == null) {
      return;
    }
    try {
      await axios.post(
        `https://api.telegram.org/bot${token}/editMessageReplyMarkup`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        },
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.debug(
        `editMessageReplyMarkup failed (ok if message old): ${err?.message ?? err}`,
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
      customerId?: number;
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
        {
          normalizedPromptVersion: options?.normalizedPromptVersion,
          questionId: options?.questionId,
          customerId: options?.customerId,
        },
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

  private async sendReply(
    token: string,
    chatId: number,
    text: string,
    botId: string,
  ): Promise<void> {
    try {
      const result = await sendTelegramHtmlMessage(token, chatId, text);
      if (result.ok) {
        this.logger.log(`Reply sent to chat ${chatId} for bot ${botId}`);
      } else {
        this.logger.error(`sendMessage (html) failed: ${result.description}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`sendMessage network error: ${msg}`);
      throw error;
    }
  }
}
