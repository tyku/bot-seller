'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api';
import { useWizard } from '@/contexts/WizardContext';

// Email регистрация
const registerEmailSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
});

type RegisterEmailForm = z.infer<typeof registerEmailSchema>;

// Telegram регистрация
const registerTelegramSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Неверный формат телефона (например: +79991234567)'),
});

type RegisterTelegramForm = z.infer<typeof registerTelegramSchema>;

export function RegisterStep() {
  const { setStep, completeStep } = useWizard();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'telegram'>('email');

  // Email форма
  const emailForm = useForm<RegisterEmailForm>({
    resolver: zodResolver(registerEmailSchema),
  });

  // Telegram форма
  const telegramForm = useForm<RegisterTelegramForm>({
    resolver: zodResolver(registerTelegramSchema),
  });

  const onSubmitEmail = async (data: RegisterEmailForm) => {
    setIsLoading(true);
    setError('');

    try {
      await authApi.registerEmail(data);
      
      // Save email for verification step
      localStorage.setItem('registrationEmail', data.email);
      localStorage.setItem('verificationMethod', 'email');
      
      completeStep('register');
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitTelegram = async (data: RegisterTelegramForm) => {
    setIsLoading(true);
    setError('');

    try {
      await authApi.registerTelegram(data);
      
      // Save phone for verification step
      localStorage.setItem('registrationPhone', data.phone);
      localStorage.setItem('verificationMethod', 'telegram');
      
      completeStep('register');
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Регистрация</h1>
          <p className="text-gray-600">Создайте аккаунт для начала работы</p>
        </div>

        {/* Выбор метода */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Выберите способ регистрации
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('email')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMethod === 'email'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-3xl mb-2">✉️</div>
              <div className="font-semibold">Email</div>
              <div className="text-xs text-gray-500 mt-1">Код на почту</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('telegram')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMethod === 'telegram'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-3xl mb-2">📱</div>
              <div className="font-semibold">Telegram</div>
              <div className="text-xs text-gray-500 mt-1">Код в мессенджер</div>
            </button>
          </div>
        </div>

        {/* Email форма */}
        {selectedMethod === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
            <Input
              label="Имя"
              placeholder="Иван Иванов"
              error={emailForm.formState.errors.name?.message}
              {...emailForm.register('name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="ivan@example.com"
              error={emailForm.formState.errors.email?.message}
              helpText="На этот адрес придет код верификации"
              {...emailForm.register('email')}
            />

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Зарегистрироваться
            </Button>
          </form>
        )}

        {/* Telegram форма */}
        {selectedMethod === 'telegram' && (
          <form onSubmit={telegramForm.handleSubmit(onSubmitTelegram)} className="space-y-4">
            <Input
              label="Имя"
              placeholder="Иван Иванов"
              error={telegramForm.formState.errors.name?.message}
              {...telegramForm.register('name')}
            />

            <Input
              label="Телефон"
              type="tel"
              placeholder="+79991234567"
              error={telegramForm.formState.errors.phone?.message}
              helpText="В международном формате (с кодом страны)"
              {...telegramForm.register('phone')}
            />

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Зарегистрироваться
            </Button>
          </form>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Без паролей!</strong> Авторизация только по коду из{' '}
            {selectedMethod === 'email' ? 'email' : 'Telegram'}. Безопасно и просто.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <button className="text-blue-600 hover:underline">Войти</button>
        </p>
      </Card>
    </div>
  );
}
