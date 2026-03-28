/**
 * Минимальная форма ответа Telegram Bot API (setWebhook, deleteWebhook, sendMessage и др.).
 * @see https://core.telegram.org/bots/api#making-requests
 */
export interface TelegramBotApiResponse {
  ok: boolean;
  description?: string;
}
