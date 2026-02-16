import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CustomerService } from '../customer/customer.service';
import { RegisterEmailDto, RegisterTelegramDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { VerificationService } from '../verification/verification.service';
import { CustomerStatus } from '../customer/schemas/customer.schema';
import { VerificationType } from '../verification/schemas/verification.schema';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private customerService: CustomerService,
    private jwtService: JwtService,
    private verificationService: VerificationService,
    private configService: ConfigService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Регистрация через Email (только email, без имени)
   */
  async registerEmail(registerDto: RegisterEmailDto) {
    this.logger.log(`Email registration attempt for: ${registerDto.email}`);
    
    try {
      const existingByEmail = await this.customerService.findByEmail(registerDto.email);
      if (existingByEmail) {
        this.logger.warn(`Registration failed: Email ${registerDto.email} already exists`);
        throw new ConflictException('User with this email already exists');
      }

      this.logger.log('Creating new customer...');
      const customer = await this.customerService.create({
        email: registerDto.email,
      });
      this.logger.log(`Customer created successfully: ${customer.customerId}`);

      this.logger.log(`Sending verification code via email`);
      const verification = await this.verificationService.sendVerification(customer.id, {
        email: registerDto.email,
        type: VerificationType.EMAIL,
      });
      this.logger.log(`Verification code sent successfully. Verification ID: ${verification.id}`);

      return {
        customerId: customer.customerId,
        email: customer.email,
        verificationMethod: 'email',
        verificationId: verification.id,
        message: 'Verification code sent via email',
      };
    } catch (error) {
      this.logger.error(`Email registration error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Регистрация через Telegram (только phone)
   * Создает customer, отправляет код, возвращает ссылку на бота
   */
  async registerTelegram(registerDto: RegisterTelegramDto) {
    this.logger.log(`Telegram registration attempt for phone: ${registerDto.phone}`);
    
    try {
      const existingByPhone = await this.customerService.findByPhone(registerDto.phone);
      if (existingByPhone) {
        this.logger.warn(`Registration failed: Phone ${registerDto.phone} already exists`);
        throw new ConflictException('User with this phone already exists');
      }

      this.logger.log('Creating new customer...');
      const customer = await this.customerService.create({
        phone: registerDto.phone,
      });
      this.logger.log(`Customer created successfully: ${customer.customerId}`);

      this.logger.log(`Sending verification code via Telegram`);
      const verification = await this.verificationService.sendVerification(customer.id, {
        phone: registerDto.phone,
        type: VerificationType.TELEGRAM,
      });
      this.logger.log(`Verification code sent successfully. Verification ID: ${verification.id}`);

      const botUsername = this.configService.get<string>('telegram.botUsername');

      return {
        customerId: customer.customerId,
        phone: customer.phone,
        verificationMethod: 'telegram',
        verificationId: verification.id,
        botUsername,
        telegramLink: `https://t.me/${botUsername}`,
        message: 'Verification code sent via Telegram',
      };
    } catch (error) {
      this.logger.error(`Telegram registration error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Login - теперь просто отправляет код верификации (без пароля)
   */
  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email || 'N/A'}, phone: ${loginDto.phone || 'N/A'}`);
    
    try {
      // Validate that at least one contact method is provided
      if (!loginDto.email && !loginDto.phone) {
        throw new BadRequestException('Email or phone must be provided');
      }

      let customer;
      let verificationType: VerificationType;
      let contactInfo: { email?: string; phone?: string };
      
      // Find customer by email or phone
      if (loginDto.email) {
        customer = await this.customerService.findByEmail(loginDto.email);
        verificationType = VerificationType.EMAIL;
        contactInfo = { email: loginDto.email };
      } else {
        // phone is guaranteed to exist here due to validation above
        customer = await this.customerService.findByPhone(loginDto.phone!);
        verificationType = VerificationType.TELEGRAM;
        contactInfo = { phone: loginDto.phone! };
      }
      
      if (!customer) {
        this.logger.warn(`Login failed: Customer not found`);
        throw new UnauthorizedException('User not found');
      }

      if (customer.status !== CustomerStatus.VERIFIED) {
        this.logger.warn(`Login failed: Customer ${customer.customerId} not verified`);
        throw new UnauthorizedException('Please verify your account first');
      }

      // Send verification code for login
      this.logger.log(`Sending login verification code for customer ${customer.customerId}`);
      const verification = await this.verificationService.sendVerification(customer._id.toString(), {
        ...contactInfo,
        type: verificationType,
      });

      this.logger.log(`Login verification code sent successfully`);
      return {
        customerId: customer.customerId,
        verificationId: verification.id,
        message: 'Verification code sent',
        ...(loginDto.email ? { email: loginDto.email } : { phone: loginDto.phone }),
      };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify code - для регистрации и логина
   */
  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const contact = verifyCodeDto.email || verifyCodeDto.phone;
    this.logger.log(`Verification attempt for contact: ${contact}, method: ${verifyCodeDto.method}`);
    
    try {
      let customer;

      if (!contact) {
        throw new BadRequestException('Email or phone must be provided');
      }

      // Find customer by email or phone
      if (verifyCodeDto.email) {
        customer = await this.customerService.findByEmail(verifyCodeDto.email);
      } else if (verifyCodeDto.phone) {
        customer = await this.customerService.findByPhone(verifyCodeDto.phone);
      }
      
      if (!customer) {
        this.logger.warn(`Verification failed: Customer not found for contact ${contact}`);
        throw new BadRequestException('Customer not found');
      }

      // Verify code using new verification service
      const verificationType = verifyCodeDto.method === 'email' ? VerificationType.EMAIL : VerificationType.TELEGRAM;
      this.logger.log(`Verifying code for customer ${customer.customerId}`);
      const result = await this.verificationService.verifyCode(
        contact,
        verifyCodeDto.code,
        verificationType,
      );

      if (!result.verified) {
        this.logger.warn(`Verification failed: Invalid code for customer ${customer.customerId}`);
        throw new BadRequestException('Invalid or expired verification code');
      }

      // Update customer status to verified if not already
      if (customer.status !== CustomerStatus.VERIFIED) {
        this.logger.log(`Updating customer ${customer.customerId} status to VERIFIED`);
        await this.customerService.updateCustomer(customer._id.toString(), {
          status: CustomerStatus.VERIFIED,
        });
      }

      this.logger.log(`Verification successful for customer ${customer.customerId}`);
      // Generate and return JWT token
      return this.generateToken(customer);
    } catch (error) {
      this.logger.error(`Verification error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(identifier: string, method: 'email' | 'telegram') {
    this.logger.log(`Resend verification code attempt for identifier: ${identifier}, method: ${method}`);
    
    try {
      // Try to find customer by email or phone
      let customer = await this.customerService.findByEmail(identifier);
      if (!customer) {
        customer = await this.customerService.findByPhone(identifier);
      }
      
      if (!customer) {
        this.logger.warn(`Resend failed: Customer not found for identifier ${identifier}`);
        throw new BadRequestException('Customer not found');
      }

      const customerId = customer._id.toString();
      const verificationType = method === 'email' ? VerificationType.EMAIL : VerificationType.TELEGRAM;

      // Send verification using new service
      this.logger.log(`Resending verification code for customer ${customer.customerId} via ${method}`);
      const verification = await this.verificationService.sendVerification(customerId, {
        email: customer.email,
        phone: customer.phone,
        type: verificationType,
      });

      this.logger.log(`Verification code resent successfully. Verification ID: ${verification.id}`);
      return {
        verificationId: verification.id,
        message: `Verification code resent via ${method}`,
      };
    } catch (error) {
      this.logger.error(`Resend verification error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateToken(customer: any) {
    const payload: JwtPayload = {
      sub: customer._id.toString(),
      customerId: customer.customerId,
      email: customer.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '24h',
      customer: {
        customerId: customer.customerId,
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
      },
    };
  }
}
