import { Injectable } from '@nestjs/common';
import {
  ConversationMessage,
  ConversationMessageType,
} from './schemas/conversation.schema';

/** Сколько подряд ответов пользователя на один и тот же вопрос (questionId) = цикл. */
export const USER_MESSAGE_REPEAT_LIMIT = 3;

@Injectable()
export class ConversationHandoffService {
  /**
   * Основной признак цикла: последние N пользовательских сообщений с **одним и тем же**
   * непустым `questionId` (N ответов «на тот же вопрос» — сценарий застрял).
   * Если у кого-то из N нет `questionId` (например Telegram без разметки) — запасной
   * вариант: те же N последних реплик совпадают по тексту после нормализации.
   */
  shouldHandoffForRepeatedUserMessages(
    messages: ConversationMessage[],
    limit: number = USER_MESSAGE_REPEAT_LIMIT,
  ): boolean {
    const userMsgs = messages.filter(
      (m) => m.type === ConversationMessageType.USER,
    );
    if (userMsgs.length < limit) {
      return false;
    }
    const slice = userMsgs.slice(-limit);
    const questionIds = slice.map((m) =>
      this.normalizeQuestionId(m.questionId),
    );
    const allHaveQuestionId = questionIds.every((q) => q !== undefined);

    if (allHaveQuestionId) {
      const q0 = questionIds[0]!;
      return questionIds.every((q) => q === q0);
    }

    const texts = slice.map((m) => this.normalizeForCycle(m.content));
    const firstText = texts[0];
    return !!firstText && texts.every((t) => t === firstText);
  }

  private normalizeForCycle(content: string): string {
    return content.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeQuestionId(questionId?: string): string | undefined {
    const t = questionId?.trim();
    return t && t.length > 0 ? t : undefined;
  }
}
