import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { Customer, CustomerSchema } from '../customer/schemas/customer.schema';
import { TelegramSession, TelegramSessionSchema } from './schemas/telegram-session.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: TelegramSession.name, schema: TelegramSessionSchema },
    ]),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
