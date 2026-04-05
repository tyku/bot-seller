import { Injectable } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import {
  ConversationPlatform,
  ConversationType,
  ConversationMessageType,
  ConversationMessage,
  ConversationControlMode,
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
    type?: ConversationType,
    options?: { normalizedPromptVersion?: number },
  ) {
    const resolvedType =
      type ?? (platform === ConversationPlatform.TEST ? ConversationType.TEST : ConversationType.DEFAULT);
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
        resolvedType,
        options?.normalizedPromptVersion,
      );
    }
    return conversation;
  }

  async addUserMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
    options?: {
      questionId?: string;
      normalizedPromptVersion?: number;
    },
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId, undefined, {
      normalizedPromptVersion: options?.normalizedPromptVersion,
    });
    return this.conversationsRepository.appendMessage(
      String(conversation._id),
      {
        type: ConversationMessageType.USER,
        content,
        questionId: options?.questionId,
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

  async addAssistantMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId);
    return this.conversationsRepository.appendMessage(
      String(conversation._id),
      {
        type: ConversationMessageType.ASSISTANT,
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
    const thread = await this.getThread(platform, chatId, botId);
    return thread?.messages ?? [];
  }

  /** История + версия промпта, зафиксированная при создании диалога. */
  async getThread(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<{
    messages: ConversationMessage[];
    normalizedPromptVersion?: number;
  } | null> {
    const conversation =
      await this.conversationsRepository.findByPlatformChatAndBot(
        platform,
        chatId,
        botId,
      );
    if (!conversation) {
      return null;
    }
    return {
      messages: conversation.messages ?? [],
      normalizedPromptVersion: conversation.normalizedPromptVersion,
    };
  }

  /** Текущий режим ведения диалога; для старых документов без поля — бот. */
  async getControlMode(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<ConversationControlMode> {
    const conversation =
      await this.conversationsRepository.findByPlatformChatAndBot(
        platform,
        chatId,
        botId,
      );
    return (
      conversation?.controlMode ?? ConversationControlMode.BOT
    );
  }

  async setControlMode(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    controlMode: ConversationControlMode,
  ): Promise<void> {
    await this.conversationsRepository.setControlMode(
      platform,
      chatId,
      botId,
      controlMode,
    );
  }
}
