import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { GatewayService } from './gateway.service';
import type { TelegramUpdate } from './interfaces/telegram-update.interface';

@Controller('gateway')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * Telegram webhook endpoint.
   * URL to register with Telegram: POST /gateway/telegram/webhook/:botId
   * Telegram sends X-Telegram-Bot-Api-Secret-Token header for verification.
   */
  @Public()
  @Post('telegram/webhook/:botId')
  @HttpCode(HttpStatus.OK)
  async telegramWebhook(
    @Param('botId') botId: string,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string | undefined,
    @Body() update: TelegramUpdate,
  ): Promise<{ ok: true }> {
    this.logger.debug(`Telegram webhook hit for bot ${botId}, update_id=${update?.update_id}`);

    await this.gatewayService.handleTelegramWebhook(botId, secretToken, update);

    return { ok: true };
  }
}
