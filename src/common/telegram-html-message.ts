import axios, { isAxiosError } from 'axios';
import type { TelegramBotApiResponse } from './telegram-bot-api.types';

/**
 * Markdown (**bold**, ~~strike~~, *italic*, `code`) → HTML для Telegram.
 * @see https://core.telegram.org/bots/api#html-style
 */
export function markdownToTelegramHtml(text: string): string {
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

export type TelegramInlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

export async function sendTelegramHtmlMessage(
  token: string,
  chatId: number,
  text: string,
  options?: { replyMarkup?: TelegramInlineKeyboard },
): Promise<{ ok: boolean; description?: string }> {
  const html = markdownToTelegramHtml(text);
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  try {
    const { data: result } = await axios.post<TelegramBotApiResponse>(
      `https://api.telegram.org/bot${token}/sendMessage`,
      body,
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status < 500,
      },
    );
    if (!result.ok) {
      return { ok: false, description: result.description };
    }
    return { ok: true };
  } catch (err) {
    if (isAxiosError(err) && err.response?.data) {
      const data = err.response.data as Partial<TelegramBotApiResponse>;
      if (typeof data.description === 'string') {
        return { ok: false, description: data.description };
      }
    }
    throw err;
  }
}
