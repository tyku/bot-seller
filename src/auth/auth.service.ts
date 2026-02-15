import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerService } from '../customer/customer.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './strategies/jwt.strategy';
import { VerificationService } from '../verification/verification.service';
import { CustomerStatus } from '../customer/schemas/customer.schema';

@Injectable()
export class AuthService {
  constructor(
    private customerService: CustomerService,
    private jwtService: JwtService,
    private verificationService: VerificationService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists by email or phone
    if (registerDto.email) {
      const existingByEmail = await this.customerService.findByEmail(registerDto.email);
      if (existingByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (registerDto.phone) {
      const existingByPhone = await this.customerService.findByPhone(registerDto.phone);
      if (existingByPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create customer
    const customer = await this.customerService.create({
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      passwordHash,
      telegramUsername: registerDto.telegramUsername,
    });

    // Generate and send verification code
    const identifier = registerDto.email || registerDto.phone || '';
    
    if (registerDto.verificationMethod === 'email') {
      if (!registerDto.email) {
        throw new BadRequestException('Email is required for email verification');
      }
      await this.verificationService.sendEmailVerification(registerDto.email, customer.id);
    } else if (registerDto.verificationMethod === 'sms') {
      if (!registerDto.phone) {
        throw new BadRequestException('Phone is required for SMS verification');
      }
      // TODO: Implement SMS verification
      throw new BadRequestException('SMS verification is not implemented yet');
    } else if (registerDto.verificationMethod === 'telegram') {
      if (!registerDto.telegramUsername) {
        throw new BadRequestException('Telegram username is required for telegram verification');
      }
      if (!identifier) {
        throw new BadRequestException('Email or phone is required for telegram verification');
      }
      await this.verificationService.sendTelegramVerification(identifier, registerDto.telegramUsername);
    }

    return {
      customerId: customer.customerId,
      email: customer.email,
      phone: customer.phone,
      verificationMethod: registerDto.verificationMethod,
      message: `Verification code sent via ${registerDto.verificationMethod}`,
    };
  }

  async login(loginDto: LoginDto) {
    let customer;
    
    // Find customer by email or phone
    if (loginDto.email) {
      customer = await this.customerService.findByEmail(loginDto.email);
    } else if (loginDto.phone) {
      customer = await this.customerService.findByPhone(loginDto.phone);
    }
    
    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, customer.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (customer.status !== CustomerStatus.VERIFIED) {
      throw new UnauthorizedException('Please verify your account first');
    }

    return this.generateToken(customer);
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    let customer;
    const identifier = verifyCodeDto.email || verifyCodeDto.phone;

    if (!identifier) {
      throw new BadRequestException('Email or phone must be provided');
    }

    // Find customer by email or phone
    if (verifyCodeDto.email) {
      customer = await this.customerService.findByEmail(verifyCodeDto.email);
    } else if (verifyCodeDto.phone) {
      customer = await this.customerService.findByPhone(verifyCodeDto.phone);
    }
    
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const isValid = await this.verificationService.verifyCode(
      identifier,
      verifyCodeDto.code,
      verifyCodeDto.method,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Update customer verification status
    const updateData: any = {
      status: CustomerStatus.VERIFIED,
    };

    if (verifyCodeDto.method === 'email') {
      updateData.emailVerified = true;
      updateData.emailVerificationCode = null;
      updateData.emailVerificationExpires = null;
    } else if (verifyCodeDto.method === 'sms') {
      updateData.phoneVerified = true;
      updateData.phoneVerificationCode = null;
      updateData.phoneVerificationExpires = null;
    } else if (verifyCodeDto.method === 'telegram') {
      updateData.telegramVerified = true;
      updateData.telegramVerificationCode = null;
      updateData.telegramVerificationExpires = null;
    }

    await this.customerService.updateCustomer(customer._id.toString(), updateData);

    // Generate and return JWT token
    return this.generateToken(customer);
  }

  async resendVerificationCode(identifier: string, method: 'email' | 'telegram' | 'sms') {
    // Try to find customer by email or phone
    let customer = await this.customerService.findByEmail(identifier);
    if (!customer) {
      customer = await this.customerService.findByPhone(identifier);
    }
    
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.status === CustomerStatus.VERIFIED) {
      throw new BadRequestException('Customer already verified');
    }

    const customerId = customer._id.toString();

    if (method === 'email') {
      if (!customer.email) {
        throw new BadRequestException('Email not set for this customer');
      }
      await this.verificationService.sendEmailVerification(customer.email, customerId);
    } else if (method === 'sms') {
      if (!customer.phone) {
        throw new BadRequestException('Phone not set for this customer');
      }
      // TODO: Implement SMS verification
      throw new BadRequestException('SMS verification is not implemented yet');
    } else if (method === 'telegram') {
      if (!customer.telegramUsername) {
        throw new BadRequestException('Telegram username not set');
      }
      await this.verificationService.sendTelegramVerification(identifier, customer.telegramUsername);
    }

    return {
      message: `Verification code resent via ${method}`,
    };
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
        name: customer.name,
      },
    };
  }
}
