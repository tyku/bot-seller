import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { DeduplicationService } from './services/deduplication.service';
import { SubscriptionService } from './services/subscription.service';
import { TelegramIncomingProcessor } from './processors/telegram-incoming.processor';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { TELEGRAM_INCOMING_QUEUE } from './constants';

@Module({
  imports: [
    CustomerSettingsModule,
    BullModule.registerQueue({ name: TELEGRAM_INCOMING_QUEUE }),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    DeduplicationService,
    SubscriptionService,
    TelegramIncomingProcessor,
  ],
})
export class GatewayModule {}
