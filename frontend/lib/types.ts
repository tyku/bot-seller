export type WizardStep = 'register' | 'verify' | 'profile';

export type ProfileTab = 'bots' | 'organization' | 'subscription';

export interface User {
  id: string;
  customerId: number;
  name: string;
  email: string;
  phone: string;
  status: 'created' | 'verified';
}

export interface BotSettings {
  id?: string;
  customerId: string;
  name: string;
  token: string;
  botType: 'tg' | 'vk';
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
