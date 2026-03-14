import { Injectable } from '@nestjs/common';
import { CustomerTariffsService } from '../customer-tariffs/customer-tariffs.service';
import { CustomerSettingsService } from '../customer-settings/customer-settings.service';
import { TariffUsageService } from '../tariff-usage/tariff-usage.service';
import type { ActiveSubscriptionDto } from '../customer-tariffs/customer-tariffs.service';
import type { CustomerTariffDocument } from '../customer-tariffs/schemas/customer-tariff.schema';

/**
 * Прослойка (Application Layer): координирует сценарии оформления подписки.
 * Импортирует доменные модули, но сама ни ими не импортируется — циклов нет.
 */
@Injectable()
export class SubscriptionApplicationService {
  constructor(
    private readonly customerTariffsService: CustomerTariffsService,
    private readonly customerSettingsService: CustomerSettingsService,
    private readonly tariffUsageService: TariffUsageService,
  ) {}

  async getCurrentSubscription(
    customerId: number,
  ): Promise<ActiveSubscriptionDto | null> {
    return this.customerTariffsService.getActiveSubscription(customerId);
  }

  /**
   * Оформление тарифа + синхронизация usage по фактическому числу ботов.
   */
  async completePayment(
    customerId: number,
    tariffId: string,
  ): Promise<CustomerTariffDocument> {
    const ct = await this.customerTariffsService.completeTestPayment(
      customerId,
      tariffId,
    );
    const activeBotsCount =
      await this.customerSettingsService.getActiveBotsCount(customerId);
    await this.tariffUsageService.syncBotsUsedForNewTariff(
      customerId,
      ct.tariffId,
      activeBotsCount,
    );
    return ct;
  }
}
