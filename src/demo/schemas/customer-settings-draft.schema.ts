import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  BotType,
  Prompt,
  PromptSchema,
} from '../../customer-settings/schemas/customer-settings.schema';

export type CustomerSettingsDraftDocument = CustomerSettingsDraft & Document;

@Schema({ timestamps: true, collection: 'customer_settings_drafts' })
export class CustomerSettingsDraft {
  /** Публичный UUID черновика (не путать с _id) */
  @Prop({ required: true, unique: true, index: true })
  draftId: string;

  @Prop({ required: true })
  secretHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: BotType })
  botType: BotType;

  @Prop({ type: [PromptSchema], default: [] })
  prompts: Prompt[];

  /** Описание бизнеса (для генерации промпта; опционально) */
  @Prop()
  businessDescription?: string;

  @Prop()
  normalizedPrompt?: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerSettingsDraftSchema = SchemaFactory.createForClass(
  CustomerSettingsDraft,
);

CustomerSettingsDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
