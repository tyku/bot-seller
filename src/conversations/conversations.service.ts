import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { BotType } from '../customer-settings/schemas/customer-settings.schema';
import { sendTelegramHtmlMessage } from '../common/telegram-html-message';
import {
  ConversationPlatform,
  ConversationType,
  ConversationMessageType,
  ConversationMessage,
  ConversationControlMode,
} from './schemas/conversation.schema';
import type { ConversationDocument } from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
  ) {}

  async getOrCreate(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    type?: ConversationType,
    options?: { normalizedPromptVersion?: number; customerId?: number },
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
        options?.customerId,
      );
    } else if (
      options?.customerId != null &&
      conversation.customerId == null
    ) {
      const updated = await this.conversationsRepository.setCustomerIdIfMissing(
        String(conversation._id),
        options.customerId,
      );
      if (updated) {
        conversation = updated;
      }
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
      customerId?: number;
    },
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId, undefined, {
      normalizedPromptVersion: options?.normalizedPromptVersion,
      customerId: options?.customerId,
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

  async addOperatorMessage(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    content: string,
  ) {
    const conversation = await this.getOrCreate(platform, chatId, botId);
    return this.conversationsRepository.appendMessage(
      String(conversation._id),
      {
        type: ConversationMessageType.OPERATOR,
        content,
      },
    );
  }

  /** Список диалогов для inbox (без демо и без platform=test). */
  async listInboxForCustomer(
    customerId: number,
    options: { platform?: ConversationPlatform; page: number; limit: number },
  ): Promise<{ items: ConversationDocument[]; total: number }> {
    const { platform, page, limit } = options;
    const skip = page * limit;
    const settings = await this.customerSettingsRepository.findByCustomerId(
      String(customerId),
    );
    const ownedBotIds = settings.map((s) => String(s._id));
    const [items, total] = await Promise.all([
      this.conversationsRepository.findInboxPage(customerId, {
        platform,
        skip,
        limit,
        ownedBotIds,
      }),
      this.conversationsRepository.countInbox(customerId, platform, ownedBotIds),
    ]);
    return { items, total };
  }

  async findConversationByIdForCustomer(
    id: string,
    customerId: number,
  ): Promise<ConversationDocument | null> {
    const doc = await this.conversationsRepository.findById(id);
    if (!doc) {
      return null;
    }
    if (doc.botId?.startsWith('demo:')) {
      return null;
    }
    if (doc.platform === ConversationPlatform.TEST) {
      return null;
    }
    if (doc.customerId != null && doc.customerId !== customerId) {
      return null;
    }
    if (doc.customerId == null) {
      const settings = await this.customerSettingsRepository.findById(doc.botId);
      const settingsCustomerId = settings?.customerId
        ? Number(settings.customerId)
        : NaN;
      if (
        Number.isNaN(settingsCustomerId) ||
        settingsCustomerId !== customerId
      ) {
        return null;
      }
      await this.conversationsRepository.setCustomerIdIfMissing(
        String(doc._id),
        customerId,
      );
      doc.customerId = customerId;
    }
    return doc;
  }

  /**
   * Сохраняет сообщение оператора и доставляет его в канал (Telegram).
   * VK — пока только запись в истории без отправки в мессенджер.
   */
  async sendOperatorMessageFromInbox(
    conversationId: string,
    customerId: number,
    content: string,
  ): Promise<ConversationDocument> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Пустое сообщение');
    }

    const doc = await this.findConversationByIdForCustomer(
      conversationId,
      customerId,
    );
    if (!doc) {
      throw new NotFoundException('Диалог не найден');
    }

    const settings = await this.customerSettingsRepository.findById(doc.botId);
    if (!settings) {
      throw new NotFoundException('Настройки бота не найдены');
    }

    if (settings.customerId !== String(customerId)) {
      throw new NotFoundException('Диалог не найден');
    }

    if (doc.platform === ConversationPlatform.TG) {
      if (settings.botType !== BotType.TG) {
        throw new BadRequestException('Тип бота не совпадает с каналом Telegram');
      }
      const chatIdNum = Number(doc.chatId);
      if (Number.isNaN(chatIdNum)) {
        throw new BadRequestException('Некорректный chat_id для Telegram');
      }
      const result = await sendTelegramHtmlMessage(
        settings.token,
        chatIdNum,
        trimmed,
      );
      if (!result.ok) {
        throw new BadRequestException(
          result.description ?? 'Не удалось отправить в Telegram',
        );
      }
    } else if (doc.platform === ConversationPlatform.VK) {
      // История в БД; доставка в VK API — отдельная задача.
    } else {
      throw new BadRequestException('Канал не поддерживает отправку из inbox');
    }

    const updated = await this.addOperatorMessage(
      doc.platform,
      doc.chatId,
      doc.botId,
      trimmed,
    );
    if (!updated) {
      throw new BadRequestException('Не удалось сохранить сообщение');
    }
    return updated;
  }
}
