import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Simple controller for Telegram verification
 * These endpoints can be used by a simple Telegram bot to:
 * 1. Check for pending verification codes
 * 2. Link telegram accounts after user sends code via bot
 */
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Get pending verification code for a telegram username
   * This can be polled by frontend or a simple bot
   */
  @Public()
  @Get('verification/:username')
  @HttpCode(HttpStatus.OK)
  async getPendingVerification(@Param('username') username: string) {
    const verification = await this.telegramService.getPendingVerification(username);
    
    if (!verification) {
      return {
        success: false,
        message: 'No pending verification found',
      };
    }

    return {
      success: true,
      data: verification,
      message: 'Pending verification found',
    };
  }

  /**
   * Link telegram account - called by bot when user provides code
   */
  @Public()
  @Post('link')
  @HttpCode(HttpStatus.OK)
  async linkAccount(@Body() body: {
    telegramId: number;
    telegramUsername: string;
    code: string;
  }) {
    const success = await this.telegramService.linkTelegramAccount(
      body.telegramId,
      body.telegramUsername,
      body.code,
    );

    if (!success) {
      return {
        success: false,
        message: 'Invalid or expired verification code',
      };
    }

    return {
      success: true,
      message: 'Telegram account linked successfully',
    };
  }
}
