import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { ConversationsService } from '../conversations/conversations.service';
import {
  ConversationPlatform,
  ConversationMessageType,
} from '../conversations/schemas/conversation.schema';
import { PromptType } from '../customer-settings/schemas/customer-settings.schema';
import { LLM_MODELS, type LlmModelId } from './constants';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  messages: OpenRouterMessage[];
  model?: LlmModelId;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly conversationsService: ConversationsService,
  ) {
    this.apiKey = this.configService.get<string>('openRouter.apiKey');
    this.defaultModel =
      this.configService.get<string>('openRouter.defaultModel') ??
      LLM_MODELS.DEFAULT;
  }

  /**
   * Берёт промпт из настроек кастомера (botId), контекст из conversations,
   * собирает сообщения и возвращает ответ LLM.
   */
  async chatWithContext(
    botId: string,
    platform: ConversationPlatform,
    chatId: string,
  ): Promise<string> {
    const messages = await this.buildMessagesFromContext(botId, platform, chatId);
    if (messages.length === 0) {
      return 'Чем могу помочь?';
    }
    return this.chat({ messages });
  }

  /**
   * Собирает массив сообщений для LLM: системный промпт из настроек бота + история диалога.
   */
  private async buildMessagesFromContext(
    botId: string,
    platform: ConversationPlatform,
    chatId: string,
  ): Promise<OpenRouterMessage[]> {
    const settings = await this.customerSettingsRepository.findById(botId);
    const contextPrompt = settings?.prompts?.find((p) => p.type === PromptType.CONTEXT);
    const conversationMessages = await this.conversationsService.getMessages(
      platform,
      chatId,
      botId,
    );

    const openRouterMessages: OpenRouterMessage[] = [];

    if (contextPrompt?.body) {
      openRouterMessages.push({ role: 'system', content: contextPrompt.body });
    }

    for (const m of conversationMessages) {
      openRouterMessages.push({
        role: m.type === ConversationMessageType.SYSTEM ? 'system' : 'user',
        content: m.content,
      });
    }

    return openRouterMessages;
  }

  /**
   * Отправка запроса в OpenRouter (chat completions).
   * Если API key не задан, возвращает заглушку.
   */
  async chat(options: LlmChatOptions): Promise<string> {
    const { messages, model = this.defaultModel as LlmModelId } = options;

    if (!this.apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set, returning stub reply');
      return 'Принял! Скоро тут будет умный ответ. (LLM не настроен.)';
    }

    try {
      const payload = {
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      };
      this.logger.debug(
        `OpenRouter request: model=${payload.model}, messages=${JSON.stringify(payload.messages)}`,
      );

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.configService.get<string>('gateway.baseUrl') ?? '',
          'X-OpenRouter-Title': 'bot-seller',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`OpenRouter error ${response.status}: ${text}`);
        return 'Извините, не удалось обработать запрос. Попробуйте позже.';
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      return content ?? 'Нет ответа от модели.';
    } catch (error) {
      this.logger.error(`OpenRouter request failed: ${(error as Error).message}`);
      return 'Извините, произошла ошибка при обработке. Попробуйте позже.';
    }
  }
}
