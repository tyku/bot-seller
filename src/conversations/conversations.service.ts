import { Injectable } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import {
  ConversationPlatform,
  ConversationMessageType,
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
    return this.conversationsRepository.appendMessage(conversation.id, {
      type: ConversationMessageType.USER,
      content,
    });
  }

  async addSystemMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId);
    return this.conversationsRepository.appendMessage(conversation.id, {
      type: ConversationMessageType.SYSTEM,
      content,
    });
  }
}
