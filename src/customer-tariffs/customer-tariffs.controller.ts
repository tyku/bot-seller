import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomerTariffsService } from './customer-tariffs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('customer-tariffs')
export class CustomerTariffsController {
  constructor(
    private readonly customerTariffsService: CustomerTariffsService,
  ) {}

  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{
    success: boolean;
    data: Awaited<ReturnType<CustomerTariffsService['getActiveSubscription']>>;
    message: string;
  }> {
    const data =
      await this.customerTariffsService.getActiveSubscription(user.customerId);
    return {
      success: true,
      data,
      message: data
        ? 'Active subscription retrieved'
        : 'No active subscription',
    };
  }
}
