import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CustomerSettingsDocument = CustomerSettings & Document;

export enum BotType {
  TG = 'tg',
  VK = 'vk',
}

export enum PromptType {
  CONTEXT = 'context',
}

@Schema({ _id: false })
export class Prompt {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, enum: PromptType, default: PromptType.CONTEXT })
  type: PromptType;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);

@Schema({ timestamps: true })
export class CustomerSettings {
  @Prop({ required: true, type: MongooseSchema.Types.String, index: true })
  customerId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, enum: BotType })
  botType: BotType;

  @Prop({ type: [PromptSchema], default: [] })
  prompts: Prompt[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerSettingsSchema = SchemaFactory.createForClass(CustomerSettings);

// Create index for efficient queries
CustomerSettingsSchema.index({ customerId: 1 });
