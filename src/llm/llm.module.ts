import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { LlmRateLimitService } from './llm-rate-limit.service';

@Module({
  imports: [ConfigModule],
  providers: [LlmService, LlmRateLimitService],
  exports: [LlmService, LlmRateLimitService],
})
export class LlmModule {}
