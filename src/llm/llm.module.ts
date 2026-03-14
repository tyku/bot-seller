import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LlmService } from './llm.service';
import { LlmRateLimitService } from './llm-rate-limit.service';
import { SystemPromptService } from './system-prompt.service';
import { SystemPromptRepository } from './system-prompt.repository';
import {
  SystemPrompt,
  SystemPromptSchema,
} from './schemas/system-prompt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemPrompt.name, schema: SystemPromptSchema },
    ]),
  ],
  providers: [
    LlmService,
    LlmRateLimitService,
    SystemPromptService,
    SystemPromptRepository,
  ],
  exports: [LlmService, LlmRateLimitService, SystemPromptService],
})
export class LlmModule {}
