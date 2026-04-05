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
  ): Promise<ConversationDocument> {
    const doc = new this.conversationModel({
      platform,
      chatId,
      botId,
      type,
      ...(normalizedPromptVersion != null && { normalizedPromptVersion }),
    });
    return doc.save();
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
}
