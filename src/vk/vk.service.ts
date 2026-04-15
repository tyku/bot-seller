import { Injectable } from '@nestjs/common';
import { sendVkMessage } from '../common/vk-api';

/**
 * Отправка сообщений в VK (messages.send). Токен — групповой access token из настроек бота.
 * Логика зеркалирует использование Telegram sendMessage в процессоре входящих.
 */
@Injectable()
export class VkService {
  async sendMessage(
    accessToken: string,
    userId: number,
    message: string,
  ): Promise<void> {
    await sendVkMessage(accessToken, userId, message);
  }
}
