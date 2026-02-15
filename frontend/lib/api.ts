import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9022';

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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Extract error message from response
    if (error.response?.data) {
      const errorData = error.response.data;
      const message = errorData.message || 'An error occurred';
      const statusCode = errorData.statusCode || error.response.status;
      
      console.error(`[${statusCode}] ${message}`, errorData);
      
      // Create a user-friendly error
      const enhancedError = new Error(message);
      (enhancedError as any).statusCode = statusCode;
      (enhancedError as any).errors = errorData.errors;
      (enhancedError as any).originalError = error;
      
      return Promise.reject(enhancedError);
    }
    
    // Network or other errors
    if (error.request) {
      console.error('Network Error: No response received', error.request);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  // Регистрация через Email
  registerEmail: async (data: {
    name: string;
    email: string;
  }) => {
    const response = await api.post('/auth/register/email', data);
    return response.data;
  },

  // Регистрация через Telegram (phone)
  registerTelegram: async (data: {
    name: string;
    phone: string;
  }) => {
    const response = await api.post('/auth/register/telegram', data);
    return response.data;
  },

  // Login - теперь только отправляет код (без пароля)
  login: async (data: { email?: string; phone?: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Verify code
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

  // Resend code
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
