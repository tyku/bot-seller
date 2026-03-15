import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type LlmModelId } from './constants';
import { SystemPromptService } from './system-prompt.service';
import { sanitizeText } from '../common/pii-sanitizer';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  messages: OpenRouterMessage[];
  model?: LlmModelId;
  /** Не обогащать сообщения глобальными системными промптами (для нормализации промпта) */
  skipEnrich?: boolean;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly systemPromptService: SystemPromptService,
  ) {
    this.apiKey = this.configService.get<string>('openRouter.apiKey');

    const model = this.configService.get<string>('openRouter.defaultModel');
    
    if (!model) {
      throw new Error('OPENROUTER_DEFAULT_MODEL is not set');
    }

    this.defaultModel = model;
  }

  /**
   * Нормализует пользовательский промпт: системные промпты с типом prompt + пользовательский текст,
   * запрос в модель, возврат ответа (для сохранения в normalizedPrompt).
   */
  async normalizePrompt(userPrompt: string): Promise<string> {
    const systemMessages =
      await this.systemPromptService.getSystemMessagesForPromptType();
    const messages: OpenRouterMessage[] = [
      ...systemMessages,
      { role: 'user', content: userPrompt.trim() },
    ];
    return this.chat({ messages, skipEnrich: true });
  }

  /**
   * Отправка запроса в OpenRouter (chat completions).
   * Если API key не задан, возвращает заглушку.
   */
  async chat(options: LlmChatOptions): Promise<string> {
    const {
      messages,
      model = this.defaultModel as LlmModelId,
      skipEnrich = false,
    } = options;

    // Перед отправкой в LLM очищаем содержимое сообщений от PII.
    const sanitizedMessages = messages.map((m) => ({
      ...m,
      content: sanitizeText(m.content),
    }));

    // Применяем глобальные системные промты (из .env + type=message из БД), если не отключено.
    const enrichedMessages = skipEnrich
      ? sanitizedMessages
      : await this.systemPromptService.enrichMessages(sanitizedMessages);

    if (!this.apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set, returning stub reply');
      return 'Принял! Скоро тут будет умный ответ. (LLM не настроен.)';
    }

    try {
      const payload = {
        model,
        messages: enrichedMessages.map((m) => ({
          role: m.role,
            content: m.content,
        })),
        stream: false,
      };
      this.logger.log(
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
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (raw == null) return 'Нет ответа от модели.';

      // Системный промпт требует формат { answer: string } — достаём answer.
      try {
        const parsed = JSON.parse(raw) as { answer?: unknown };
        if (parsed != null && typeof parsed.answer === 'string' && parsed.answer.trim()) {
          return parsed.answer.trim();
        }
      } catch {
        // Не JSON или нет поля answer — отдаём как есть
      }
      return raw;
    } catch (error) {
      this.logger.error(`OpenRouter request failed: ${(error as Error).message}`);
      return 'Извините, произошла ошибка при обработке. Попробуйте позже.';
    }
  }
}
