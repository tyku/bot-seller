import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramWebhookService {
  private readonly logger = new Logger(TelegramWebhookService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('gateway.baseUrl')
      ?? 'http://localhost:3000';
  }

  async registerWebhook(
    botToken: string,
    botId: string,
    secretToken: string,
  ): Promise<void> {
    const webhookUrl = `${this.baseUrl}/gateway/telegram/webhook/${botId}`;

    this.logger.log(`Registering webhook for bot ${botId}: ${webhookUrl}`);

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

    const result = await response.json();

    if (!result.ok) {
      this.logger.error(`setWebhook failed for bot ${botId}: ${result.description}`);
      throw new Error(`Telegram setWebhook failed: ${result.description}`);
    }

    this.logger.log(`Webhook registered for bot ${botId}`);
  }

  async deleteWebhook(botToken: string): Promise<void> {
    this.logger.log('Deleting Telegram webhook');

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      { method: 'POST' },
    );

    const result = await response.json();

    if (!result.ok) {
      this.logger.warn(`deleteWebhook failed: ${result.description}`);
    }
  }
}
