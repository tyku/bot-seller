import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import type { SendVerificationDto } from './dto/send-verification.dto';
import { SendVerificationSchema } from './dto/send-verification.dto';
import type { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeSchema } from './dto/verify-code.dto';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('verifications')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendVerification(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(SendVerificationSchema)) dto: SendVerificationDto,
  ) {
    const verification = await this.verificationService.sendVerification(user._id, dto);
    return {
      success: true,
      data: verification,
      message: `Verification code sent via ${dto.type}`,
    };
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyCodeSchema))
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const contact = dto.email || dto.phone || '';
    const result = await this.verificationService.verifyCode(contact, dto.code, dto.type);

    if (!result.verified) {
      return {
        success: false,
        message: 'Invalid or expired verification code',
      };
    }

    return {
      success: true,
      data: { verificationId: result.verificationId },
      message: 'Verification successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @HttpCode(HttpStatus.OK)
  async getMyVerifications(@CurrentUser() user: CurrentUserData) {
    const verifications = await this.verificationService.getVerificationsByCustomer(user._id);
    return {
      success: true,
      data: verifications,
      message: 'Verifications retrieved successfully',
    };
  }
}
