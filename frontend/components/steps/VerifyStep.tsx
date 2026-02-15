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

  // Получаем данные из localStorage
  const email = typeof window !== 'undefined' ? localStorage.getItem('registrationEmail') || '' : '';
  const phone = typeof window !== 'undefined' ? localStorage.getItem('registrationPhone') || '' : '';
  const method = typeof window !== 'undefined' ? (localStorage.getItem('verificationMethod') as 'email' | 'telegram') || 'email' : 'email';

  // Контакт для отображения и отправки
  const contact = email || phone;

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
        email: email || undefined,
        phone: phone || undefined,
        code: data.code,
        method,
      });

      completeStep('verify');
      setStep('settings');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await authApi.resendCode(contact, method);
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
          <p className="text-sm text-gray-500 mt-1 break-all">{contact}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Код верификации"
            placeholder="123456"
            error={errors.code?.message}
            helpText={method === 'telegram' ? 'Код придет в Telegram на ваш номер' : 'Проверьте папку Спам, если код не пришел'}
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

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Совет:</strong> {method === 'email' 
              ? 'Проверьте папку "Спам", если не видите письмо в основной папке.' 
              : 'Убедитесь, что у вас установлен Telegram и вы вошли в аккаунт.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
