import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmService } from './llm.service';
import { LlmRateLimitService } from './llm-rate-limit.service';

@Module({
  imports: [ConfigModule, CustomerSettingsModule, ConversationsModule],
  providers: [LlmService, LlmRateLimitService],
  exports: [LlmService, LlmRateLimitService],
})
export class LlmModule {}
