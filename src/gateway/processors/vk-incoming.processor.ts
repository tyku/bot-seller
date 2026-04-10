import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CustomerSettingsRepository } from '../../customer-settings/customer-settings.repository';
import { CustomerSettingsService } from '../../customer-settings/customer-settings.service';
import { UserService } from '../../user/user.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { ConversationReplyService } from '../../conversations/conversation-reply.service';
import {
  ConversationControlMode,
  ConversationPlatform,
} from '../../conversations/schemas/conversation.schema';
import { SourceType } from '../../user/schemas/user.schema';
import { LlmRateLimitService } from '../../llm/llm-rate-limit.service';
import { TariffUsageService } from '../../tariff-usage/tariff-usage.service';
import { VK_INCOMING_QUEUE } from '../constants';
import type { VkIncomingJob } from '../interfaces/vk-update.interface';
import { sendVkMessage } from '../../common/vk-api';

const LIMITS_MESSAGE = 'Лимиты закончились.';

@Processor(VK_INCOMING_QUEUE)
export class VkIncomingProcessor extends WorkerHost {
  private readonly logger = new Logger(VkIncomingProcessor.name);

  constructor(
    private readonly settingsRepository: CustomerSettingsRepository,
    private readonly customerSettingsService: CustomerSettingsService,
    private readonly userService: UserService,
    private readonly conversationsService: ConversationsService,
    private readonly conversationReplyService: ConversationReplyService,
    private readonly llmRateLimit: LlmRateLimitService,
    private readonly tariffUsageService: TariffUsageService,
  ) {
    super();
  }

  async process(job: Job<VkIncomingJob>): Promise<void> {
    const { botId, customerId, update, updateId } = job.data;

    const settings = await this.settingsRepository.findById(botId);
    if (!settings) {
      this.logger.warn(`Bot ${botId} not found in DB, cannot reply`);
      return;
    }

    if (update.type !== 'message_new' || !update.object?.message) {
      return;
    }

    const message = update.object.message;
    const fromId = String(message.from_id);
    const chatId = fromId;
    const userText = (message.text ?? '').trim();
    const customerIdNum = Number(customerId);

    this.logger.log(`Processing VK update ${updateId} for bot ${botId} chat ${chatId}`);

    await this.userService.upsertByExternalId(SourceType.VK, fromId, {
      chatId,
    }).catch((err) => this.logger.warn(`Failed to upsert VK user ${fromId}: ${err?.message ?? err}`));

    const { systemPrompt, normalizedPromptVersion } =
      await this.customerSettingsService.resolvePromptContext(settings);

    if (userText !== '') {
      await this.conversationsService.addUserMessage(
        ConversationPlatform.VK,
        chatId,
        botId,
        userText,
        {
          normalizedPromptVersion,
          customerId: !Number.isNaN(customerIdNum) ? customerIdNum : undefined,
        },
      );
    }

    const controlMode = await this.conversationsService.getControlMode(
      ConversationPlatform.VK,
      chatId,
      botId,
    );
    if (controlMode === ConversationControlMode.OPERATOR) {
      return;
    }

    const hasContext = userText !== '';
    if (hasContext && !Number.isNaN(customerIdNum)) {
      const requestResult =
        await this.tariffUsageService.tryConsumeRequest(customerIdNum);
      if (!requestResult.allowed) {
        await sendVkMessage(settings.token, message.from_id, LIMITS_MESSAGE);
        return;
      }
    }

    const rateLimit = await this.llmRateLimit.checkAndConsume(botId);
    if (!rateLimit.allowed) {
      await sendVkMessage(
        settings.token,
        message.from_id,
        rateLimit.message ??
          'Оператор работает над вашим запросом, ожидайте обработки.',
      );
      return;
    }

    const { reply: llmReply } =
      await this.conversationReplyService.replyInContext(
        botId,
        ConversationPlatform.VK,
        chatId,
        systemPrompt,
      );

    if (llmReply.trim() !== '') {
      await this.conversationsService.addAssistantMessage(
        ConversationPlatform.VK,
        chatId,
        botId,
        llmReply,
      );
      await sendVkMessage(settings.token, message.from_id, llmReply);
    }

    if (!Number.isNaN(customerIdNum)) {
      await this.tariffUsageService
        .checkAndSend75Notification(customerIdNum)
        .catch((err) =>
          this.logger.warn(`75% notification check failed: ${err?.message}`),
        );
    }
  }
}

