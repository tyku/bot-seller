import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NormalizedPrompt,
  NormalizedPromptSchema,
} from './schemas/normalized-prompt.schema';
import { NormalizedPromptRepository } from './normalized-prompt.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NormalizedPrompt.name, schema: NormalizedPromptSchema },
    ]),
  ],
  providers: [NormalizedPromptRepository],
  exports: [NormalizedPromptRepository],
})
export class NormalizedPromptModule {}
