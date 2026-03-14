import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsModule } from '../conversations/conversations.module';
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
    forwardRef(() => ConversationsModule),
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
