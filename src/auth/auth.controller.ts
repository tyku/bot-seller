import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterEmailDto, RegisterTelegramDto } from './dto/register.dto';
import { RegisterEmailSchema, RegisterTelegramSchema } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { LoginSchema } from './dto/login.dto';
import type { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeSchema } from './dto/verify-code.dto';
import type { EnterDto } from './dto/enter.dto';
import { EnterSchema } from './dto/enter.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('enter')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(EnterSchema))
  async enter(@Body() enterDto: EnterDto) {
    this.logger.log('POST /auth/enter - Enter request received');
    const result = await this.authService.enter(enterDto.contact);
    this.logger.log('POST /auth/enter - Verification code sent');
    return {
      success: true,
      data: result,
      message: 'Verification code sent',
    };
  }

  @Public()
  @Post('register/email')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterEmailSchema))
  async registerEmail(@Body() registerDto: RegisterEmailDto) {
    this.logger.log('POST /auth/register/email - Email registration request received');
    const result = await this.authService.registerEmail(registerDto);
    this.logger.log('POST /auth/register/email - Registration successful');
    return {
      success: true,
      data: result,
      message: 'Registration successful. Please check your email for verification code.',
    };
  }

  @Public()
  @Post('register/telegram')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterTelegramSchema))
  async registerTelegram(@Body() registerDto: RegisterTelegramDto) {
    this.logger.log('POST /auth/register/telegram - Telegram registration request received');
    const result = await this.authService.registerTelegram(registerDto);
    this.logger.log('POST /auth/register/telegram - Registration successful');
    return {
      success: true,
      data: result,
      message: 'Registration successful. Please check Telegram for verification code.',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() loginDto: LoginDto) {
    this.logger.log('POST /auth/login - Login request received');
    const result = await this.authService.login(loginDto);
    this.logger.log('POST /auth/login - Verification code sent');
    return {
      success: true,
      data: result,
      message: 'Verification code sent. Please check your email or phone.',
    };
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyCodeSchema))
  async verify(@Body() verifyCodeDto: VerifyCodeDto) {
    this.logger.log('POST /auth/verify - Verification request received');
    const result = await this.authService.verifyCode(verifyCodeDto);
    this.logger.log('POST /auth/verify - Verification successful');
    return {
      success: true,
      data: result,
      message: 'Verification successful',
    };
  }

  @Public()
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  async resendCode(@Body() body: { identifier: string; method: 'email' | 'telegram' }) {
    this.logger.log('POST /auth/resend-code - Resend code request received');
    const result = await this.authService.resendVerificationCode(body.identifier, body.method);
    this.logger.log('POST /auth/resend-code - Code resent successfully');
    return {
      success: true,
      data: result,
      message: 'Verification code resent successfully',
    };
  }
}
