import { Injectable } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { LlmService, type OpenRouterMessage } from '../llm/llm.service';
import {
  ConversationPlatform,
  ConversationMessageType,
} from './schemas/conversation.schema';

const EMPTY_REPLY = 'Чем могу помочь?';

/** Инструкция формата ответа: один JSON, ответ + признак передачи оператору. */
const BOT_REPLY_JSON_INSTRUCTION = `

Ответь ОДНИМ JSON-объектом, без текста вне JSON и без обёртки markdown, строго в формате:
{"answer":"текст ответа пользователю","handoff":false}

Поле handoff: true — если пользователь просит оператора, менеджера, живого человека или нужно передать диалог человеку; иначе false.
При handoff:true в answer дай короткую фразу пользователю (например что передаёшь оператору) или пустую строку "".`;

export type ReplyInContextResult = {
  reply: string;
  handoff: boolean;
};

/**
 * Оркестратор «ответ в контексте диалога»: собирает историю из conversation,
 * приводит к формату LLM, вызывает LlmService.chatWithHandoff().
 */
@Injectable()
export class ConversationReplyService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Собирает сообщения из истории диалога (и опционального системного промпта),
   * отправляет в LLM. Ответ модели — JSON с полями answer и handoff.
   */
  async replyInContext(
    botId: string,
    platform: ConversationPlatform,
    chatId: string,
    systemPrompt?: string,
  ): Promise<ReplyInContextResult> {
    const messages = await this.buildMessagesFromContext(
      botId,
      platform,
      chatId,
      systemPrompt,
    );
    if (messages.length === 0) {
      return { reply: EMPTY_REPLY, handoff: false };
    }
    const result = await this.llmService.chatWithHandoff({ messages });
    const reply =
      result.answer.trim() !== ''
        ? result.answer.trim()
        : result.handoff
          ? ''
          : EMPTY_REPLY;
    return { reply, handoff: result.handoff };
  }

  private async buildMessagesFromContext(
    botId: string,
    platform: ConversationPlatform,
    chatId: string,
    systemPrompt?: string,
  ): Promise<OpenRouterMessage[]> {
    const conversationMessages = await this.conversationsService.getMessages(
      platform,
      chatId,
      botId,
    );

    const openRouterMessages: OpenRouterMessage[] = [];

    const baseSystem = systemPrompt?.trim() ?? '';
    const systemContent = baseSystem
      ? `${baseSystem.trim()}${BOT_REPLY_JSON_INSTRUCTION}`
      : BOT_REPLY_JSON_INSTRUCTION.trim();
    openRouterMessages.push({ role: 'system', content: systemContent });

    for (const m of conversationMessages) {
      const role =
        m.type === ConversationMessageType.SYSTEM
          ? 'system'
          : m.type === ConversationMessageType.ASSISTANT
            ? 'assistant'
            : 'user';
      openRouterMessages.push({ role, content: m.content });
    }

    return openRouterMessages;
  }
}
