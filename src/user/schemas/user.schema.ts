import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum SourceType {
  TG = 'tg',
  VK = 'vk',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, enum: SourceType })
  sourceType: SourceType;

  @Prop({ required: true, index: true })
  externalId: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ sparse: true, index: true })
  username: string;

  @Prop({ sparse: true, index: true })
  phone: string;

  @Prop({ sparse: true, index: true })
  email: string;

  @Prop()
  languageCode: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ sourceType: 1, externalId: 1 }, { unique: true });
