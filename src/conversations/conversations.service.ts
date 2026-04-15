import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { BotType } from '../customer-settings/schemas/customer-settings.schema';
import { sendTelegramHtmlMessage } from '../common/telegram-html-message';
import { VkService } from '../vk/vk.service';
import {
  ConversationPlatform,
  ConversationType,
  ConversationMessageType,
  ConversationMessage,
  ConversationControlMode,
} from './schemas/conversation.schema';
import type { ConversationDocument } from './schemas/conversation.schema';
import { OperatorInboxQueueService } from './operator-inbox-queue.service';

export type InboxListRow = {
  conversation: ConversationDocument;
  /** Диалог в Redis-очереди «нужен оператор» (FIFO, TTL 1 ч). */
  needsOperatorAttention: boolean;
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly operatorInboxQueue: OperatorInboxQueueService,
    private readonly vkService: VkService,
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

  /**
   * Постановка в Redis-очередь «нужен оператор» (без дублей по времени первой постановки).
   * Тестовый platform=test в inbox не показывается — очередь для него не ведём.
   */
  async enqueueOperatorAttentionByThread(
    customerId: number,
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<void> {
    if (platform === ConversationPlatform.TEST) {
      return;
    }
    const doc = await this.conversationsRepository.findByPlatformChatAndBot(
      platform,
      chatId,
      botId,
    );
    if (!doc) {
      return;
    }
    await this.operatorInboxQueue.enqueueIfMissing(
      customerId,
      String(doc._id),
    );
  }

  async removeOperatorAttentionByThread(
    customerId: number,
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<void> {
    if (platform === ConversationPlatform.TEST) {
      return;
    }
    const doc = await this.conversationsRepository.findByPlatformChatAndBot(
      platform,
      chatId,
      botId,
    );
    if (!doc) {
      return;
    }
    await this.operatorInboxQueue.remove(customerId, String(doc._id));
  }

  /** Список диалогов для inbox (без демо и без platform=test). Очередь Redis — сверху, FIFO по времени ожидания. */
  async listInboxForCustomer(
    customerId: number,
    options: { platform?: ConversationPlatform; page: number; limit: number },
  ): Promise<{ items: InboxListRow[]; total: number }> {
    const { platform, page, limit } = options;
    const skip = page * limit;
    const settings = await this.customerSettingsRepository.findByCustomerId(
      String(customerId),
    );
    const ownedBotIds = settings.map((s) => String(s._id));

    const priorityIds =
      await this.operatorInboxQueue.cleanupAndGetOrderedConversationIds(
        customerId,
      );

    const [all, total] = await Promise.all([
      this.conversationsRepository.findInboxAll(customerId, {
        platform,
        ownedBotIds,
      }),
      this.conversationsRepository.countInbox(customerId, platform, ownedBotIds),
    ]);

    const byId = new Map<string, ConversationDocument>();
    for (const c of all) {
      byId.set(String(c._id), c);
    }

    const priorityOrdered: ConversationDocument[] = [];
    for (const id of priorityIds) {
      const doc = byId.get(id);
      if (doc) {
        priorityOrdered.push(doc);
      }
    }

    const prioritySet = new Set(priorityOrdered.map((c) => String(c._id)));
    const rest = all
      .filter((c) => !prioritySet.has(String(c._id)))
      .sort((a, b) => {
        const ta = (a.updatedAt ?? new Date(0)).getTime();
        const tb = (b.updatedAt ?? new Date(0)).getTime();
        return tb - ta;
      });

    const sorted: InboxListRow[] = [
      ...priorityOrdered.map((conversation) => ({
        conversation,
        needsOperatorAttention: true,
      })),
      ...rest.map((conversation) => ({
        conversation,
        needsOperatorAttention: false,
      })),
    ];

    const items = sorted.slice(skip, skip + limit);

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
   * Сохраняет сообщение оператора и доставляет его в канал (Telegram/VK).
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
      if (settings.botType !== BotType.VK) {
        throw new BadRequestException('Тип бота не совпадает с каналом VK');
      }
      const userIdNum = Number(doc.chatId);
      if (Number.isNaN(userIdNum)) {
        throw new BadRequestException('Некорректный chat_id для VK');
      }
      await this.vkService.sendMessage(settings.token, userIdNum, trimmed);
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
