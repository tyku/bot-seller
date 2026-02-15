import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VerificationDocument = Verification & Document;

export enum VerificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  SMS = 'sms',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Verification {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: VerificationType, index: true })
  type: VerificationType;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: VerificationStatus, default: VerificationStatus.PENDING })
  status: VerificationStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  verifiedAt: Date;

  @Prop()
  attempts: number;

  // Контактная информация для отправки кода
  @Prop({ index: true })
  contact: string; // email, phone number, или telegram username

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);

// Создаем составной индекс для быстрого поиска активных верификаций
VerificationSchema.index({ customerId: 1, type: 1, status: 1 });
VerificationSchema.index({ contact: 1, type: 1 });
