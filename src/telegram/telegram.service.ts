import { Injectable, OnModuleInit, OnModuleDestroy, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { Customer, CustomerDocument } from '../customer/schemas/customer.schema';
import { TelegramSession, TelegramSessionDocument, TelegramSessionStatus } from './schemas/telegram-session.schema';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  // In-memory хранилище кодов верификации: phone -> { code, timestamp }
  private pendingVerifications: Map<string, { code: string; timestamp: number }> = new Map();
  private readonly EXPIRATION_TIME = 15 * 60 * 1000; // 15 минут

  constructor(
    private configService: ConfigService,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(TelegramSession.name) private sessionModel: Model<TelegramSessionDocument>,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('telegram.botToken');

    if (!token || token === '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz') {
      this.logger.warn('Telegram bot token not configured — bot will not start');
      return;
    }

    try {
      this.bot = new Telegraf(token);
      this.setupHandlers();

      // Запускаем бот в фоне (launch() не резолвится пока бот работает)
      this.bot.launch({ dropPendingUpdates: true }).then(() => {
        this.logger.log('Telegram bot polling stopped');
      }).catch((error) => {
        this.logger.error(`Telegram bot polling error: ${error.message}`, error.stack);
      });

      this.logger.log('Telegram bot started successfully');
    } catch (error) {
      this.logger.error(`Failed to start Telegram bot: ${error.message}`, error.stack);
      this.bot = null;
    }

    // Очистка просроченных кодов каждые 5 минут
    setInterval(() => this.cleanupExpiredCodes(), 5 * 60 * 1000);
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('Application shutdown');
      this.logger.log('Telegram bot stopped');
    }
  }

  // ─────────────────────── Bot Handlers ───────────────────────

  private setupHandlers() {
    if (!this.bot) return;

    // /start — показываем большую кнопку "Авторизоваться"
    this.bot.start(async (ctx) => {
      this.logger.log(`/start from user ${ctx.from.id} (${ctx.from.username || 'no username'})`);

      await ctx.reply(
        '👋 Добро пожаловать!\n\nДля авторизации нажмите кнопку ниже и поделитесь своим контактом.',
        Markup.keyboard([
          [Markup.button.contactRequest('📱 Авторизоваться')],
        ]).resize().oneTime(),
      );
    });

    // Получение контакта
    this.bot.on(message('contact'), async (ctx) => {
      const contact = ctx.message.contact;
      const fromId = ctx.from.id;

      this.logger.log(
        `Contact received from ${fromId}: phone=${contact.phone_number}, contact_user_id=${contact.user_id}`,
      );

      // Проверяем что пользователь отправил свой контакт, а не чужой
      if (contact.user_id !== fromId) {
        await ctx.reply('❌ Пожалуйста, отправьте свой собственный контакт.', Markup.removeKeyboard());
        return;
      }

      // Нормализуем номер телефона
      let phone = contact.phone_number;
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }

      // Ищем pending код для этого номера
      const verification = this.pendingVerifications.get(phone);

      if (!verification) {
        this.logger.warn(`No pending verification for phone ${phone}`);
        await ctx.reply(
          '⚠️ Нет активного запроса на верификацию для этого номера.\n\nУбедитесь что вы начали регистрацию на сайте.',
          Markup.removeKeyboard(),
        );
        return;
      }

      // Проверяем что код не истёк
      if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
        this.pendingVerifications.delete(phone);
        await ctx.reply(
          '⏰ Код верификации истёк.\nПожалуйста, запросите новый код на сайте.',
          Markup.removeKeyboard(),
        );
        return;
      }

      // Привязываем telegramId к customer
      try {
        await this.customerModel.findOneAndUpdate(
          { phone },
          { telegramId: fromId },
        );
      } catch (err) {
        this.logger.error(`Failed to link telegramId: ${err.message}`);
      }

      // Отправляем код пользователю
      await ctx.reply(
        `✅ Контакт подтверждён!\n\n🔑 Ваш код верификации:\n\n<b>${verification.code}</b>\n\nВведите этот код на сайте.`,
        { parse_mode: 'HTML', ...Markup.removeKeyboard() },
      );

      this.logger.log(`Verification code ${verification.code} sent to user ${fromId} for phone ${phone}`);
    });

    // Любое другое текстовое сообщение
    this.bot.on(message('text'), async (ctx) => {
      await ctx.reply(
        'Для авторизации нажмите кнопку ниже 👇',
        Markup.keyboard([
          [Markup.button.contactRequest('📱 Авторизоваться')],
        ]).resize().oneTime(),
      );
    });
  }

  // ─────────────────────── Verification Code Store ───────────────────────

  /**
   * Сохраняем код верификации для номера телефона.
   * Бот отправит его пользователю когда тот нажмёт "Авторизоваться".
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const normalizedPhone = phone.replace(/\s+/g, '');

    this.pendingVerifications.set(normalizedPhone, {
      code,
      timestamp: Date.now(),
    });

    this.logger.log(`Verification code stored for phone ${normalizedPhone}: ${code}`);
  }

  /**
   * Проверяем есть ли pending код
   */
  async checkVerificationCode(phone: string): Promise<string | null> {
    const normalizedPhone = phone.replace(/\s+/g, '');
    const verification = this.pendingVerifications.get(normalizedPhone);

    if (!verification) return null;

    if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
      this.pendingVerifications.delete(normalizedPhone);
      return null;
    }

    return verification.code;
  }

  /**
   * Привязка Telegram аккаунта
   */
  async linkTelegramAccount(telegramId: number, phone: string, code: string): Promise<boolean> {
    const normalizedPhone = phone.replace(/\s+/g, '');
    const verification = this.pendingVerifications.get(normalizedPhone);

    if (!verification || verification.code !== code) return false;

    if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
      this.pendingVerifications.delete(normalizedPhone);
      return false;
    }

    const customer = await this.customerModel.findOne({ phone: normalizedPhone });
    if (!customer) return false;

    customer.telegramId = telegramId;
    await customer.save();

    this.pendingVerifications.delete(normalizedPhone);
    return true;
  }

  /**
   * Получить pending верификацию
   */
  async getPendingVerification(phone: string): Promise<{ code: string; expiresIn: number } | null> {
    const normalizedPhone = phone.replace(/\s+/g, '');
    const verification = this.pendingVerifications.get(normalizedPhone);

    if (!verification) return null;

    const expiresIn = Math.max(0, this.EXPIRATION_TIME - (Date.now() - verification.timestamp));
    if (expiresIn === 0) {
      this.pendingVerifications.delete(normalizedPhone);
      return null;
    }

    return { code: verification.code, expiresIn: Math.floor(expiresIn / 1000) };
  }

  // ─────────────────────── Session methods (legacy) ───────────────────────

  async createSession(sessionId: string, name: string): Promise<TelegramSessionDocument> {
    const session = new this.sessionModel({
      sessionId,
      name,
      status: TelegramSessionStatus.PENDING,
    });
    await session.save();
    return session;
  }

  async getSession(sessionId: string): Promise<TelegramSessionDocument> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateSessionWithContact(
    sessionId: string, phone: string, telegramId: number, telegramUsername?: string,
  ): Promise<TelegramSessionDocument> {
    const session = await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { phone, telegramId, telegramUsername, status: TelegramSessionStatus.CONTACT_RECEIVED },
      { new: true },
    );
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateSessionAfterCodeSent(
    sessionId: string, customerId: string, verificationId: string,
  ): Promise<TelegramSessionDocument> {
    const session = await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { customerId, verificationId, status: TelegramSessionStatus.CODE_SENT },
      { new: true },
    );
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionModel.deleteOne({ sessionId });
  }

  // ─────────────────────── Cleanup ───────────────────────

  private cleanupExpiredCodes(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [phone, verification] of this.pendingVerifications.entries()) {
      if (now - verification.timestamp > this.EXPIRATION_TIME) {
        this.pendingVerifications.delete(phone);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired verification codes`);
    }
  }
}
