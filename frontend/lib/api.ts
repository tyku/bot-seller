import axios from 'axios';
import type { SystemPromptAdminRow } from '@/lib/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function dispatchSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error.response?.status ?? error.response?.data?.statusCode;

    // При 401 (протухшая сессия) — выходим и показываем экран авторизации
    if (statusCode === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }

    if (error.response?.data) {
      const errorData = error.response.data;
      const message = errorData.message || 'An error occurred';
      const code = errorData.statusCode || error.response?.status;

      const enhancedError = new Error(message);
      (enhancedError as any).statusCode = code;
      (enhancedError as any).errors = errorData.errors;

      return Promise.reject(enhancedError);
    }

    const method = error.config?.method?.toUpperCase() || '?';
    const url = error.config?.url || '?';
    const msg = error.message || 'Unknown error';
    return Promise.reject(new Error(`${method} ${url}: ${msg}`));
  }
);

export { api };

// Auth API
export const authApi = {
  enter: async (contact: string) => {
    const response = await api.post('/auth/enter', { contact });
    return response.data;
  },

  registerEmail: async (data: { email: string }) => {
    const response = await api.post('/auth/register/email', data);
    return response.data;
  },

  registerTelegram: async (data: { phone: string }) => {
    const response = await api.post('/auth/register/telegram', data);
    return response.data;
  },

  login: async (data: { email?: string; phone?: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  verify: async (data: {
    email?: string;
    phone?: string;
    code: string;
    method: 'email' | 'telegram';
  }) => {
    const response = await api.post('/auth/verify', data);
    if (response.data.data?.accessToken) {
      localStorage.setItem('token', response.data.data.accessToken);
    }
    return response.data;
  },

  resendCode: async (identifier: string, method: 'email' | 'telegram') => {
    const response = await api.post('/auth/resend-code', { identifier, method });
    return response.data;
  },
};

// Customer Settings API
export const settingsApi = {
  create: async (data: {
    customerId: string;
    name: string;
    token: string;
    botType: 'tg' | 'vk';
    prompts: Array<{ name: string; body: string; type: 'context' }>;
  }) => {
    const response = await api.post('/customer-settings', data);
    return response.data;
  },

  getAll: async (customerId?: string) => {
    const params = customerId ? { customerId } : {};
    const response = await api.get('/customer-settings', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/customer-settings/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/customer-settings/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/customer-settings/${id}`);
    return response.data;
  },
};

// Customer API
export const customerApi = {
  getMe: async () => {
    const response = await api.get('/customers/me');
    return response.data;
  },
  updateMe: async (data: { name?: string }) => {
    const response = await api.patch('/customers/me', data);
    return response.data;
  },
};

// Tariffs API
export const tariffsApi = {
  getAll: async (activeOnly = true): Promise<{ data: import('@/lib/types').Tariff[] }> => {
    const response = await api.get('/tariffs', {
      params: { activeOnly: activeOnly ? 'true' : 'false' },
    });
    return response.data;
  },

  getById: async (id: string): Promise<{ data: import('@/lib/types').Tariff | null }> => {
    const response = await api.get(`/tariffs/${id}`);
    return response.data;
  },
};

// My subscription (active paid tariff)
export const subscriptionApi = {
  getCurrent: async (): Promise<{
    data: import('@/lib/types').ActiveSubscription | null;
  }> => {
    const response = await api.get('/customer-tariffs/current');
    return response.data;
  },

  /** Test payment: complete card payment and create customer-tariff (expiresAt = now + activityDurationDays). */
  pay: async (tariffId: string): Promise<{ data: { id: string; tariffId: string; expiresAt: string } }> => {
    const response = await api.post('/customer-tariffs/pay', { tariffId });
    return response.data;
  },
};

// Tariff usage (how much of limits is used)
export const usageApi = {
  getMe: async (): Promise<{
    data: { chatsUsed: number; requestsUsed: number; botsUsed: number };
  }> => {
    const response = await api.get('/tariff-usage/me');
    return response.data;
  },
};

/** Диалоги с реальных каналов (JWT), без демо и без test-контура. */
export const inboxApi = {
  list: async (params?: {
    platform?: 'tg' | 'vk';
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: {
      items: Array<{
        id: string;
        platform: string;
        chatId: string;
        botId: string;
        controlMode: string;
        updatedAt: string;
        needsOperatorAttention: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
    };
  }> => {
    const response = await api.get('/conversations/inbox', { params });
    return response.data;
  },

  getOne: async (
    id: string,
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
  }> => {
    const response = await api.get(`/conversations/inbox/${id}`);
    return response.data;
  },

  sendOperator: async (
    id: string,
    message: string,
  ): Promise<{ success: boolean }> => {
    const response = await api.post(`/conversations/inbox/${id}/operator-message`, {
      message,
    });
    return response.data;
  },

  setControlMode: async (
    id: string,
    controlMode: 'bot' | 'operator',
  ): Promise<{ success: boolean }> => {
    const response = await api.patch(`/conversations/inbox/${id}/control-mode`, {
      controlMode,
    });
    return response.data;
  },
};

// Debug chat (test dialogue for a bot)
export const debugChatApi = {
  send: async (
    botId: string,
    message: string,
  ): Promise<{
    data: {
      reply: string;
      handoff: boolean;
      operatorMode?: boolean;
    };
    success: boolean;
  }> => {
    const response = await api.post('/conversations/debug/send', { botId, message });
    return response.data;
  },

  resetMode: async (botId: string): Promise<{ success: boolean }> => {
    const response = await api.post('/conversations/debug/reset-mode', { botId });
    return response.data;
  },

  getHistory: async (botId: string): Promise<{
    data: { messages: Array<{ type: string; content: string; createdAt: string }> };
    success: boolean;
  }> => {
    const response = await api.get('/conversations/debug/history', { params: { botId } });
    return response.data;
  },
};

// System prompts (LLM, collection systemprompts)
export const systemPromptsApi = {
  getAll: async (): Promise<{
    success: boolean;
    data: SystemPromptAdminRow[];
    message: string;
  }> => {
    const response = await api.get('/system-prompts');
    return response.data;
  },

  updateText: async (
    id: string,
    body: { text: string },
  ): Promise<{
    success: boolean;
    data: SystemPromptAdminRow;
    message: string;
  }> => {
    const response = await api.patch(`/system-prompts/${id}`, body);
    return response.data;
  },
};

// Verification API
export const verificationApi = {
  send: async (data: {
    email?: string;
    phone?: string;
    type: 'email' | 'telegram' | 'sms';
  }) => {
    const response = await api.post('/verifications/send', data);
    return response.data;
  },

  verify: async (data: {
    email?: string;
    phone?: string;
    code: string;
    type: 'email' | 'telegram' | 'sms';
  }) => {
    const response = await api.post('/verifications/verify', data);
    return response.data;
  },

  getMyVerifications: async () => {
    const response = await api.get('/verifications/my');
    return response.data;
  },
};
