import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LlmService } from './llm.service';
import { LlmRateLimitService } from './llm-rate-limit.service';
import { SystemPromptService } from './system-prompt.service';
import { SystemPromptRepository } from './system-prompt.repository';
import { SystemPromptController } from './system-prompt.controller';
import {
  SystemPrompt,
  SystemPromptSchema,
} from './schemas/system-prompt.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: SystemPrompt.name, schema: SystemPromptSchema },
    ]),
  ],
  controllers: [SystemPromptController],
  providers: [
    LlmService,
    LlmRateLimitService,
    SystemPromptService,
    SystemPromptRepository,
  ],
  exports: [LlmService, LlmRateLimitService, SystemPromptService],
})
export class LlmModule {}
