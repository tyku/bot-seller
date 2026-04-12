import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { GatewayService } from './gateway.service';
import type { VkCallbackEvent } from './interfaces/vk-update.interface';

@Controller('vk')
export class VkWebhookController {
  private readonly logger = new Logger(VkWebhookController.name);

  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * VK Callback API. URL: POST /vk/webhook/:botId
   * Подтверждение: ответ — строка из vkConfirmationCode (text/plain).
   * Успешная обработка события: тело "ok" (text/plain).
   */
  @Public()
  @Post('webhook/:botId')
  @HttpCode(HttpStatus.OK)
  async vkWebhook(
    @Param('botId') botId: string,
    @Body() body: VkCallbackEvent,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    this.logger.debug(`VK callback for bot ${botId}, type=${body?.type}`);

    const result = await this.gatewayService.handleVkCallback(botId, body);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (result.kind === 'confirmation') {
      res.send(result.code);
      return;
    }
    res.send('ok');
  }
}
