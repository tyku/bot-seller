import { Injectable, Logger } from '@nestjs/common';
import { TariffUsageRepository } from './tariff-usage.repository';
import {
  CustomerTariffsService,
  ActiveSubscriptionDto,
} from '../customer-tariffs/customer-tariffs.service';
import { CustomerService } from '../customer/customer.service';
import { TelegramService } from '../telegram/telegram.service';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  subscription: ActiveSubscriptionDto | null;
  usage: { chatsUsed: number; requestsUsed: number; botsUsed: number };
}

@Injectable()
export class TariffUsageService {
  private readonly logger = new Logger(TariffUsageService.name);

  constructor(
    private readonly usageRepository: TariffUsageRepository,
    private readonly customerTariffsService: CustomerTariffsService,
    private readonly customerService: CustomerService,
    private readonly telegramService: TelegramService,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
  ) {}

  /**
   * Проверяет, активна ли подписка и есть ли лимиты. Не потребляет лимит.
   * Учитываются все лимиты тарифа: chats, requests, bots.
   */
  async checkSubscriptionAndLimits(
    customerId: number,
  ): Promise<LimitCheckResult> {
    const subscription =
      await this.customerTariffsService.getActiveSubscription(customerId);
    const tariffId = subscription?.tariffId ?? undefined;
    const usageDoc = await this.usageRepository.getUsage(customerId, tariffId);
    const botsUsed =
      await this.customerSettingsRepository.countNonArchivedByCustomerId(
        String(customerId),
      );
    const usage = {
      chatsUsed: usageDoc.chatsUsed,
      requestsUsed: usageDoc.requestsUsed,
      botsUsed,
    };

    if (!subscription) {
      return {
        allowed: false,
        reason: 'subscription_inactive',
        subscription: null,
        usage,
      };
    }

    const { limits } = subscription.tariff;
    const chatsOk = usage.chatsUsed < limits.chats;
    const requestsOk = usage.requestsUsed < limits.requests;
    const botsOk = limits.bots === 0 || usage.botsUsed < limits.bots;

    if (!chatsOk || !requestsOk || !botsOk) {
      return {
        allowed: false,
        reason: 'limits_exceeded',
        subscription,
        usage,
      };
    }

    return {
      allowed: true,
      subscription,
      usage,
    };
  }

  /**
   * Для /start: новый чат — проверяем лимит chats и при успехе добавляем чат.
   * Возвращает allowed: true если можно обработать, false если лимит или подписка не позволяют.
   */
  async tryConsumeChat(
    customerId: number,
    chatId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const subscription =
      await this.customerTariffsService.getActiveSubscription(customerId);
    if (!subscription) {
      return { allowed: false, reason: 'subscription_inactive' };
    }

    const chatExists = await this.usageRepository.hasChat(customerId, chatId);
    if (chatExists) {
      return { allowed: true };
    }

    const chatsUsed = await this.usageRepository.getChatsCount(customerId);
    const limitChats = subscription.tariff.limits.chats;
    if (chatsUsed >= limitChats) {
      return { allowed: false, reason: 'chats_limit_exceeded' };
    }

    await this.usageRepository.ensureChat(customerId, chatId);
    return { allowed: true };
  }

  /**
   * Для сообщения: проверяем лимит requests, при успехе инкрементируем.
   */
  async tryConsumeRequest(customerId: number): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const subscription =
      await this.customerTariffsService.getActiveSubscription(customerId);
    if (!subscription) {
      return { allowed: false, reason: 'subscription_inactive' };
    }

    const usage = await this.usageRepository.getUsage(
      customerId,
      subscription.tariffId,
    );
    if (usage.requestsUsed >= subscription.tariff.limits.requests) {
      return { allowed: false, reason: 'requests_limit_exceeded' };
    }

    await this.usageRepository.incrementRequests(
      customerId,
      subscription.tariffId,
    );
    return { allowed: true };
  }

  /**
   * Если использование достигло ≥75% лимита и мы ещё не отправляли уведомление — отправляем в канал верификации (Telegram).
   */
  async checkAndSend75Notification(customerId: number): Promise<void> {
    const subscription =
      await this.customerTariffsService.getActiveSubscription(customerId);
    if (!subscription) return;

    const usage = await this.usageRepository.getUsage(
      customerId,
      subscription.tariffId,
    );
    const { limits } = subscription.tariff;
    const botsUsed =
      await this.customerSettingsRepository.countNonArchivedByCustomerId(
        String(customerId),
      );

    const chatsPercent =
      limits.chats > 0 ? (usage.chatsUsed / limits.chats) * 100 : 0;
    const requestsPercent =
      limits.requests > 0
        ? (usage.requestsUsed / limits.requests) * 100
        : 0;
    const botsPercent =
      limits.bots > 0 ? (botsUsed / limits.bots) * 100 : 0;
    const at75 =
      chatsPercent >= 75 ||
      requestsPercent >= 75 ||
      botsPercent >= 75;
    if (!at75) return;

    if (usage.last75NotificationSentAt) return;

    await this.usageRepository.set75NotificationSent(
      customerId,
      subscription.tariffId,
    );

    const customer = await this.customerService.findByCustomerId(customerId);
    if (!customer?.telegramId) {
      this.logger.debug(
        `Customer ${customerId} has no telegramId, skip 75% notification`,
      );
      return;
    }

    const lines = [
      '⚠️ Лимиты в оплаченном тарифе заканчиваются, вы можете увеличить их, купив доп. пакеты.',
      '',
      `Чаты: использовано ${usage.chatsUsed} из ${limits.chats}, осталось ${Math.max(0, limits.chats - usage.chatsUsed)}.`,
      `Запросы: использовано ${usage.requestsUsed} из ${limits.requests}, осталось ${Math.max(0, limits.requests - usage.requestsUsed)}.`,
    ];
    if (limits.bots > 0) {
      lines.push(
        `Боты: использовано ${botsUsed} из ${limits.bots}, осталось ${Math.max(0, limits.bots - botsUsed)}.`,
      );
    }
    const text = lines.join('\n');

    try {
      await this.telegramService.sendMessageToUser(customer.telegramId, text);
      this.logger.log(`75% limit notification sent to customer ${customerId}`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to send 75% notification to customer ${customerId}: ${err?.message}`,
      );
    }
  }

  /** Использование по всем лимитам (чаты, запросы, боты) для отображения. Боты считаются по CustomerSettings (без архива). */
  async getUsageForDisplay(customerId: number): Promise<{
    chatsUsed: number;
    requestsUsed: number;
    botsUsed: number;
  }> {
    const subscription =
      await this.customerTariffsService.getActiveSubscription(customerId);
    const tariffId = subscription?.tariffId ?? undefined;
    const u = await this.usageRepository.getUsage(customerId, tariffId);
    const botsUsed =
      await this.customerSettingsRepository.countNonArchivedByCustomerId(
        String(customerId),
      );
    return {
      chatsUsed: u.chatsUsed,
      requestsUsed: u.requestsUsed,
      botsUsed,
    };
  }
}
