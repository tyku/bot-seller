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

  @Prop()
  expiresAt: Date;

  @Prop({ required: true, enum: TariffStatus, default: TariffStatus.ACTIVE })
  status: TariffStatus;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TariffSchema = SchemaFactory.createForClass(Tariff);
TariffSchema.index({ status: 1 });
