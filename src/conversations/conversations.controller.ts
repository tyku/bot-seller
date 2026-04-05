import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
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
import {
  ConversationControlMode,
  ConversationPlatform,
} from './schemas/conversation.schema';
import {
  DEBUG_REPLY_WHILE_OPERATOR_MODE,
  HANDOFF_DEFAULT_USER_MESSAGE,
} from './handoff-messages';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import {
  DebugResetModeSchema,
  DebugSendSchema,
  type DebugSendDto,
} from './dto/debug-send.dto';
import {
  InboxControlModeSchema,
  InboxListQuerySchema,
  InboxOperatorSendSchema,
  type InboxListQueryDto,
  type InboxOperatorSendDto,
} from './dto/inbox.dto';

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
  ): Promise<{
    data: {
      reply: string;
      handoff: boolean;
      operatorMode?: boolean;
    };
    success: boolean;
  }> {
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
      { normalizedPromptVersion, customerId: user.customerId },
    );

    const mode = await this.conversationsService.getControlMode(
      ConversationPlatform.TEST,
      chatId,
      botId,
    );
    if (mode === ConversationControlMode.OPERATOR) {
      return {
        success: true,
        data: {
          reply: DEBUG_REPLY_WHILE_OPERATOR_MODE,
          handoff: true,
          operatorMode: true,
        },
      };
    }

    const { reply, handoff } = await this.conversationReplyService.replyInContext(
      botId,
      ConversationPlatform.TEST,
      chatId,
      systemPrompt,
    );

    const displayReply =
      handoff && reply.trim() === ''
        ? HANDOFF_DEFAULT_USER_MESSAGE
        : reply;

    if (handoff) {
      await this.conversationsService.setControlMode(
        ConversationPlatform.TEST,
        chatId,
        botId,
        ConversationControlMode.OPERATOR,
      );
    }

    await this.conversationsService.addAssistantMessage(
      ConversationPlatform.TEST,
      chatId,
      botId,
      displayReply,
    );

    return {
      success: true,
      data: { reply: displayReply, handoff, operatorMode: false },
    };
  }

  /**
   * Вернуть тестовый диалог в режим ответов LLM (после handoff в отладке).
   */
  @Post('debug/reset-mode')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async debugResetMode(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(DebugResetModeSchema)) dto: { botId: string },
  ): Promise<{ success: boolean }> {
    const { botId } = dto;
    const chatId = user.customerId.toString();

    const settings = await this.customerSettingsRepository.findById(botId);
    if (!settings) {
      throw new ForbiddenException('Бот не найден');
    }
    if (settings.customerId !== chatId) {
      throw new ForbiddenException('Нет доступа к этому боту');
    }

    await this.conversationsService.setControlMode(
      ConversationPlatform.TEST,
      chatId,
      botId,
      ConversationControlMode.BOT,
    );
    return { success: true };
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

  /**
   * Inbox: все диалоги клиента по каналам (без демо и без тестового platform=test).
   */
  @Get('inbox')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async inboxList(
    @CurrentUser() user: CurrentUserData,
    @Query(new ZodValidationPipe(InboxListQuerySchema)) query: InboxListQueryDto,
  ): Promise<{
    success: boolean;
    data: {
      items: Array<{
        id: string;
        platform: string;
        chatId: string;
        botId: string;
        controlMode: string;
        updatedAt: string;
        /** Очередь Redis: нужен оператор (красная зона в UI). */
        needsOperatorAttention: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const platform =
      query.platform === 'tg'
        ? ConversationPlatform.TG
        : query.platform === 'vk'
          ? ConversationPlatform.VK
          : undefined;

    const { items, total } = await this.conversationsService.listInboxForCustomer(
      user.customerId,
      { platform, page: query.page, limit: query.limit },
    );

    return {
      success: true,
      data: {
        items: items.map((row) => ({
          id: String(row.conversation._id),
          platform: row.conversation.platform,
          chatId: row.conversation.chatId,
          botId: row.conversation.botId,
          controlMode: row.conversation.controlMode ?? ConversationControlMode.BOT,
          updatedAt: (row.conversation.updatedAt ?? new Date()).toISOString(),
          needsOperatorAttention: row.needsOperatorAttention,
        })),
        total,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  @Get('inbox/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async inboxGetOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      platform: string;
      chatId: string;
      botId: string;
      controlMode: string;
      normalizedPromptVersion?: number;
      messages: Array<{
        type: string;
        content: string;
        questionId?: string;
        createdAt: string;
      }>;
    };
  }> {
    const doc = await this.conversationsService.findConversationByIdForCustomer(
      id,
      user.customerId,
    );
    if (!doc) {
      throw new ForbiddenException('Диалог не найден');
    }

    const messages = (doc.messages ?? []).map((m) => ({
      type: m.type,
      content: m.content,
      ...(m.questionId != null &&
        m.questionId !== '' && { questionId: m.questionId }),
      createdAt: (m.createdAt as Date).toISOString(),
    }));

    return {
      success: true,
      data: {
        id: String(doc._id),
        platform: doc.platform,
        chatId: doc.chatId,
        botId: doc.botId,
        controlMode: doc.controlMode ?? ConversationControlMode.BOT,
        ...(doc.normalizedPromptVersion != null && {
          normalizedPromptVersion: doc.normalizedPromptVersion,
        }),
        messages,
      },
    };
  }

  @Post('inbox/:id/operator-message')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async inboxOperatorSend(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(InboxOperatorSendSchema)) dto: InboxOperatorSendDto,
  ): Promise<{ success: boolean }> {
    await this.conversationsService.sendOperatorMessageFromInbox(
      id,
      user.customerId,
      dto.message,
    );
    return { success: true };
  }

  @Patch('inbox/:id/control-mode')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async inboxControlMode(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(InboxControlModeSchema)) dto: { controlMode: 'bot' | 'operator' },
  ): Promise<{ success: boolean }> {
    const doc = await this.conversationsService.findConversationByIdForCustomer(
      id,
      user.customerId,
    );
    if (!doc) {
      throw new ForbiddenException('Диалог не найден');
    }

    const mode =
      dto.controlMode === 'operator'
        ? ConversationControlMode.OPERATOR
        : ConversationControlMode.BOT;

    await this.conversationsService.setControlMode(
      doc.platform,
      doc.chatId,
      doc.botId,
      mode,
    );
    if (mode === ConversationControlMode.OPERATOR) {
      await this.conversationsService.enqueueOperatorAttentionByThread(
        user.customerId,
        doc.platform,
        doc.chatId,
        doc.botId,
      );
    } else {
      await this.conversationsService.removeOperatorAttentionByThread(
        user.customerId,
        doc.platform,
        doc.chatId,
        doc.botId,
      );
    }
    return { success: true };
  }
}
