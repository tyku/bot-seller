import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { TelegramService } from '../telegram/telegram.service';
import { VerificationRepository } from './verification.repository';
import { VerificationType, VerificationStatus } from './schemas/verification.schema';
import { SendVerificationDto } from './dto/send-verification.dto';
import { ResponseVerificationDto } from './dto/response-verification.dto';

@Injectable()
export class VerificationService {
  private transporter: nodemailer.Transporter;
  private readonly VERIFICATION_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly telegramService: TelegramService,
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

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerification(
    customerId: string,
    dto: SendVerificationDto,
  ): Promise<ResponseVerificationDto> {
    // Invalidate all previous pending verifications of this type
    await this.verificationRepository.invalidateAllByCustomerAndType(
      customerId,
      dto.type,
    );

    const code = this.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.VERIFICATION_EXPIRY_MINUTES);

    let contact: string;

    // Determine contact based on type
    if (dto.type === VerificationType.EMAIL && dto.email) {
      contact = dto.email;
      await this.sendEmailCode(dto.email, code);
    } else if (dto.type === VerificationType.SMS && dto.phone) {
      contact = dto.phone;
      await this.sendSmsCode(dto.phone, code);
    } else if (dto.type === VerificationType.TELEGRAM && dto.telegramUsername) {
      contact = dto.telegramUsername;
      await this.sendTelegramCode(dto.telegramUsername, code);
    } else {
      throw new BadRequestException('Invalid verification type or missing contact information');
    }

    // Save verification to database
    const verification = await this.verificationRepository.create({
      customerId,
      type: dto.type,
      code,
      expiresAt,
      contact,
    });

    return this.mapToResponseDto(verification);
  }

  private async sendEmailCode(email: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bot-seller.com',
        to: email,
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in ${this.VERIFICATION_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  private async sendSmsCode(phone: string, code: string): Promise<void> {
    // TODO: Implement SMS sending via third-party service (Twilio, AWS SNS, etc.)
    console.log(`SMS code ${code} would be sent to ${phone}`);
    throw new BadRequestException('SMS verification is not implemented yet');
  }

  private async sendTelegramCode(username: string, code: string): Promise<void> {
    try {
      await this.telegramService.sendVerificationCode(username, code);
    } catch (error) {
      console.error('Failed to send Telegram verification:', error);
      throw new BadRequestException('Failed to send Telegram verification code');
    }
  }

  async verifyCode(
    contact: string,
    code: string,
    type: VerificationType,
  ): Promise<{ verified: boolean; verificationId?: string }> {
    // Find active verification by contact and type
    const verification = await this.verificationRepository.findActiveByContact(contact, type);

    if (!verification) {
      return { verified: false };
    }

    // Check if too many attempts
    if (verification.attempts >= this.MAX_ATTEMPTS) {
      await this.verificationRepository.markAsFailed(verification._id.toString());
      throw new BadRequestException('Too many verification attempts. Please request a new code.');
    }

    // Increment attempts
    await this.verificationRepository.incrementAttempts(verification._id.toString());

    // Check if code matches
    if (verification.code !== code) {
      return { verified: false };
    }

    // Mark as verified
    await this.verificationRepository.markAsVerified(verification._id.toString());

    return {
      verified: true,
      verificationId: verification._id.toString(),
    };
  }

  async getVerificationsByCustomer(customerId: string): Promise<ResponseVerificationDto[]> {
    const verifications = await this.verificationRepository.findAllByCustomer(customerId);
    return verifications.map(v => this.mapToResponseDto(v));
  }

  async expireOldVerifications(): Promise<void> {
    await this.verificationRepository.expireOldVerifications();
  }

  async cleanupOldVerifications(daysOld: number = 30): Promise<void> {
    await this.verificationRepository.deleteOldVerifications(daysOld);
  }

  private mapToResponseDto(verification: any): ResponseVerificationDto {
    return new ResponseVerificationDto({
      id: verification._id.toString(),
      customerId: verification.customerId.toString(),
      type: verification.type,
      status: verification.status,
      contact: verification.contact,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      attempts: verification.attempts,
      createdAt: verification.createdAt,
    });
  }
}
