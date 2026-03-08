import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { DeduplicationService } from './services/deduplication.service';
import { TelegramIncomingProcessor } from './processors/telegram-incoming.processor';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { UserModule } from '../user/user.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { TariffUsageModule } from '../tariff-usage/tariff-usage.module';
import { TELEGRAM_INCOMING_QUEUE } from './constants';

@Module({
  imports: [
    CustomerSettingsModule,
    TariffUsageModule,
    UserModule,
    ConversationsModule,
    LlmModule,
    BullModule.registerQueue({ name: TELEGRAM_INCOMING_QUEUE }),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    DeduplicationService,
    TelegramIncomingProcessor,
  ],
})
export class GatewayModule {}
