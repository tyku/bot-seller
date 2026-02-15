import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationService } from './verification.service';
import { Customer, CustomerSchema } from '../customer/schemas/customer.schema';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
    TelegramModule,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
