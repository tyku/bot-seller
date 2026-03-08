import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerChatDocument = CustomerChat & Document;

/** Уникальный чат пользователя (customerId + chatId), учитывается в лимите limits.chats */
@Schema({ timestamps: true })
export class CustomerChat {
  @Prop({ required: true, type: Number, index: true })
  customerId: number;

  @Prop({ required: true, type: String, index: true })
  chatId: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerChatSchema = SchemaFactory.createForClass(CustomerChat);
CustomerChatSchema.index({ customerId: 1, chatId: 1 }, { unique: true });
