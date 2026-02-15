import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';
import { RegisterSchema } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { LoginSchema } from './dto/login.dto';
import type { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeSchema } from './dto/verify-code.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: 'Registration successful. Please verify your account.',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      data: result,
      message: 'Login successful',
    };
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyCodeSchema))
  async verify(@Body() verifyCodeDto: VerifyCodeDto) {
    const result = await this.authService.verifyCode(verifyCodeDto);
    return {
      success: true,
      data: result,
      message: 'Verification successful',
    };
  }

  @Public()
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  async resendCode(@Body() body: { email: string; method: 'email' | 'telegram' }) {
    const result = await this.authService.resendVerificationCode(body.email, body.method);
    return {
      success: true,
      data: result,
      message: 'Verification code resent successfully',
    };
  }
}
