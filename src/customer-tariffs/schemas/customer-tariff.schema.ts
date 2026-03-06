import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CustomerTariffDocument = CustomerTariff & Document;

@Schema({ timestamps: true })
export class CustomerTariff {
  @Prop({ required: true, type: Number, index: true })
  customerId: number;

  @Prop({ required: true, type: MongooseSchema.Types.String, index: true })
  tariffId: string;

  @Prop({ default: () => new Date() })
  appliedAt: Date;

  @Prop()
  expiresAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerTariffSchema = SchemaFactory.createForClass(CustomerTariff);
CustomerTariffSchema.index({ customerId: 1, tariffId: 1 });
