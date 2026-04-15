import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayController } from './gateway.controller';
import { VkWebhookController } from './vk-webhook.controller';
import { GatewayService } from './gateway.service';
import { DeduplicationService } from './services/deduplication.service';
import { TelegramIncomingProcessor } from './processors/telegram-incoming.processor';
import { VkIncomingProcessor } from './processors/vk-incoming.processor';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { UserModule } from '../user/user.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { TariffUsageModule } from '../tariff-usage/tariff-usage.module';
import { CustomerModule } from '../customer/customer.module';
import { VkModule } from '../vk/vk.module';
import { TELEGRAM_INCOMING_QUEUE, VK_INCOMING_QUEUE } from './constants';

@Module({
  imports: [
    VkModule,
    CustomerSettingsModule,
    TariffUsageModule,
    CustomerModule,
    UserModule,
    ConversationsModule,
    LlmModule,
    BullModule.registerQueue(
      { name: TELEGRAM_INCOMING_QUEUE },
      { name: VK_INCOMING_QUEUE },
    ),
  ],
  controllers: [GatewayController, VkWebhookController],
  providers: [
    GatewayService,
    DeduplicationService,
    TelegramIncomingProcessor,
    VkIncomingProcessor,
  ],
})
export class GatewayModule {}
