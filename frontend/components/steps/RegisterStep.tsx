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

const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Неверный формат телефона'),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать строчную букву')
    .regex(/[0-9]/, 'Пароль должен содержать цифру'),
  confirmPassword: z.string(),
  verificationMethod: z.enum(['email', 'telegram']),
  telegramUsername: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterStep() {
  const { setStep, setUser, completeStep } = useWizard();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      verificationMethod: 'email',
    },
  });

  const verificationMethod = watch('verificationMethod');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authApi.register(registerData);
      
      // Save email for verification step
      localStorage.setItem('registrationEmail', data.email);
      localStorage.setItem('verificationMethod', data.verificationMethod);
      
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Имя"
            placeholder="Иван Иванов"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="ivan@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Телефон"
            type="tel"
            placeholder="+79991234567"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Пароль"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Подтвердите пароль"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Метод верификации
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="email"
                  {...register('verificationMethod')}
                  className="mr-2"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="telegram"
                  {...register('verificationMethod')}
                  className="mr-2"
                />
                Telegram
              </label>
            </div>
          </div>

          {verificationMethod === 'telegram' && (
            <Input
              label="Telegram Username"
              placeholder="@username"
              error={errors.telegramUsername?.message}
              {...register('telegramUsername')}
            />
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Зарегистрироваться
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <button className="text-blue-600 hover:underline">Войти</button>
        </p>
      </Card>
    </div>
  );
}
