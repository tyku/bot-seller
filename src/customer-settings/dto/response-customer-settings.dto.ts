import { BotType, BotStatus, PromptType } from '../schemas/customer-settings.schema';

export interface PromptDto {
  name: string;
  body: string;
  type: PromptType;
}

export class ResponseCustomerSettingsDto {
  id: string;
  customerId: string;
  name: string;
  token: string;
  botType: BotType;
  status: BotStatus;
  prompts: PromptDto[];
  /** Callback API VK: строка подтверждения вебхука. */
  vkConfirmationCode?: string;
  /** Задан секрет Callback API (для отображения в UI без раскрытия значения). */
  hasVkCallbackSecret?: boolean;
  normalizedPrompt?: string;
  /** Версия текущего нормализованного промпта (для сопоставления с диалогами). */
  normalizedPromptVersion?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseCustomerSettingsDto>) {
    Object.assign(this, partial);
  }
}
