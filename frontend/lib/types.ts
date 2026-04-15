export type WizardStep = 'register' | 'verify' | 'profile';

export type ProfileTab =
  | 'bots'
  | 'organization'
  | 'subscription'
  | 'debug'
  | 'inbox';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  customerId: number;
  name: string;
  email: string;
  phone: string;
  status: 'created' | 'verified';
  /** Effective role from API; omit in old cached sessions. */
  role?: UserRole;
}

/** Системные промпты (MongoDB systemprompts), админ-редактирование */
export type SystemPromptType = 'message' | 'prompt';

export interface SystemPromptAdminRow {
  id: string;
  name: string;
  type: SystemPromptType;
  text: string;
}

export type BotStatusType = 'created' | 'active' | 'archived';

export interface BotSettings {
  id?: string;
  customerId: string;
  name: string;
  token: string;
  botType: 'tg' | 'vk';
  status: BotStatusType;
  /** Callback API VK: строка подтверждения вебхука. */
  vkConfirmationCode?: string;
  /** Задан секрет Callback API (флаг с бэкенда). */
  hasVkCallbackSecret?: boolean;
  prompts: Array<{
    name: string;
    body: string;
    type: 'context';
  }>;
}

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  user: User | null;
  settings: BotSettings | null;
}

// Verification types
export type VerificationType = 'email' | 'telegram' | 'sms';
export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'failed';

export interface Verification {
  id: string;
  customerId: string;
  type: VerificationType;
  status: VerificationStatus;
  contact: string;
  expiresAt: string;
  verifiedAt?: string;
  attempts: number;
  createdAt: string;
}

// Tariffs (from backend)
export type TariffStatus = 'active' | 'archived';

export interface Tariff {
  id: string;
  name: string;
  price: number;
  limits: { requests: number; chats: number; bots: number };
  /** Длительность активности в днях (например 30, 10) */
  activityDurationDays: number | null;
  status: TariffStatus;
  /** Пробный тариф — без оплаты */
  trial?: boolean;
}

export interface ActiveSubscription {
  id: string;
  tariffId: string;
  appliedAt: string;
  expiresAt: string | null;
  tariff: Tariff;
}
