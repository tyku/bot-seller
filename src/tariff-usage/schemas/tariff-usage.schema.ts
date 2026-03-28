import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TariffUsageDocument = TariffUsage & Document;

@Schema({ timestamps: true })
export class TariffUsage {
  @Prop({ required: true, type: Number, index: true })
  customerId: number;

  /** Связь с конкретным тарифом — использование привязано к тарифу подписки (опционально для старых записей) */
  @Prop({ required: false, type: String, index: true, default: null })
  tariffId: string | null;

  @Prop({ required: true, default: 0 })
  requestsUsed: number;

  /** Учёт ботов по лимиту тарифа (инкремент при создании, декремент при архивации/удалении) */
  @Prop({ required: true, default: 0 })
  botsUsed: number;

  /** Когда в последний раз отправляли уведомление о 75% лимита (чтобы не спамить) */
  @Prop({ type: Date, default: null })
  last75NotificationSentAt: Date | null;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TariffUsageSchema = SchemaFactory.createForClass(TariffUsage);
TariffUsageSchema.index({ customerId: 1, tariffId: 1 }, { unique: true });
