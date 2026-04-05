import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NormalizedPromptDocument = NormalizedPrompt & Document;

@Schema({ timestamps: true })
export class NormalizedPrompt {
  @Prop({ required: true, type: MongooseSchema.Types.String, index: true })
  customerId: string;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'CustomerSettings',
    index: true,
  })
  customerSettingsId: Types.ObjectId;

  /** Монотонно растёт при каждой пересборке нормализованного промпта для этого бота. */
  @Prop({ required: true })
  version: number;

  @Prop({ required: true })
  body: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NormalizedPromptSchema =
  SchemaFactory.createForClass(NormalizedPrompt);

NormalizedPromptSchema.index(
  { customerSettingsId: 1, version: 1 },
  { unique: true },
);
