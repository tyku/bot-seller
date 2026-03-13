import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { type OpenRouterMessage } from './llm.service';
import { SystemPromptRepository } from './system-prompt.repository';
import { SystemPromptType } from './schemas/system-prompt.schema';

const CACHE_KEY_PREFIX = 'system_prompts:';
const CACHE_TTL_SECONDS = 10 * 60; // 10 минут

function cacheKey(type: SystemPromptType): string {
  return `${CACHE_KEY_PREFIX}${type}`;
}

/**
 * Централизованный модуль для системных промтов.
 *
 * Системные промпты всех типов кэшируются в Redis при старте и при промахе (TTL 10 мин).
 */
@Injectable()
export class SystemPromptService implements OnModuleInit {
  private readonly logger = new Logger(SystemPromptService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly systemPromptRepository: SystemPromptRepository,
  ) {}

  async onModuleInit() {
    await this.warmUpAllTypes();
  }

  /** При старте загружаем в кэш системные промпты всех типов. */
  private async warmUpAllTypes(): Promise<void> {
    for (const type of Object.values(SystemPromptType)) {
      await this.loadFromDbAndSetCache(type);
    }
  }

  /**
   * Возвращает тексты системных промптов указанного типа: из кэша или из БД с обновлением кэша.
   */
  private async getPromptTextsByType(type: SystemPromptType): Promise<string[]> {
    const key = cacheKey(type);
    try {
      const raw = await this.redis.get(key);
      if (raw !== null && raw !== undefined) {
        const parsed = JSON.parse(raw) as string[];
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      this.logger.warn(
        `System prompts cache read failed [${type}]: ${(e as Error).message}`,
      );
    }
    return this.loadFromDbAndSetCache(type);
  }

  private async loadFromDbAndSetCache(
    type: SystemPromptType,
  ): Promise<string[]> {
    const docs = await this.systemPromptRepository.findByType(type);
    const texts = docs
      .map((p) => p.text?.trim())
      .filter((t): t is string => Boolean(t));
    try {
      await this.redis.set(
        cacheKey(type),
        JSON.stringify(texts),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (e) {
      this.logger.warn(
        `System prompts cache write failed [${type}]: ${(e as Error).message}`,
      );
    }
    return texts;
  }

  /**
   * Системные сообщения с типом prompt (для нормализации пользовательского промпта).
   */
  async getSystemMessagesForPromptType(): Promise<OpenRouterMessage[]> {
    const texts = await this.getPromptTextsByType(SystemPromptType.PROMPT);
    return texts.map((text) => ({ role: 'system' as const, content: text }));
  }

  /**
   * Собирает системные сообщения: все с типом message (из кэша или БД).
   *
   * Параметры для выравнивателя (rawInstruction / тип prompt) пока не используются.
   */
  async buildSystemMessages(options?: {
    rawInstruction?: string;
  }): Promise<OpenRouterMessage[]> {
    const messages: OpenRouterMessage[] = [];
    const texts = await this.getPromptTextsByType(SystemPromptType.MESSAGE);
    for (const text of texts) {
      messages.push({ role: 'system', content: text });
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

