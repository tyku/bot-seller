import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  /**
   * Checks whether the customer's subscription is active.
   * Stub — always returns true until billing/subscription system is implemented.
   */
  async isSubscriptionActive(_customerId: string): Promise<boolean> {
    this.logger.debug(`Subscription check for customer ${_customerId} — stub, returning true`);
    return true;
  }
}
