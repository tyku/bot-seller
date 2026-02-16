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

// Email: только email
const registerEmailSchema = z.object({
  email: z.string().email('Неверный формат email'),
});

type RegisterEmailForm = z.infer<typeof registerEmailSchema>;

// Telegram: только телефон
const registerTelegramSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Неверный формат (например: +79991234567)'),
});

type RegisterTelegramForm = z.infer<typeof registerTelegramSchema>;

export function RegisterStep() {
  const { setStep, completeStep } = useWizard();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'telegram'>('email');

  const emailForm = useForm<RegisterEmailForm>({
    resolver: zodResolver(registerEmailSchema),
  });

  const telegramForm = useForm<RegisterTelegramForm>({
    resolver: zodResolver(registerTelegramSchema),
  });

  const onSubmitEmail = async (data: RegisterEmailForm) => {
    setIsLoading(true);
    setError('');

    try {
      await authApi.registerEmail(data);

      localStorage.setItem('registrationEmail', data.email);
      localStorage.setItem('verificationMethod', 'email');

      completeStep('register');
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitTelegram = async (data: RegisterTelegramForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.registerTelegram(data);

      // Сохраняем данные для VerifyStep
      localStorage.setItem('registrationPhone', data.phone);
      localStorage.setItem('verificationMethod', 'telegram');
      if (response.data?.botUsername) {
        localStorage.setItem('telegramBotUsername', response.data.botUsername);
      }

      // Автоматически открываем бота
      if (response.data?.telegramLink) {
        window.open(response.data.telegramLink, '_blank');
      }

      completeStep('register');
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('email')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMethod === 'email'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">✉️</div>
              <div className="font-medium text-sm">Email</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('telegram')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMethod === 'telegram'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">📱</div>
              <div className="font-medium text-sm">Telegram</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Email форма */}
        {selectedMethod === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="ivan@example.com"
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register('email')}
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Отправить код
            </Button>
          </form>
        )}

        {/* Telegram форма */}
        {selectedMethod === 'telegram' && (
          <form onSubmit={telegramForm.handleSubmit(onSubmitTelegram)} className="space-y-4">
            <Input
              label="Номер телефона"
              type="tel"
              placeholder="+79991234567"
              error={telegramForm.formState.errors.phone?.message}
              {...telegramForm.register('phone')}
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Отправить код
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
