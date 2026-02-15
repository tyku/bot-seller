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
   * Store verification code for phone number
   * In production, this would send a message via Telegram Bot API
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const normalizedPhone = phone.replace(/\s+/g, '');
    
    this.pendingVerifications.set(normalizedPhone, {
      code,
      timestamp: Date.now(),
    });

    this.logger.log(`Verification code stored for phone ${normalizedPhone}: ${code}`);
    
    // TODO: In production, send actual Telegram message here
    // For now, we just log it and expect frontend to display it
    // or use a separate bot to send it
  }

  /**
   * Check if a phone has pending verification code
   * This can be called by a simple polling endpoint or webhook handler
   */
  async checkVerificationCode(phone: string): Promise<string | null> {
    const normalizedPhone = phone.replace(/\s+/g, '');
    this.logger.log(`Checking verification code for phone ${normalizedPhone}`);
    
    const verification = this.pendingVerifications.get(normalizedPhone);

    if (!verification) {
      this.logger.warn(`No verification found for phone ${normalizedPhone}`);
      return null;
    }

    // Check if expired
    if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
      this.logger.warn(`Verification code expired for phone ${normalizedPhone}`);
      this.pendingVerifications.delete(normalizedPhone);
      return null;
    }

    this.logger.log(`Verification code found for phone ${normalizedPhone}`);
    return verification.code;
  }

  /**
   * Link telegram ID to customer account
   * This should be called after telegram bot receives /start command with code
   */
  async linkTelegramAccount(telegramId: number, phone: string, code: string): Promise<boolean> {
    this.logger.log(`Attempting to link Telegram account: ${telegramId} to phone ${phone}`);
    
    try {
      const normalizedPhone = phone.replace(/\s+/g, '');
      const verification = this.pendingVerifications.get(normalizedPhone);

      if (!verification || verification.code !== code) {
        this.logger.warn(`Invalid verification code for phone ${normalizedPhone}`);
        return false;
      }

      // Check if expired
      if (Date.now() - verification.timestamp > this.EXPIRATION_TIME) {
        this.logger.warn(`Verification code expired for phone ${normalizedPhone}`);
        this.pendingVerifications.delete(normalizedPhone);
        return false;
      }

      // Find customer by phone
      const customer = await this.customerModel.findOne({
        phone: normalizedPhone,
      });

      if (!customer) {
        this.logger.warn(`Customer not found for phone ${normalizedPhone}`);
        return false;
      }

      // Update customer with telegram ID
      customer.telegramId = telegramId;
      await customer.save();

      // Clear verification code
      this.pendingVerifications.delete(normalizedPhone);

      this.logger.log(`Telegram account linked successfully: ${telegramId} -> ${customer.email || customer.phone}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to link Telegram account ${telegramId}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Get pending verification info for display purposes
   */
  async getPendingVerification(phone: string): Promise<{ code: string; expiresIn: number } | null> {
    this.logger.log(`Getting pending verification for phone ${phone}`);
    
    const normalizedPhone = phone.replace(/\s+/g, '');
    const verification = this.pendingVerifications.get(normalizedPhone);

    if (!verification) {
      this.logger.log(`No pending verification for phone ${normalizedPhone}`);
      return null;
    }

    const expiresIn = Math.max(0, this.EXPIRATION_TIME - (Date.now() - verification.timestamp));
    
    if (expiresIn === 0) {
      this.logger.log(`Pending verification expired for phone ${normalizedPhone}`);
      this.pendingVerifications.delete(normalizedPhone);
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
