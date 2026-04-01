import axios from 'axios';

const DEMO_ID_KEY = 'demo_draft_id';
const DEMO_SECRET_KEY = 'demo_draft_secret';

/**
 * Отдельный клиент: без подстановки JWT и без auth:session-expired на 401
 * (неверные креды демо тоже дают 401).
 */
const demoClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

demoClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const id = sessionStorage.getItem(DEMO_ID_KEY);
    const sec = sessionStorage.getItem(DEMO_SECRET_KEY);
    if (id && sec) {
      config.headers['X-Demo-Draft-Id'] = id;
      config.headers['X-Demo-Draft-Secret'] = sec;
    }
  }
  return config;
});

demoClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const errorData = error.response.data;
      const message = errorData.message || 'Ошибка запроса';
      const enhancedError = new Error(
        typeof message === 'string' ? message : JSON.stringify(message),
      );
      (enhancedError as Error & { statusCode?: number }).statusCode =
        errorData.statusCode || error.response?.status;
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  },
);

export function persistDemoDraftCredentials(draftId: string, secret: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DEMO_ID_KEY, draftId);
  sessionStorage.setItem(DEMO_SECRET_KEY, secret);
}

export function clearDemoDraftCredentials() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(DEMO_ID_KEY);
  sessionStorage.removeItem(DEMO_SECRET_KEY);
}

export interface DemoDraftPayload {
  draftId: string;
  name: string;
  prompts: Array<{ name: string; body: string; type: 'context' }>;
  businessDescription?: string;
  normalizedPrompt?: string;
  expiresAt: string;
}

export const demoApi = {
  createDraft: async (): Promise<{
    success: boolean;
    data: { draftId: string; secret: string; expiresAt: string };
  }> => {
    const res = await demoClient.post('/demo/drafts');
    return res.data;
  },

  getDraft: async (): Promise<{ success: boolean; data: DemoDraftPayload }> => {
    const res = await demoClient.get('/demo/drafts/me');
    return res.data;
  },

  updateDraft: async (body: {
    name?: string;
    prompts?: Array<{ name: string; body: string; type: 'context' }>;
    businessDescription?: string;
  }): Promise<{ success: boolean; data: DemoDraftPayload }> => {
    const res = await demoClient.patch('/demo/drafts/me', body);
    return res.data;
  },

  /** Поставить задачу генерации в очередь; результат — через getGeneratePromptJob. */
  enqueueGeneratePrompt: async (body: {
    businessDescription: string;
  }): Promise<{
    success: boolean;
    data: { jobId: string };
  }> => {
    const res = await demoClient.post('/demo/drafts/me/generate-prompt', body);
    return res.data;
  },

  getGeneratePromptJob: async (
    jobId: string,
  ): Promise<{
    success: boolean;
    data:
      | {
          state:
            | 'waiting'
            | 'active'
            | 'delayed'
            | 'paused'
            | 'prioritized'
            | 'unknown'
            | 'waiting-children';
        }
      | {
          state: 'completed';
          data: DemoDraftPayload & { generatedPrompt: string };
        }
      | { state: 'failed'; error: string };
  }> => {
    const res = await demoClient.get(
      `/demo/drafts/me/generate-prompt/jobs/${encodeURIComponent(jobId)}`,
    );
    return res.data;
  },

  getChatHistory: async (): Promise<{
    success: boolean;
    data: { messages: Array<{ type: string; content: string; createdAt: string }> };
  }> => {
    const res = await demoClient.get('/demo/chat/history');
    return res.data;
  },

  sendChat: async (
    message: string,
  ): Promise<{ success: boolean; data: { reply: string } }> => {
    const res = await demoClient.post('/demo/chat/send', { message });
    return res.data;
  },
};
