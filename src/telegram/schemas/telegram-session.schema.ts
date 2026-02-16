import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelegramSessionDocument = HydratedDocument<TelegramSession>;

export enum TelegramSessionStatus {
  PENDING = 'pending',
  CONTACT_RECEIVED = 'contact_received',
  CODE_SENT = 'code_sent',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class TelegramSession {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop()
  name: string;

  @Prop()
  phone: string;

  @Prop()
  telegramId: number;

  @Prop()
  telegramUsername: string;

  @Prop({ 
    type: String, 
    enum: Object.values(TelegramSessionStatus),
    default: TelegramSessionStatus.PENDING 
  })
  status: TelegramSessionStatus;

  @Prop()
  customerId: string;

  @Prop()
  verificationId: string;

  @Prop({ default: Date.now, expires: 600 }) // 10 минут TTL
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TelegramSessionSchema = SchemaFactory.createForClass(TelegramSession);
