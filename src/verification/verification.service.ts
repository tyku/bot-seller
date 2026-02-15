import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customer/schemas/customer.schema';
import * as nodemailer from 'nodemailer';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class VerificationService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private telegramService: TelegramService,
  ) {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendEmailVerification(identifier: string, customerId?: string): Promise<void> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

    // Save code to database - find by email or customerId
    const query = customerId 
      ? { _id: customerId }
      : { email: identifier };

    await this.customerModel.updateOne(
      query,
      {
        emailVerificationCode: code,
        emailVerificationExpires: expiresAt,
      },
    );

    // Send email
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bot-seller.com',
        to: identifier,
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendTelegramVerification(email: string, telegramUsername: string): Promise<void> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

    // Save code to database
    await this.customerModel.updateOne(
      { email },
      {
        telegramVerificationCode: code,
        telegramVerificationExpires: expiresAt,
      },
    );

    // Send to Telegram service for notification
    await this.telegramService.sendVerificationCode(telegramUsername, code);
  }

  async verifyCode(identifier: string, code: string, method: 'email' | 'telegram' | 'sms'): Promise<boolean> {
    // Find customer by email or phone
    const customer = await this.customerModel.findOne({
      $or: [
        { email: identifier },
        { phone: identifier }
      ]
    });

    if (!customer) {
      return false;
    }

    if (method === 'email') {
      if (
        customer.emailVerificationCode === code &&
        customer.emailVerificationExpires &&
        customer.emailVerificationExpires > new Date()
      ) {
        return true;
      }
    } else if (method === 'sms') {
      // TODO: Implement SMS verification code check
      return false;
    } else if (method === 'telegram') {
      if (
        customer.telegramVerificationCode === code &&
        customer.telegramVerificationExpires &&
        customer.telegramVerificationExpires > new Date()
      ) {
        return true;
      }
    }

    return false;
  }
}
