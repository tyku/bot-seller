import { Injectable } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import {
  ConversationPlatform,
  ConversationMessageType,
  ConversationMessage,
} from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
  ) {}

  async getOrCreate(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ) {
    let conversation = await this.conversationsRepository.findByPlatformChatAndBot(
      platform,
      chatId,
      botId,
    );
    if (!conversation) {
      conversation = await this.conversationsRepository.create(
        platform,
        chatId,
        botId,
      );
    }
    return conversation;
  }

  async addUserMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId);
    return this.conversationsRepository.appendMessage(
      String(conversation._id),
      {
        type: ConversationMessageType.USER,
        content,
      },
    );
  }

  async addSystemMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId);
    return this.conversationsRepository.appendMessage(
      String(conversation._id),
      {
        type: ConversationMessageType.SYSTEM,
        content,
      },
    );
  }

  /** Сообщения диалога для контекста LLM (после добавления последнего сообщения пользователя). */
  async getMessages(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<ConversationMessage[]> {
    const conversation =
      await this.conversationsRepository.findByPlatformChatAndBot(
        platform,
        chatId,
        botId,
      );
    return conversation?.messages ?? [];
  }
}
