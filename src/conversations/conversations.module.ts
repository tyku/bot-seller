import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { ConversationsRepository } from './conversations.repository';
import { ConversationsService } from './conversations.service';
import { ConversationReplyService } from './conversation-reply.service';
import { ConversationHandoffService } from './conversation-handoff.service';
import { ConversationsController } from './conversations.controller';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    CustomerSettingsModule,
    LlmModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsRepository,
    ConversationsService,
    ConversationReplyService,
    ConversationHandoffService,
  ],
  exports: [
    ConversationsService,
    ConversationsRepository,
    ConversationReplyService,
    ConversationHandoffService,
  ],
})
export class ConversationsModule {}
