import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TariffDocument = Tariff & Document;

export enum TariffStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Schema({ _id: false })
export class TariffLimits {
  @Prop({ required: true, default: 0 })
  requests: number;

  /** Количество активных чатов, которые обслуживаем в рамках тарифа */
  @Prop({ required: true, default: 0 })
  chats: number;

  /** Максимум ботов по тарифу; лимиты requests и chats общие на всех ботов */
  @Prop({ required: true, default: 1 })
  bots: number;
}

export const TariffLimitsSchema = SchemaFactory.createForClass(TariffLimits);

@Schema({ timestamps: true })
export class Tariff {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ type: TariffLimitsSchema, required: true })
  limits: TariffLimits;

  /** Длительность активности тарифа в днях (например 30, 10) */
  @Prop({ required: false })
  activityDurationDays: number;

  @Prop({ required: true, enum: TariffStatus, default: TariffStatus.ACTIVE })
  status: TariffStatus;

  /** Пробный тариф — для теста, без оплаты */
  @Prop({ default: false })
  trial: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TariffSchema = SchemaFactory.createForClass(Tariff);
TariffSchema.index({ status: 1 });
TariffSchema.index({ name: 1 });
