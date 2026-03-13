import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type OpenRouterMessage } from './llm.service';

/**
 * Централизованный модуль для системных промтов.
 *
 * Задачи:
 * - единое место, где задаётся глобальный системный промт (форматирование, стиль ответа, ретраи и т.п.);
 * - выравнивание пользовательского промпта (превращение "сырых" инструкций
 *   в более структурированный системный контекст);
 * - применение этого контекста ко всем запросам в LLM.
 */
@Injectable()
export class SystemPromptService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Базовый глобальный системный промт.
   *
   * Его текст можно задавать:
   * - через ENV (`OPENROUTER_SYSTEM_PROMPT`);
   * - через конфигурацию Nest (ключ `openRouter.systemPrompt`);
   * - либо позже вынести в БД.
   */
  getBaseSystemPrompt(): string | null {
    const fromConfig = this.configService.get<string>('openRouter.systemPrompt');
    return fromConfig?.trim() ? fromConfig.trim() : null;
  }

  /**
   * Параметры для выравнивателя пользовательского промпта.
   *
   * `rawInstruction` — "сырая" инструкция вида
   *   "представь что ты сотрудник отдела продаж, тебе нужно спросить фио, возраст, место работы"
   *
   * В будущем здесь можно разобрать, что является:
   * - ролью / персонажем;
   * - перечнем вопросов к пользователю;
   * - требованиями к формату ответа и т.п.
   */
  buildSystemMessages(options?: { rawInstruction?: string }): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [];

    const base = this.getBaseSystemPrompt();
    if (base) {
      messages.push({
        role: 'system',
        content: base,
      });
    }

    if (options?.rawInstruction?.trim()) {
      // Заглушка для выравнивателя. Здесь потом можно реализовать
      // полноценный парсер/нормализатор пользовательского промпта.
      messages.push({
        role: 'system',
        content: options.rawInstruction.trim(),
      });
    }

    return messages;
  }

  /**
   * Обогащает массив сообщений глобальными системными промтами.
   *
   * Используется LlmService перед каждым запросом к провайдеру.
   */
  enrichMessages(
    messages: OpenRouterMessage[],
    options?: { rawInstruction?: string },
  ): OpenRouterMessage[] {
    const systemMessages = this.buildSystemMessages(options);
    if (systemMessages.length === 0) {
      return messages;
    }

    // Гарантируем, что глобальные системные сообщения идут первыми.
    return [...systemMessages, ...messages];
  }
}

