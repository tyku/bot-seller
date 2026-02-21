'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { settingsApi, customerApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/error-utils';
import { BotSettings, BotStatusType } from '@/lib/types';

const promptSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  body: z.string().min(1, 'Введите текст'),
  type: z.literal('context'),
});

const botSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  token: z.string().min(1, 'Токен обязателен'),
  botType: z.enum(['tg', 'vk']),
  prompts: z.array(promptSchema).default([]),
});

type BotForm = z.infer<typeof botSchema>;

const defaultFormValues: BotForm = {
  name: '',
  token: '',
  botType: 'tg',
  prompts: [{ name: 'greeting', body: 'Привет! Я ваш помощник.', type: 'context' }],
};

const statusConfig: Record<BotStatusType, { label: string; color: string; dot: string }> = {
  created: { label: 'Создан', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  active: { label: 'Активен', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Архив', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
};

export function BotsSection() {
  const { user, setUser } = useAuth();
  const [bots, setBots] = useState<BotSettings[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<BotForm>({
    resolver: zodResolver(botSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prompts',
  });

  const botType = watch('botType');

  useEffect(() => {
    const init = async () => {
      try {
        let currentUser = user;
        if (!currentUser) {
          const response = await customerApi.getMe();
          currentUser = response.data;
          setUser(currentUser);
        }
        if (currentUser) {
          const response = await settingsApi.getAll(currentUser.customerId.toString());
          setBots(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load bots:', err);
      } finally {
        setIsLoadingBots(false);
      }
    };
    init();
  }, [user, setUser]);

  const openCreateForm = useCallback(() => {
    reset(defaultFormValues);
    setEditingBotId(null);
    setError('');
    setFormMode('create');
  }, [reset]);

  const openEditForm = useCallback((bot: BotSettings) => {
    reset({
      name: bot.name,
      token: bot.token,
      botType: bot.botType as 'tg' | 'vk',
      prompts: bot.prompts.map((p) => ({
        name: p.name,
        body: p.body,
        type: 'context' as const,
      })),
    });
    setEditingBotId(bot.id ?? null);
    setError('');
    setFormMode('edit');
  }, [reset]);

  const closeForm = useCallback(() => {
    setFormMode('closed');
    setEditingBotId(null);
    setError('');
    reset(defaultFormValues);
  }, [reset]);

  const onSubmit = async (data: BotForm) => {
    if (!user) {
      setError('Пользователь не найден');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (formMode === 'edit' && editingBotId) {
        const response = await settingsApi.update(editingBotId, data);
        setBots((prev) => prev.map((b) => (b.id === editingBotId ? response.data : b)));
      } else {
        const response = await settingsApi.create({
          customerId: user.customerId.toString(),
          ...data,
        });
        setBots((prev) => [...prev, response.data]);
      }
      closeForm();
    } catch (err) {
      setError(getErrorMessage(err, formMode === 'edit' ? 'Ошибка сохранения' : 'Ошибка создания бота'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await settingsApi.delete(id);
      setBots((prev) => prev.filter((b) => b.id !== id));
      if (editingBotId === id) closeForm();
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: BotStatusType) => {
    setActionError('');
    try {
      const response = await settingsApi.update(id, { status: newStatus });
      setBots((prev) => prev.map((b) => (b.id === id ? response.data : b)));
    } catch (err) {
      const msg = getErrorMessage(err, 'Не удалось изменить статус бота');
      setActionError(msg);
    }
  };

  const isFormOpen = formMode !== 'closed';

  const isDevMode = process.env.NODE_ENV === 'development';

  return (
    <div className="space-y-6">
      {isDevMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span className="font-medium">DEV</span>
          <span className="text-amber-600">|</span>
          Локальный режим — webhook&apos;и Telegram не регистрируются, некоторые функции могут быть недоступны
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Мои боты</h2>
          <p className="text-gray-600 mt-1">Управляйте вашими ботами</p>
        </div>
        {!isFormOpen && (
          <Button onClick={openCreateForm}>
            + Добавить бота
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {formMode === 'edit' ? 'Редактирование бота' : 'Новый бот'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    <div className="text-sm text-gray-500">@BotFather</div>
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
                    <div className="text-sm text-gray-500">Сообщество VK</div>
                  </div>
                </label>
              </div>
            </div>

            <Input
              label={`Токен ${botType === 'tg' ? 'Telegram' : 'VK'}`}
              placeholder={botType === 'tg' ? '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz' : 'vk1.a.xxx'}
              error={errors.token?.message}
              sensitive
              helpText={
                botType === 'tg'
                  ? 'Получите токен у @BotFather в Telegram'
                  : 'Получите токен в настройках сообщества VK'
              }
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
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                {formMode === 'edit' ? 'Сохранить' : 'Создать бота'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError('')}
            className="text-red-500 hover:text-red-700 ml-4 font-medium"
          >
            &times;
          </button>
        </div>
      )}

      {isLoadingBots ? (
        <Card>
          <div className="text-center py-8 text-gray-500">Загрузка ботов...</div>
        </Card>
      ) : bots.length === 0 && !isFormOpen ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет ботов</h3>
            <p className="text-gray-600 mb-6">Создайте вашего первого бота для начала работы</p>
            <Button onClick={openCreateForm}>
              + Добавить бота
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bots.map((bot) => {
            const status = statusConfig[bot.status] || statusConfig.created;
            return (
              <Card key={bot.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      bot.botType === 'tg' ? 'bg-blue-100' : 'bg-indigo-100'
                    }`}>
                      {bot.botType === 'tg' ? '📱' : '💬'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                      <p className="text-sm text-gray-500">
                        {bot.botType === 'tg' ? 'Telegram' : 'VK'} &middot; {bot.prompts.length} промпт(ов)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${bot.status === 'active' ? 'animate-pulse' : ''}`}></span>
                      {status.label}
                    </span>
                    {bot.id && bot.status === 'created' && (
                      <button
                        onClick={() => handleStatusChange(bot.id!, 'active')}
                        className="text-gray-400 hover:text-green-500 transition-colors p-1"
                        title="Активировать"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                      </button>
                    )}
                    {bot.id && bot.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(bot.id!, 'archived')}
                        className="text-gray-400 hover:text-yellow-500 transition-colors p-1"
                        title="В архив"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                        </svg>
                      </button>
                    )}
                    {bot.id && bot.status === 'archived' && (
                      <button
                        onClick={() => handleStatusChange(bot.id!, 'active')}
                        className="text-gray-400 hover:text-green-500 transition-colors p-1"
                        title="Восстановить"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(bot)}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                      title="Редактировать"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => bot.id && handleDelete(bot.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Удалить"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
