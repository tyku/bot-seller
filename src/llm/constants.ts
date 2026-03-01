/**
 * OpenRouter model identifiers.
 * Модели могут часто меняться — при необходимости вынести в коллекцию БД (напр. llm_models).
 * @see https://openrouter.ai/docs/models
 */
export const LLM_MODELS = {
  /** Модель по умолчанию для чата */
  DEFAULT: 'openai/gpt-4o-mini',
  /** Альтернативы при смене провайдера/модели */
  // OPENAI_GPT4O: 'openai/gpt-4o',
  // ANTHROPIC_CLAUDE: 'anthropic/claude-3.5-sonnet',
} as const;

export type LlmModelId = (typeof LLM_MODELS)[keyof typeof LLM_MODELS];

/** Лимит запросов к LLM на бота в час (по тарифу; по умолчанию) */
export const LLM_RATE_LIMIT_DEFAULT_PER_BOT_PER_HOUR = 2000;

/** Сообщение пользователю при превышении лимита запросов к LLM */
export const LLM_RATE_LIMIT_MESSAGE =
  'Оператор работает над вашим запросом, ожидайте обработки.';
