import { Injectable, Logger } from '@nestjs/common';
import { CustomerTariffsService } from '../../customer-tariffs/customer-tariffs.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly customerTariffsService: CustomerTariffsService,
  ) {}

  /**
   * Checks whether the customer's subscription is active (есть активный тариф, не истёк).
   */
  async isSubscriptionActive(customerId: string): Promise<boolean> {
    const id = Number(customerId);
    if (Number.isNaN(id)) {
      this.logger.warn(`Invalid customerId for subscription check: ${customerId}`);
      return false;
    }
    const subscription =
      await this.customerTariffsService.getActiveSubscription(id);
    const active = !!subscription;
    if (!active) {
      this.logger.debug(`Subscription inactive for customer ${customerId}`);
    }
    return active;
  }
}
