import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationPlatform,
  ConversationType,
  ConversationMessage,
  ConversationMessageType,
  ConversationControlMode,
} from './schemas/conversation.schema';

@Injectable()
export class ConversationsRepository {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async findById(id: string): Promise<ConversationDocument | null> {
    return this.conversationModel.findById(id).exec();
  }

  async findByPlatformChatAndBot(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOne({ platform, chatId, botId })
      .exec();
  }

  async create(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    type: ConversationType = ConversationType.DEFAULT,
    normalizedPromptVersion?: number,
    customerId?: number,
  ): Promise<ConversationDocument> {
    const doc = new this.conversationModel({
      platform,
      chatId,
      botId,
      type,
      ...(normalizedPromptVersion != null && { normalizedPromptVersion }),
      ...(customerId != null && { customerId }),
    });
    return doc.save();
  }

  async setCustomerIdIfMissing(
    id: string,
    customerId: number,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOneAndUpdate(
        { _id: id, $or: [{ customerId: { $exists: false } }, { customerId: null }] },
        { $set: { customerId, updatedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async findInboxPage(
    customerId: number,
    options: {
      platform?: ConversationPlatform;
      skip: number;
      limit: number;
      ownedBotIds: string[];
    },
  ): Promise<ConversationDocument[]> {
    const { platform, skip, limit, ownedBotIds } = options;
    const filter: Record<string, unknown> = {
      ...this.inboxBaseFilter(customerId, ownedBotIds, platform),
    };
    return this.conversationModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countInbox(
    customerId: number,
    platform: ConversationPlatform | undefined,
    ownedBotIds: string[],
  ): Promise<number> {
    const filter = this.inboxBaseFilter(customerId, ownedBotIds, platform);
    return this.conversationModel.countDocuments(filter).exec();
  }

  /** Диалоги клиента: по customerId или по списку его botId (в т.ч. старые без customerId). */
  private inboxBaseFilter(
    customerId: number,
    ownedBotIds: string[],
    platform: ConversationPlatform | undefined,
  ): Record<string, unknown> {
    const platformClause = platform
      ? { platform }
      : { platform: { $ne: ConversationPlatform.TEST } };
    return {
      botId: { $not: /^demo:/ },
      ...platformClause,
      $or: [
        { customerId },
        ...(ownedBotIds.length > 0 ? [{ botId: { $in: ownedBotIds } }] : []),
      ],
    };
  }

  async appendMessage(
    id: string,
    message: {
      type: ConversationMessageType;
      content: string;
      questionId?: string;
    },
  ): Promise<ConversationDocument | null> {
    const msg: ConversationMessage = {
      type: message.type,
      content: message.content,
      ...(message.questionId != null && message.questionId !== '' && {
        questionId: message.questionId,
      }),
      createdAt: new Date(),
    };
    return this.conversationModel
      .findByIdAndUpdate(
        id,
        { $push: { messages: msg }, $set: { updatedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async setControlMode(
    platform: ConversationPlatform,
    chatId: string,
    botId: string,
    controlMode: ConversationControlMode,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOneAndUpdate(
        { platform, chatId, botId },
        { $set: { controlMode, updatedAt: new Date() } },
        { new: true },
      )
      .exec();
  }
}
