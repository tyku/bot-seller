import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TariffUsageDocument = TariffUsage & Document;

@Schema({ timestamps: true })
export class TariffUsage {
  @Prop({ required: true, type: Number, unique: true, index: true })
  customerId: number;

  @Prop({ required: true, default: 0 })
  requestsUsed: number;

  /** Когда в последний раз отправляли уведомление о 75% лимита (чтобы не спамить) */
  @Prop({ type: Date, default: null })
  last75NotificationSentAt: Date | null;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TariffUsageSchema = SchemaFactory.createForClass(TariffUsage);
TariffUsageSchema.index({ customerId: 1 });
