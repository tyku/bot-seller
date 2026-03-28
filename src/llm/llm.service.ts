import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { text } from 'node:stream/consumers';
import type { Readable } from 'node:stream';
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
   * По описанию бизнеса формирует черновик промпта: что и в каком порядке спрашивать у посетителя.
   */
  async generatePromptFromBusinessDescription(
    businessDescription: string,
  ): Promise<string> {
    const system =
      'Ты настраиваешь сценарий чат-бота для бизнеса. По описанию бизнеса пользователя напиши ОДИН сплошной текст промпта для бота-ассистента: какие вопросы задавать посетителю, в каком порядке, и с какой целью (квалификация лида, сбор контактов, консультация и т.д.). Пиши по-русски, конкретно, без вступлений от себя и без «Здравствуйте, я ИИ». Если чего-то не хватает в описании — разумно додумай типичное для такой ниши.';
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Описание бизнеса:\n\n${businessDescription.trim()}`,
      },
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

    let requestStartedAt: number | undefined;
    try {
      const payload = {
        model,
        messages: enrichedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      };
      this.logger.log(
        `OpenRouter request: model=${payload.model}, messages=${JSON.stringify(payload.messages)}`,
      );

      requestStartedAt = performance.now();

      this.logger.log(`OpenRouter request started at ${Date.now()}ms (model=${model})`);


      const response = await axios.post<Readable>(
        OPENROUTER_URL,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              this.configService.get<string>('gateway.baseUrl') ?? '',
            'X-OpenRouter-Title': 'bot-seller',
          },
          responseType: 'stream',
          validateStatus: () => true,
        },
      );

      if (response.status >= 400) {
        const errBody = await text(response.data);
        const elapsedMs = Math.round(performance.now() - requestStartedAt);
        this.logger.error(
          `OpenRouter error ${response.status}: ${errBody} (${elapsedMs}ms)`,
        );
        return 'Извините, не удалось обработать запрос. Попробуйте позже.';
      }

      const raw = (await this.readOpenRouterStream(response.data)).trim();
      const elapsedMs = Math.round(performance.now() - requestStartedAt);
      this.logger.log(`OpenRouter request finished in ${elapsedMs}ms (model=${model})`);
      if (!raw) return 'Нет ответа от модели.';

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
      const suffix =
        requestStartedAt != null
          ? ` after ${Math.round(performance.now() - requestStartedAt)}ms`
          : '';
      this.logger.error(
        `OpenRouter request failed${suffix}: ${(error as Error).message}`,
      );
      return 'Извините, произошла ошибка при обработке. Попробуйте позже.';
    }
  }

  private async readOpenRouterStream(stream: Readable): Promise<string> {
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let result = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(
        typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
        { stream: true },
      );
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) continue;

        const payload = trimmedLine.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (typeof token === 'string') {
            result += token;
          }
        } catch {
          // Ignore malformed chunks and continue stream parsing.
        }
      }
    }

    const tail = buffer.trim();
    if (tail.startsWith('data:')) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (typeof token === 'string') {
            result += token;
          }
        } catch {
          // Ignore malformed tail chunk.
        }
      }
    }

    return result;
  }
}
