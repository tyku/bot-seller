import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { CustomerTariffsModule } from '../customer-tariffs/customer-tariffs.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import {
  CustomerSettingsDraft,
  CustomerSettingsDraftSchema,
} from './schemas/customer-settings-draft.schema';
import { DemoDraftRepository } from './demo-draft.repository';
import { DemoRateLimitService } from './demo-rate-limit.service';
import { DemoDraftService } from './demo-draft.service';
import { DemoController } from './demo.controller';
import { DEMO_GENERATE_PROMPT_QUEUE } from './constants/demo-generate-prompt.constants';
import { DemoGeneratePromptProcessor } from './processors/demo-generate-prompt.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSettingsDraft.name, schema: CustomerSettingsDraftSchema },
    ]),
    BullModule.registerQueue({ name: DEMO_GENERATE_PROMPT_QUEUE }),
    CustomerSettingsModule,
    CustomerTariffsModule,
    ConversationsModule,
    LlmModule,
  ],
  controllers: [DemoController],
  providers: [
    DemoDraftRepository,
    DemoRateLimitService,
    DemoDraftService,
    DemoGeneratePromptProcessor,
  ],
  exports: [DemoDraftService],
})
export class DemoModule {}
