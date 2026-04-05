/**
 * Ожидаемый формат ответа бота (один JSON без markdown).
 * handoff=true — передать диалог оператору; answer — текст пользователю (может быть пустым при handoff).
 */
export type BotAssistantPayload = {
  answer: string;
  handoff: boolean;
};

/**
 * Разбор ответа модели в формате {"answer":"...","handoff":boolean} или произвольного текста.
 */
export function parseBotAssistantJson(raw: string): BotAssistantPayload {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { answer: '', handoff: false };
  }
  let s = trimmed;
  if (s.startsWith('```')) {
    s = s
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }
  try {
    const o = JSON.parse(s) as { answer?: unknown; handoff?: unknown };
    const handoff = o.handoff === true;
    const answer =
      typeof o.answer === 'string' ? o.answer.trim() : '';
    return { answer, handoff };
  } catch {
    return { answer: trimmed, handoff: false };
  }
}
