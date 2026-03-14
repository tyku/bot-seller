import { Module } from '@nestjs/common';
import { CustomerTariffsModule } from '../customer-tariffs/customer-tariffs.module';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { TariffUsageModule } from '../tariff-usage/tariff-usage.module';
import { SubscriptionApplicationController } from './subscription-application.controller';
import { SubscriptionApplicationService } from './subscription-application.service';

/**
 * Прослойка (Application Layer): только импортирует доменные модули,
 * координирует сценарии. Ни один из импортируемых модулей её не импортирует — циклов нет.
 */
@Module({
  imports: [
    CustomerTariffsModule,
    CustomerSettingsModule,
    TariffUsageModule,
  ],
  controllers: [SubscriptionApplicationController],
  providers: [SubscriptionApplicationService],
})
export class SubscriptionApplicationModule {}
