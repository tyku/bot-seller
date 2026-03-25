import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DemoDraftRepository } from './demo-draft.repository';
import { DemoRateLimitService } from './demo-rate-limit.service';
import type { CustomerSettingsDraftDocument } from './schemas/customer-settings-draft.schema';
import { BotType } from '../customer-settings/schemas/customer-settings.schema';
import { CustomerSettingsService } from '../customer-settings/customer-settings.service';
import type {
  UpdateDemoDraftDto,
  MergeDemoDraftDto,
} from './dto/demo-draft.dto';
import { LlmService } from '../llm/llm.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { CustomerTariffsService } from '../customer-tariffs/customer-tariffs.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationReplyService } from '../conversations/conversation-reply.service';
import {
  ConversationMessageType,
  ConversationPlatform,
} from '../conversations/schemas/conversation.schema';

export interface DraftCredentials {
  draftId: string;
  secret: string;
}

@Injectable()
export class DemoDraftService {
  private readonly logger = new Logger(DemoDraftService.name);
  private readonly bcryptRounds = 10;

  constructor(
    private readonly repository: DemoDraftRepository,
    private readonly rateLimit: DemoRateLimitService,
    private readonly configService: ConfigService,
    private readonly customerSettingsService: CustomerSettingsService,
    private readonly llmService: LlmService,
    private readonly customerTariffsService: CustomerTariffsService,
    private readonly conversationsService: ConversationsService,
    private readonly conversationReplyService: ConversationReplyService,
  ) {}

  private ttlMs(): number {
    const days = this.configService.get<number>('demo.draftTtlDays') ?? 14;
    return days * 24 * 60 * 60 * 1000;
  }

  async createDraft(clientIp: string): Promise<{
    draftId: string;
    secret: string;
    expiresAt: Date;
  }> {
    await this.rateLimit.consume(
      `create:${clientIp}`,
      60,
      this.rateLimit.getCreateLimitPerMinute(),
    );

    const draftId = randomUUID();
    const secret = randomBytes(32).toString('hex');
    const secretHash = await bcrypt.hash(secret, this.bcryptRounds);
    const now = Date.now();
    const expiresAt = new Date(now + this.ttlMs());

    await this.repository.create({
      draftId,
      secretHash,
      name: 'Demo bot',
      botType: BotType.TG,
      prompts: [],
      expiresAt,
    });

    this.logger.log(`Demo draft created: ${draftId}`);
    return { draftId, secret, expiresAt };
  }

  async getDraft(
    creds: DraftCredentials | null,
    clientIp: string,
  ): Promise<{
    draftId: string;
    name: string;
    botType: BotType;
    prompts: Array<{ name: string; body: string; type: 'context' }>;
    normalizedPrompt?: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }> {
    const draft = await this.loadAuthorizedDraft(creds, clientIp, 'get');
    return this.mapPublic(draft);
  }

  async updateDraft(
    creds: DraftCredentials | null,
    clientIp: string,
    dto: UpdateDemoDraftDto,
  ): Promise<{
    draftId: string;
    name: string;
    botType: BotType;
    prompts: Array<{ name: string; body: string; type: 'context' }>;
    normalizedPrompt?: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }> {
    const draft = await this.loadAuthorizedDraft(creds, clientIp, 'rw');
    const now = Date.now();
    const newExpires = new Date(now + this.ttlMs());

    let normalizedPrompt: string | undefined = draft.normalizedPrompt;
    if (dto.prompts !== undefined) {
      normalizedPrompt =
        (await this.computeNormalizedPrompt(dto.prompts)) ?? undefined;
    }

    const updated = await this.repository.updateByDraftId(draft.draftId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.botType !== undefined && { botType: dto.botType as BotType }),
      ...(dto.prompts !== undefined && { prompts: dto.prompts }),
      ...(dto.prompts !== undefined && { normalizedPrompt }),
      expiresAt: newExpires,
    });

    if (!updated) {
      throw new NotFoundException('Draft not found');
    }

    return this.mapPublic(updated);
  }

  async mergeDraft(user: CurrentUserData, dto: MergeDemoDraftDto) {
    const draft = await this.repository.findByDraftId(dto.draftId);
    if (!draft) {
      throw new NotFoundException('Draft not found or expired');
    }
    if (draft.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Draft has expired');
    }

    const ok = await bcrypt.compare(dto.secret, draft.secretHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid draft credentials');
    }

    const subscription =
      await this.customerTariffsService.getActiveSubscription(user.customerId);
    if (!subscription) {
      throw new BadRequestException(
        'Нет активной подписки. Сначала активируйте пробный период: POST /demo/trial/activate',
      );
    }

    try {
      const created = await this.customerSettingsService.create({
        customerId: String(user.customerId),
        name: draft.name,
        token: dto.token,
        botType: draft.botType,
        prompts: (draft.prompts ?? []).map((p) => ({
          name: p.name,
          body: p.body,
          type: 'context' as const,
        })),
      });

      await this.repository.deleteByDraftId(draft.draftId);
      this.logger.log(
        `Demo draft merged into customer settings for customer ${user.customerId}`,
      );
      return created;
    } catch (e) {
      this.logger.error(`Merge draft failed: ${(e as Error).message}`);
      throw e;
    }
  }

  /** Тестовый чат по черновику (без реального бота). */
  async sendDemoChat(
    creds: DraftCredentials | null,
    clientIp: string,
    message: string,
  ): Promise<{ reply: string }> {
    const draft = await this.loadAuthorizedDraft(creds, clientIp, 'chat');
    const chatId = `demo:${draft.draftId}`;
    const botId = `demo:${draft.draftId}`;
    const systemPrompt =
      draft.normalizedPrompt?.trim() ||
      draft.prompts
        ?.map((p) => p.body?.trim())
        .filter((b): b is string => Boolean(b))
        .join('\n\n') ||
      undefined;

    await this.conversationsService.addUserMessage(
      ConversationPlatform.TEST,
      chatId,
      botId,
      message,
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

    return { reply };
  }

  async getDemoChatHistory(
    creds: DraftCredentials | null,
    clientIp: string,
  ): Promise<
    Array<{ type: 'user' | 'assistant' | 'system'; content: string; createdAt: string }>
  > {
    const draft = await this.loadAuthorizedDraft(creds, clientIp, 'chat');
    const chatId = `demo:${draft.draftId}`;
    const botId = `demo:${draft.draftId}`;
    const messages = await this.conversationsService.getMessages(
      ConversationPlatform.TEST,
      chatId,
      botId,
    );
    return messages.map((m) => {
      const t =
        m.type === ConversationMessageType.USER
          ? ('user' as const)
          : m.type === ConversationMessageType.ASSISTANT
            ? ('assistant' as const)
            : ('system' as const);
      return {
        type: t,
        content: m.content,
        createdAt:
          m.createdAt instanceof Date
            ? m.createdAt.toISOString()
            : new Date(m.createdAt as unknown as string).toISOString(),
      };
    });
  }

  private async loadAuthorizedDraft(
    creds: DraftCredentials | null,
    clientIp: string,
    kind: 'get' | 'rw' | 'chat',
  ): Promise<CustomerSettingsDraftDocument> {
    if (!creds?.draftId || !creds.secret) {
      throw new UnauthorizedException('Demo draft credentials required');
    }

    const limit = this.rateLimit.getReadWriteLimitPerMinute();
    const rlKey =
      kind === 'chat' ? `chat-rl:${clientIp}:${creds.draftId}` : `${kind}:${clientIp}:${creds.draftId}`;
    await this.rateLimit.consume(rlKey, 60, limit);

    const draft = await this.repository.findByDraftId(creds.draftId);
    if (!draft) {
      throw new NotFoundException('Draft not found or expired');
    }
    if (draft.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Draft has expired');
    }

    const ok = await bcrypt.compare(creds.secret, draft.secretHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid draft credentials');
    }

    return draft;
  }

  private mapPublic(draft: CustomerSettingsDraftDocument) {
    return {
      draftId: draft.draftId,
      name: draft.name,
      botType: draft.botType,
      prompts: (draft.prompts ?? []).map((p) => ({
        name: p.name,
        body: p.body,
        type: 'context' as const,
      })),
      normalizedPrompt: draft.normalizedPrompt,
      expiresAt: draft.expiresAt,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  private async computeNormalizedPrompt(
    prompts: Array<{ body?: string }>,
  ): Promise<string | null> {
    const userPrompt = prompts
      ?.map((p) => p.body?.trim())
      .filter((b): b is string => Boolean(b))
      .join('\n\n');
    if (!userPrompt) {
      return null;
    }
    try {
      return await this.llmService.normalizePrompt(userPrompt);
    } catch (error) {
      this.logger.warn(
        `Demo draft: failed to normalize prompt: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
