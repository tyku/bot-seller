import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customer/schemas/customer.schema';

/**
 * Simple Telegram service for sending verification codes
 * This service stores pending verification codes in memory
 * and provides a simple API for checking codes via long polling
 * 
 * Note: This is a simple implementation that doesn't interfere with
 * future multi-tenant Telegram webhook server implementation
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private pendingVerifications: Map<string, { code: string; timestamp: number }> = new Map();
  private readonly EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  onModuleInit() {
    this.logger.log('Telegram service initialized');
    // Clean up expired codes every 5 minutes
    setInterval(() => this.cleanupExpiredCodes(), 5 * 60 * 1000);
  }

  /**
   * Store verification code for telegram username
   * In production, this would send a message via Telegram Bot API
   */
  async sendVerificationCode(telegramUsername: string, code: string): Promise<void> {
    const normalizedUsername = telegramUsername.toLowerCase().replace('@', '');
    
    this.pendingVerifications.set(normalizedUsername, {
      code,
      timestamp: Date.now(),
    });

    this.logger.log(`Verification code stored for @${normalizedUsername}: ${code}`);
    
    // TODO: In production, send actual Telegram message here
    // For now, we just log it and expect frontend to display it
    // or use a separate bot to send it
  }

  /**
   * Check if a telegram user has pending verification code
   * This can be called by a simple polling endpoint or webhook handler
   */
  async checkVerificationCode(telegramUsername: string): Promise<string | null> {
    const normalizedUsername = telegramUsername.toLowerCase().replace('@', '');
    const verification = this.pendingVerifications.get(normalizedUsername);

    if (!verification) {
      return null;
    }

    // Check if expired
    if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
      this.pendingVerifications.delete(normalizedUsername);
      return null;
    }

    return verification.code;
  }

  /**
   * Link telegram ID to customer account
   * This should be called after telegram bot receives /start command with code
   */
  async linkTelegramAccount(telegramId: number, telegramUsername: string, code: string): Promise<boolean> {
    const normalizedUsername = telegramUsername.toLowerCase().replace('@', '');
    const verification = this.pendingVerifications.get(normalizedUsername);

    if (!verification || verification.code !== code) {
      return false;
    }

    // Check if expired
    if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
      this.pendingVerifications.delete(normalizedUsername);
      return false;
    }

    // Find customer by telegram verification code and update
    const customer = await this.customerModel.findOne({
      telegramVerificationCode: code,
      telegramUsername: { $regex: new RegExp(`^@?${normalizedUsername}$`, 'i') },
    });

    if (!customer) {
      return false;
    }

    // Update customer with telegram ID
    customer.telegramId = telegramId;
    await customer.save();

    // Clear verification code
    this.pendingVerifications.delete(normalizedUsername);

    this.logger.log(`Telegram account linked: ${telegramId} -> ${customer.email}`);
    return true;
  }

  /**
   * Get pending verification info for display purposes
   */
  async getPendingVerification(telegramUsername: string): Promise<{ code: string; expiresIn: number } | null> {
    const normalizedUsername = telegramUsername.toLowerCase().replace('@', '');
    const verification = this.pendingVerifications.get(normalizedUsername);

    if (!verification) {
      return null;
    }

    const expiresIn = Math.max(0, this.EXPIRATION_TIME - (Date.now() - verification.timestamp));
    
    if (expiresIn === 0) {
      this.pendingVerifications.delete(normalizedUsername);
      return null;
    }

    return {
      code: verification.code,
      expiresIn: Math.floor(expiresIn / 1000), // in seconds
    };
  }

  private cleanupExpiredCodes(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [username, verification] of this.pendingVerifications.entries()) {
      if (now - verification.timestamp > this.EXPIRATION_TIME) {
        this.pendingVerifications.delete(username);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired verification codes`);
    }
  }
}
