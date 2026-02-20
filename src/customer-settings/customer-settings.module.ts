import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSettingsController } from './customer-settings.controller';
import { CustomerSettingsService } from './customer-settings.service';
import { CustomerSettingsRepository } from './customer-settings.repository';
import { WebhookSecretService } from './services/webhook-secret.service';
import { BotCacheService } from './services/bot-cache.service';
import { TelegramWebhookService } from './services/telegram-webhook.service';
import {
  CustomerSettings,
  CustomerSettingsSchema,
} from './schemas/customer-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSettings.name, schema: CustomerSettingsSchema },
    ]),
  ],
  controllers: [CustomerSettingsController],
  providers: [
    CustomerSettingsService,
    CustomerSettingsRepository,
    WebhookSecretService,
    BotCacheService,
    TelegramWebhookService,
  ],
  exports: [CustomerSettingsService, CustomerSettingsRepository, BotCacheService],
})
export class CustomerSettingsModule {}
