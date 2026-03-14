import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TariffUsageService } from './tariff-usage.service';
import { TariffUsageRepository } from './tariff-usage.repository';
import { TariffUsageController } from './tariff-usage.controller';
import { TariffUsage, TariffUsageSchema } from './schemas/tariff-usage.schema';
import {
  CustomerChat,
  CustomerChatSchema,
} from './schemas/customer-chat.schema';
import { CustomerTariffsModule } from '../customer-tariffs/customer-tariffs.module';
import { CustomerModule } from '../customer/customer.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TariffUsage.name, schema: TariffUsageSchema },
      { name: CustomerChat.name, schema: CustomerChatSchema },
    ]),
    CustomerTariffsModule,
    CustomerModule,
    TelegramModule,
  ],
  controllers: [TariffUsageController],
  providers: [TariffUsageService, TariffUsageRepository],
  exports: [TariffUsageService, TariffUsageRepository],
})
export class TariffUsageModule {}
