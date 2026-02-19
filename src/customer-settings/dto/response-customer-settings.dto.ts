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
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseCustomerSettingsDto>) {
    Object.assign(this, partial);
  }
}
