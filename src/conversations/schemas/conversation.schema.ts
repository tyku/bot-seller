import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationPlatform {
  TG = 'tg',
  VK = 'vk',
  /** Тестовый диалог из интерфейса отладки (chatId = customerId) */
  TEST = 'test',
}

export enum ConversationType {
  DEFAULT = 'default',
  TEST = 'test',
}

export enum ConversationMessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Schema({ _id: false })
export class ConversationMessage {
  @Prop({ required: true, enum: ConversationMessageType })
  type: ConversationMessageType;

  @Prop({ required: true })
  content: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const ConversationMessageSchema =
  SchemaFactory.createForClass(ConversationMessage);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ConversationPlatform, index: true })
  platform: ConversationPlatform;

  @Prop({ required: true, index: true })
  chatId: string;

  @Prop({ required: true, index: true })
  botId: string;

  @Prop({ enum: ConversationType, default: ConversationType.DEFAULT })
  type: ConversationType;

  @Prop({ type: [ConversationMessageSchema], default: [] })
  messages: ConversationMessage[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index(
  { botId: 1, platform: 1, chatId: 1 },
  { unique: true },
);
