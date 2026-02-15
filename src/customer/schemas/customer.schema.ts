import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

export enum CustomerStatus {
  CREATED = 'created',
  VERIFIED = 'verified',
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  customerId: number;

  @Prop({ unique: true, sparse: true, index: true })
  email: string;

  @Prop({ unique: true, sparse: true, index: true })
  phone: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: CustomerStatus, default: CustomerStatus.CREATED })
  status: CustomerStatus;

  // Telegram связь
  @Prop({ unique: true, sparse: true, index: true })
  telegramId: number;

  @Prop()
  telegramUsername: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
