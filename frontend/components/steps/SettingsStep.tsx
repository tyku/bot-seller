'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { settingsApi, customerApi } from '@/lib/api';
import { useWizard } from '@/contexts/WizardContext';
import { getErrorMessage } from '@/lib/error-utils';

const promptSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  body: z.string().min(1, 'Введите текст'),
  type: z.literal('context'),
});

const settingsSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  token: z.string().min(1, 'Токен обязателен'),
  botType: z.enum(['tg', 'vk']),
  prompts: z.array(promptSchema).default([]),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export function SettingsStep() {
  const { setStep, setSettings, completeStep, user, setUser } = useWizard();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      botType: 'tg',
      prompts: [{ name: 'greeting', body: 'Привет! Я ваш помощник.', type: 'context' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prompts',
  });

  const botType = watch('botType');

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        try {
          const response = await customerApi.getMe();
          setUser(response.data);
        } catch (err) {
          const errorMessage = getErrorMessage(err, 'Не удалось загрузить данные пользователя');
          console.error('Failed to fetch user:', err);
          setError(errorMessage);
        }
      }
    };
    fetchUser();
  }, [user, setUser]);

  const onSubmit = async (data: SettingsForm) => {
    if (!user) {
      setError('Пользователь не найден');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await settingsApi.create({
        customerId: user.customerId.toString(),
        ...data,
      });

      setSettings(response.data);
      completeStep('settings');
      setStep('payment');
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Ошибка сохранения настроек');
      console.error('Settings save error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройка бота</h1>
          <p className="text-gray-600">Настройте вашего бота для продаж</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Название бота"
            placeholder="Мой продающий бот"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Тип бота
            </label>
            <div className="flex gap-4">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500">
                <input
                  type="radio"
                  value="tg"
                  {...register('botType')}
                  className="mr-3"
                />
                <div>
                  <div className="font-semibold">Telegram</div>
                  <div className="text-sm text-gray-500">Создайте бота через @BotFather</div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500">
                <input
                  type="radio"
                  value="vk"
                  {...register('botType')}
                  className="mr-3"
                />
                <div>
                  <div className="font-semibold">VK</div>
                  <div className="text-sm text-gray-500">Получите токен в настройках сообщества</div>
                </div>
              </label>
            </div>
          </div>

          <Input
            label={`Токен ${botType === 'tg' ? 'Telegram' : 'VK'}`}
            placeholder={botType === 'tg' ? '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz' : 'vk1.a.xxx'}
            error={errors.token?.message}
            helpText={botType === 'tg' 
              ? 'Получите токен у @BotFather в Telegram' 
              : 'Получите токен в настройках сообщества VK'}
            {...register('token')}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Промпты (контекст для бота)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', body: '', type: 'context' })}
              >
                + Добавить промпт
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border-2 border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Промпт #{index + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Название (например: greeting)"
                  error={errors.prompts?.[index]?.name?.message}
                  {...register(`prompts.${index}.name` as const)}
                />
                <textarea
                  placeholder="Текст промпта"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.prompts?.[index]?.body ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                  {...register(`prompts.${index}.body` as const)}
                />
                {errors.prompts?.[index]?.body && (
                  <p className="text-sm text-red-600">{errors.prompts[index]?.body?.message}</p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('verify')}
              className="flex-1"
            >
              Назад
            </Button>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Продолжить
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
