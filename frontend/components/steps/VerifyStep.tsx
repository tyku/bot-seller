'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api';
import { useWizard } from '@/contexts/WizardContext';

interface VerifyForm {
  code: string;
}

export function VerifyStep() {
  const { setStep, completeStep } = useWizard();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const email = typeof window !== 'undefined' ? localStorage.getItem('registrationEmail') || '' : '';
  const method = typeof window !== 'undefined' ? (localStorage.getItem('verificationMethod') as 'email' | 'telegram') || 'email' : 'email';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>();

  const onSubmit = async (data: VerifyForm) => {
    setIsLoading(true);
    setError('');

    try {
      await authApi.verify({
        email,
        code: data.code,
      });

      completeStep('verify');
      setStep('settings');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await authApi.resendCode(email, method);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      setError('Не удалось отправить код повторно');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{method === 'email' ? '✉️' : '📱'}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Верификация</h1>
          <p className="text-gray-600">
            Мы отправили код на {method === 'email' ? 'email' : 'Telegram'}
          </p>
          <p className="text-sm text-gray-500 mt-1">{email}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Код верификации"
            placeholder="123456"
            error={errors.code?.message}
            {...register('code', {
              required: 'Введите код',
              minLength: { value: 4, message: 'Минимум 4 символа' },
            })}
          />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
              Код отправлен повторно!
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Подтвердить
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {isResending ? 'Отправка...' : 'Отправить код повторно'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
