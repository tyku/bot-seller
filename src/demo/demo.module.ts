import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSettingsDraft.name, schema: CustomerSettingsDraftSchema },
    ]),
    CustomerSettingsModule,
    CustomerTariffsModule,
    ConversationsModule,
    LlmModule,
  ],
  controllers: [DemoController],
  providers: [DemoDraftRepository, DemoRateLimitService, DemoDraftService],
  exports: [DemoDraftService],
})
export class DemoModule {}
