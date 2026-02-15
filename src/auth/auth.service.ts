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
import { VerificationType } from '../verification/schemas/verification.schema';

@Injectable()
export class AuthService {
  constructor(
    private customerService: CustomerService,
    private jwtService: JwtService,
    private verificationService: VerificationService,
  ) {}

  private mapVerificationMethodToType(method: 'email' | 'telegram' | 'sms'): VerificationType {
    const mapping = {
      email: VerificationType.EMAIL,
      telegram: VerificationType.TELEGRAM,
      sms: VerificationType.SMS,
    };
    return mapping[method];
  }

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

    // Generate and send verification code using new verification service
    const verificationType = this.mapVerificationMethodToType(registerDto.verificationMethod);
    
    const verification = await this.verificationService.sendVerification(customer.id, {
      email: registerDto.email,
      phone: registerDto.phone,
      telegramUsername: registerDto.telegramUsername,
      type: verificationType,
    });

    return {
      customerId: customer.customerId,
      email: customer.email,
      phone: customer.phone,
      verificationMethod: registerDto.verificationMethod,
      verificationId: verification.id,
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
    const contact = verifyCodeDto.email || verifyCodeDto.phone;

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
      throw new BadRequestException('Customer not found');
    }

    // Verify code using new verification service
    const verificationType = this.mapVerificationMethodToType(verifyCodeDto.method);
    const result = await this.verificationService.verifyCode(
      contact,
      verifyCodeDto.code,
      verificationType,
    );

    if (!result.verified) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Update customer status to verified
    await this.customerService.updateCustomer(customer._id.toString(), {
      status: CustomerStatus.VERIFIED,
    });

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
    const verificationType = this.mapVerificationMethodToType(method);

    // Send verification using new service
    const verification = await this.verificationService.sendVerification(customerId, {
      email: customer.email,
      phone: customer.phone,
      telegramUsername: customer.telegramUsername,
      type: verificationType,
    });

    return {
      verificationId: verification.id,
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
