import { Injectable } from '@nestjs/common';
import { type OpenRouterMessage } from './llm.service';
import { SystemPromptRepository } from './system-prompt.repository';
import { SystemPromptType } from './schemas/system-prompt.schema';

/**
 * Централизованный модуль для системных промтов.
 *
 * Задачи:
 * - системные промпты с типом message из БД применяются ко всем запросам в LLM;
 * - выравнивание пользовательского промпта (тип prompt) — в разработке.
 */
@Injectable()
export class SystemPromptService {
  constructor(
    private readonly systemPromptRepository: SystemPromptRepository,
  ) {}

  /**
   * Собирает системные сообщения: все с типом message из БД.
   *
   * Параметры для выравнивателя (rawInstruction / тип prompt) пока не используются.
   */
  async buildSystemMessages(options?: {
    rawInstruction?: string;
  }): Promise<OpenRouterMessage[]> {
    const messages: OpenRouterMessage[] = [];

    const dbMessagePrompts =
      await this.systemPromptRepository.findByType(SystemPromptType.MESSAGE);
    for (const p of dbMessagePrompts) {
      if (p.text?.trim()) {
        messages.push({
          role: 'system',
          content: p.text.trim(),
        });
      }
    }

    if (options?.rawInstruction?.trim()) {
      // Заглушка для выравнивателя. Здесь потом можно реализовать
      // полноценный парсер/нормализатор пользовательского промпта (тип prompt).
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
  async enrichMessages(
    messages: OpenRouterMessage[],
    options?: { rawInstruction?: string },
  ): Promise<OpenRouterMessage[]> {
    const systemMessages = await this.buildSystemMessages(options);
    if (systemMessages.length === 0) {
      return messages;
    }

    // Гарантируем, что глобальные системные сообщения идут первыми.
    return [...systemMessages, ...messages];
  }
}

