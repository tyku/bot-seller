import { Injectable } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { LlmService, type OpenRouterMessage } from '../llm/llm.service';
import {
  ConversationPlatform,
  ConversationMessageType,
} from './schemas/conversation.schema';

const EMPTY_REPLY = 'Чем могу помочь?';

/**
 * Оркестратор «ответ в контексте диалога»: собирает историю из conversation,
 * приводит к формату LLM, вызывает LlmService.chat().
 * Вся работа с контекстом диалога живёт здесь; LlmService не знает о conversations.
 */
@Injectable()
export class ConversationReplyService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Собирает сообщения из истории диалога (и опционального системного промпта),
   * отправляет в LLM, возвращает ответ.
   */
  async replyInContext(
    botId: string,
    platform: ConversationPlatform,
    chatId: string,
    systemPrompt?: string,
  ): Promise<string> {
    const messages = await this.buildMessagesFromContext(
      botId,
      platform,
      chatId,
      systemPrompt,
    );
    if (messages.length === 0) {
      return EMPTY_REPLY;
    }
    return this.llmService.chat({ messages });
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

    if (systemPrompt?.trim()) {
      openRouterMessages.push({ role: 'system', content: systemPrompt.trim() });
    }

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
