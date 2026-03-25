import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import { DemoChatSendSchema, type DemoChatSendDto } from './dto/demo-chat.dto';
import {
  MergeDemoDraftSchema,
  UpdateDemoDraftSchema,
  type MergeDemoDraftDto,
  type UpdateDemoDraftDto,
} from './dto/demo-draft.dto';
import { DemoDraftService } from './demo-draft.service';
import { CustomerTariffsService } from '../customer-tariffs/customer-tariffs.service';
import {
  buildClearCookieHeader,
  buildSetCookieHeader,
  DEMO_DRAFT_ID_COOKIE,
  DEMO_DRAFT_SECRET_COOKIE,
  parseCookieHeader,
} from './utils/cookie.util';

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function readDraftCredentials(req: Request): {
  draftId: string;
  secret: string;
} | null {
  const hId = req.headers['x-demo-draft-id'];
  const hSec = req.headers['x-demo-draft-secret'];
  if (
    typeof hId === 'string' &&
    hId.length > 0 &&
    typeof hSec === 'string' &&
    hSec.length > 0
  ) {
    return { draftId: hId, secret: hSec };
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  const cid = cookies[DEMO_DRAFT_ID_COOKIE];
  const csec = cookies[DEMO_DRAFT_SECRET_COOKIE];
  if (cid && csec) {
    return { draftId: cid, secret: csec };
  }
  return null;
}

@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoDraftService: DemoDraftService,
    private readonly customerTariffsService: CustomerTariffsService,
    private readonly configService: ConfigService,
  ) {}

  private cookieMaxAgeSeconds(): number {
    const days = this.configService.get<number>('demo.draftTtlDays') ?? 14;
    return days * 24 * 60 * 60;
  }

  private isSecureCookies(): boolean {
    return this.configService.get<string>('nodeEnv') === 'production';
  }

  /**
   * Создать анонимный черновик настроек (без JWT).
   * Выставляет HttpOnly-куки + возвращает draftId/secret один раз в JSON (для клиентов без cookies).
   */
  @Public()
  @Post('drafts')
  @HttpCode(HttpStatus.CREATED)
  async createDraft(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = clientIp(req);
    const { draftId, secret, expiresAt } =
      await this.demoDraftService.createDraft(ip);
    const maxAge = this.cookieMaxAgeSeconds();
    const secure = this.isSecureCookies();
    res.setHeader('Set-Cookie', [
      buildSetCookieHeader(DEMO_DRAFT_ID_COOKIE, draftId, maxAge, { secure }),
      buildSetCookieHeader(DEMO_DRAFT_SECRET_COOKIE, secret, maxAge, {
        secure,
      }),
    ]);
    return {
      success: true,
      data: { draftId, secret, expiresAt },
      message: 'Demo draft created',
    };
  }

  /**
   * Получить текущий черновик (куки или X-Demo-Draft-Id / X-Demo-Draft-Secret).
   */
  @Public()
  @Get('drafts/me')
  @HttpCode(HttpStatus.OK)
  async getMyDraft(@Req() req: Request) {
    const ip = clientIp(req);
    const creds = readDraftCredentials(req);
    const data = await this.demoDraftService.getDraft(creds, ip);
    return {
      success: true,
      data,
      message: 'Demo draft retrieved',
    };
  }

  /**
   * Обновить черновик (sliding expiry).
   */
  @Public()
  @Patch('drafts/me')
  @HttpCode(HttpStatus.OK)
  async patchMyDraft(
    @Req() req: Request,
    @Body(new ZodValidationPipe(UpdateDemoDraftSchema))
    body: UpdateDemoDraftDto,
  ) {
    const ip = clientIp(req);
    const creds = readDraftCredentials(req);
    const data = await this.demoDraftService.updateDraft(creds, ip, body);
    return {
      success: true,
      data,
      message: 'Demo draft updated',
    };
  }

  /**
   * Активировать пробный тариф (JWT). Берётся последний по дате среди trial=true, status=active.
   * Вызывать до POST /demo/drafts/merge, если ещё нет подписки.
   */
  @Post('trial/activate')
  @HttpCode(HttpStatus.OK)
  async activateTrial(@CurrentUser() user: CurrentUserData) {
    const data = await this.customerTariffsService.activateTrialSubscription(
      user.customerId,
    );
    return {
      success: true,
      data,
      message: 'Trial subscription activated',
    };
  }

  /**
   * История тестового чата для текущего черновика (без JWT).
   */
  @Public()
  @Get('chat/history')
  @HttpCode(HttpStatus.OK)
  async getDemoChatHistory(@Req() req: Request) {
    const ip = clientIp(req);
    const creds = readDraftCredentials(req);
    const messages = await this.demoDraftService.getDemoChatHistory(creds, ip);
    return {
      success: true,
      data: { messages },
      message: 'Demo chat history',
    };
  }

  /**
   * Отправить сообщение в тестовый чат (промпты из черновика; лимиты тарифа не списываются).
   */
  @Public()
  @Post('chat/send')
  @HttpCode(HttpStatus.OK)
  async sendDemoChat(
    @Req() req: Request,
    @Body(new ZodValidationPipe(DemoChatSendSchema)) body: DemoChatSendDto,
  ) {
    const ip = clientIp(req);
    const creds = readDraftCredentials(req);
    const data = await this.demoDraftService.sendDemoChat(
      creds,
      ip,
      body.message,
    );
    return {
      success: true,
      data,
      message: 'Reply sent',
    };
  }

  /**
   * Перенести черновик в реальные customer-settings (JWT + токен бота в теле).
   * Требуется активная подписка (например после POST /demo/trial/activate).
   */
  @Post('drafts/merge')
  @HttpCode(HttpStatus.OK)
  async mergeDraft(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(MergeDemoDraftSchema)) body: MergeDemoDraftDto,
  ) {
    const data = await this.demoDraftService.mergeDraft(user, body);
    const secure = this.isSecureCookies();
    res.setHeader('Set-Cookie', [
      buildClearCookieHeader(DEMO_DRAFT_ID_COOKIE, { secure }),
      buildClearCookieHeader(DEMO_DRAFT_SECRET_COOKIE, { secure }),
    ]);
    return {
      success: true,
      data,
      message: 'Demo draft merged into your account',
    };
  }
}
