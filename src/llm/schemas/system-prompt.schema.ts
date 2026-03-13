import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemPromptDocument = SystemPrompt & Document;

/** Тип системного промпта: message — ко всем сообщениям, prompt — для нормализации пользовательских промптов */
export enum SystemPromptType {
  MESSAGE = 'message',
  PROMPT = 'prompt',
}

@Schema({ timestamps: true, collection: 'system_prompts' })
export class SystemPrompt {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: SystemPromptType })
  type: SystemPromptType;

  @Prop({ required: true })
  text: string;
}

export const SystemPromptSchema = SchemaFactory.createForClass(SystemPrompt);

SystemPromptSchema.index({ type: 1 });
