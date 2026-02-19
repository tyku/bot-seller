import axios from 'axios';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const errorData = error.response.data;
      const message = errorData.message || 'An error occurred';
      const statusCode = errorData.statusCode || error.response.status;

      const enhancedError = new Error(message);
      (enhancedError as any).statusCode = statusCode;
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
