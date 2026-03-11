import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { TariffUsageService } from './tariff-usage.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('tariff-usage')
export class TariffUsageController {
  constructor(private readonly tariffUsageService: TariffUsageService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyUsage(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{
    success: boolean;
    data: { chatsUsed: number; requestsUsed: number; botsUsed: number };
    message: string;
  }> {
    const data = await this.tariffUsageService.getUsageForDisplay(
      user.customerId,
    );
    return {
      success: true,
      data,
      message: 'Usage retrieved',
    };
  }
}
