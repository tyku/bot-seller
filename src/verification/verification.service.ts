import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { TelegramService } from '../telegram/telegram.service';
import { VerificationRepository } from './verification.repository';
import { VerificationType, VerificationStatus } from './schemas/verification.schema';
import { SendVerificationDto } from './dto/send-verification.dto';
import { ResponseVerificationDto } from './dto/response-verification.dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private resend: Resend | null = null;
  private readonly VERIFICATION_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('resend.apiKey');
console.log("=============================", apiKey)
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client configured successfully');
    } else {
      this.logger.warn('RESEND_API_KEY not set - email verification will not work');
    }
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerification(
    customerId: string,
    dto: SendVerificationDto,
  ): Promise<ResponseVerificationDto> {
    this.logger.log(`Sending verification for customer ${customerId}, type: ${dto.type}`);
    
    try {
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
        this.logger.log(`Sending email verification to ${dto.email}`);
        await this.sendEmailCode(dto.email, code);
      } else if (dto.type === VerificationType.SMS && dto.phone) {
        contact = dto.phone;
        this.logger.log(`Sending SMS verification to ${dto.phone}`);
        await this.sendSmsCode(dto.phone, code);
      } else if (dto.type === VerificationType.TELEGRAM && dto.phone) {
        contact = dto.phone;
        this.logger.log(`Sending Telegram verification to ${dto.phone}`);
        await this.sendTelegramCode(dto.phone, code);
      } else {
        this.logger.error(`Invalid verification type ${dto.type} or missing contact information`);
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

      this.logger.log(`Verification created successfully with ID: ${verification._id}`);
      return this.mapToResponseDto(verification);
    } catch (error) {
      this.logger.error(`Failed to send verification: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async sendEmailCode(email: string, code: string): Promise<void> {
    if (!this.resend) {
      this.logger.error('Resend client not configured - cannot send email');
      throw new BadRequestException('Email verification is not configured. Please use another verification method.');
    }

    try {
      this.logger.log(`Attempting to send email to ${email}`);
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('resend.from') || 'onboarding@resend.dev',
        to: [email],
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in ${this.VERIFICATION_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });

      if (error) {
        this.logger.error(`Resend API error for ${email}: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Email sent successfully to ${email}, id: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  private async sendSmsCode(phone: string, code: string): Promise<void> {
    // TODO: Implement SMS sending via third-party service (Twilio, AWS SNS, etc.)
    this.logger.warn(`SMS verification not implemented - code ${code} for ${phone}`);
    throw new BadRequestException('SMS verification is not implemented yet');
  }

  private async sendTelegramCode(username: string, code: string): Promise<void> {
    try {
      this.logger.log(`Sending Telegram verification to ${username}`);
      await this.telegramService.sendVerificationCode(username, code);
      this.logger.log(`Telegram verification sent successfully to ${username}`);
    } catch (error) {
      this.logger.error(`Failed to send Telegram verification to ${username}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send Telegram verification code');
    }
  }

  async verifyCode(
    contact: string,
    code: string,
    type: VerificationType,
  ): Promise<{ verified: boolean; verificationId?: string }> {
    this.logger.log(`Verifying code for contact: ${contact}, type: ${type}`);
    
    try {
      // Find active verification by contact and type
      const verification = await this.verificationRepository.findActiveByContact(contact, type);

      if (!verification) {
        this.logger.warn(`No active verification found for contact ${contact}, type ${type}`);
        return { verified: false };
      }

      // Check if too many attempts
      if (verification.attempts >= this.MAX_ATTEMPTS) {
        this.logger.warn(`Too many attempts for verification ${verification._id}`);
        await this.verificationRepository.markAsFailed(verification._id.toString());
        throw new BadRequestException('Too many verification attempts. Please request a new code.');
      }

      // Increment attempts
      await this.verificationRepository.incrementAttempts(verification._id.toString());

      // Check if code matches
      if (verification.code !== code) {
        this.logger.warn(`Invalid code provided for verification ${verification._id}`);
        return { verified: false };
      }

      // Mark as verified
      await this.verificationRepository.markAsVerified(verification._id.toString());
      this.logger.log(`Code verified successfully for verification ${verification._id}`);

      return {
        verified: true,
        verificationId: verification._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Verify code error: ${error.message}`, error.stack);
      throw error;
    }
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
