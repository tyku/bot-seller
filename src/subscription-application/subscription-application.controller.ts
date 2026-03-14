import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SubscriptionApplicationService } from './subscription-application.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

class PayBodyDto {
  tariffId!: string;
}

@Controller('customer-tariffs')
export class SubscriptionApplicationController {
  constructor(
    private readonly subscriptionApplication: SubscriptionApplicationService,
  ) {}

  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{
    success: boolean;
    data: Awaited<ReturnType<SubscriptionApplicationService['getCurrentSubscription']>>;
    message: string;
  }> {
    const data =
      await this.subscriptionApplication.getCurrentSubscription(user.customerId);
    return {
      success: true,
      data,
      message: data
        ? 'Active subscription retrieved'
        : 'No active subscription',
    };
  }

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  async completeTestPayment(
    @CurrentUser() user: CurrentUserData,
    @Body() body: PayBodyDto,
  ): Promise<{
    success: boolean;
    data: { id: string; tariffId: string; expiresAt: Date };
    message: string;
  }> {
    const { tariffId } = body;
    if (!tariffId || typeof tariffId !== 'string') {
      throw new BadRequestException('tariffId is required');
    }
    const ct = await this.subscriptionApplication.completePayment(
      user.customerId,
      tariffId,
    );
    return {
      success: true,
      data: {
        id: ct._id.toString(),
        tariffId: ct.tariffId,
        expiresAt: ct.expiresAt!,
      },
      message: 'Payment completed',
    };
  }
}
