import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { ConversationReplyService } from './conversation-reply.service';
import { CustomerSettingsRepository } from '../customer-settings/customer-settings.repository';
import { CustomerSettingsService } from '../customer-settings/customer-settings.service';
import { ConversationPlatform } from './schemas/conversation.schema';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { DebugSendSchema, type DebugSendDto } from './dto/debug-send.dto';

@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationReplyService: ConversationReplyService,
    private readonly customerSettingsRepository: CustomerSettingsRepository,
    private readonly customerSettingsService: CustomerSettingsService,
  ) {}

  /**
   * Отправить сообщение в тестовый диалог и получить ответ бота (для отладки сценария).
   * Лимиты тарифа не списываются. Диалог хранится с type=test, chatId=customerId.
   */
  @Post('debug/send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async debugSend(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(DebugSendSchema)) dto: DebugSendDto,
  ): Promise<{ data: { reply: string }; success: boolean }> {
    const { botId, message } = dto;
    const chatId = user.customerId.toString();

    const settings = await this.customerSettingsRepository.findById(botId);
    if (!settings) {
      throw new ForbiddenException('Бот не найден');
    }
    if (settings.customerId !== chatId) {
      this.logger.warn(
        `Forbidden: User ${user.customerId} tried to debug bot ${botId} owned by ${settings.customerId}`,
      );
      throw new ForbiddenException('Нет доступа к этому боту');
    }

    const { systemPrompt, normalizedPromptVersion } =
      await this.customerSettingsService.resolvePromptContext(settings);

    await this.conversationsService.addUserMessage(
      ConversationPlatform.TEST,
      chatId,
      botId,
      message,
      { normalizedPromptVersion },
    );

    const reply = await this.conversationReplyService.replyInContext(
      botId,
      ConversationPlatform.TEST,
      chatId,
      systemPrompt,
    );

    await this.conversationsService.addAssistantMessage(
      ConversationPlatform.TEST,
      chatId,
      botId,
      reply,
    );

    return { success: true, data: { reply } };
  }

  /**
   * История тестового диалога для бота (для отображения в чате отладки).
   */
  @Get('debug/history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async debugHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('botId') botId: string,
  ): Promise<{
    data: {
      messages: Array<{
        type: string;
        content: string;
        questionId?: string;
        createdAt: string;
      }>;
      normalizedPromptVersion?: number;
    };
    success: boolean;
  }> {
    if (!botId?.trim()) {
      return { success: true, data: { messages: [] } };
    }

    const chatId = user.customerId.toString();
    const settings = await this.customerSettingsRepository.findById(botId);
    if (!settings) {
      throw new ForbiddenException('Бот не найден');
    }
    if (settings.customerId !== chatId) {
      throw new ForbiddenException('Нет доступа к этому боту');
    }

    const thread = await this.conversationsService.getThread(
      ConversationPlatform.TEST,
      chatId,
      botId,
    );

    const messages = thread?.messages ?? [];
    const list = messages.map((m) => ({
      type: m.type,
      content: m.content,
      ...(m.questionId != null && m.questionId !== '' && { questionId: m.questionId }),
      createdAt: (m.createdAt as Date).toISOString(),
    }));

    return {
      success: true,
      data: {
        messages: list,
        ...(thread?.normalizedPromptVersion != null && {
          normalizedPromptVersion: thread.normalizedPromptVersion,
        }),
      },
    };
  }
}
