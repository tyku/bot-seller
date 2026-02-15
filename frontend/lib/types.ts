export type WizardStep = 'register' | 'verify' | 'settings' | 'payment' | 'dashboard';

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
