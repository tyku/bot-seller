import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramWebhookService {
  private readonly logger = new Logger(TelegramWebhookService.name);
  private readonly baseUrl: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('gateway.baseUrl')
      ?? 'http://localhost:3000';
    this.isDev = this.configService.get<string>('nodeEnv') !== 'production';
  }

  async registerWebhook(
    botToken: string,
    botId: string,
    secretToken: string,
  ): Promise<void> {
    const webhookUrl = `${this.baseUrl}/gateway/telegram/webhook/${botId}`;

    if (this.isDev) {
      this.logger.warn(
        `[DEV] Skipping setWebhook for bot ${botId} (url: ${webhookUrl}). Use ngrok/cloudflared or curl to test locally.`,
      );
      return;
    }

    this.logger.log(`Registering webhook for bot ${botId}: ${webhookUrl}`);

    let result: any;
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: secretToken,
            allowed_updates: ['message', 'edited_message', 'callback_query'],
            max_connections: 40,
          }),
        },
      );
      result = await response.json();
    } catch (error) {
      this.logger.error(`setWebhook network error for bot ${botId}: ${error.message}`);
      throw new BadGatewayException('Не удалось связаться с Telegram API');
    }

    if (!result.ok) {
      this.logger.error(`setWebhook failed for bot ${botId}: ${result.description}`);
      throw new BadGatewayException(
        `Ошибка регистрации webhook: ${result.description}`,
      );
    }

    this.logger.log(`Webhook registered for bot ${botId}`);
  }

  async deleteWebhook(botToken: string): Promise<void> {
    if (this.isDev) {
      this.logger.warn('[DEV] Skipping deleteWebhook');
      return;
    }

    this.logger.log('Deleting Telegram webhook');

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/deleteWebhook`,
        { method: 'POST' },
      );
      const result = await response.json();
      if (!result.ok) {
        this.logger.warn(`deleteWebhook failed: ${result.description}`);
      }
    } catch (error) {
      this.logger.warn(`deleteWebhook network error: ${error.message}`);
    }
  }
}
