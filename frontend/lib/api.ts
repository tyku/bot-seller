import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    verificationMethod: 'email' | 'telegram';
    telegramUsername?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    if (response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  verify: async (data: { email: string; code: string }) => {
    const response = await api.post('/auth/verify', data);
    if (response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  resendCode: async (email: string, method: 'email' | 'telegram') => {
    const response = await api.post('/auth/resend-code', { email, method });
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
};
