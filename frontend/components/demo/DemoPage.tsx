'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  demoApi,
  persistDemoDraftCredentials,
  clearDemoDraftCredentials,
  type DemoDraftPayload,
} from '@/lib/demo-api';
import { getErrorMessage } from '@/lib/error-utils';

const promptSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  body: z.string().min(1, 'Введите текст'),
  type: z.literal('context'),
});

const demoFormSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  prompts: z.array(promptSchema).default([]),
});

type DemoForm = z.infer<typeof demoFormSchema>;

const defaultFormValues: DemoForm = {
  name: 'Demo bot',
  prompts: [{ name: 'greeting', body: 'Привет! Я ваш помощник.', type: 'context' }],
};

export function DemoPage() {
  const [initError, setInitError] = useState('');
  const [initLoading, setInitLoading] = useState(true);
  const [draft, setDraft] = useState<DemoDraftPayload | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ type: string; content: string; createdAt: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DemoForm>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prompts',
  });

  const ensureDraft = useCallback(async () => {
    setInitError('');
    try {
      const res = await demoApi.getDraft();
      setDraft(res.data);
      reset({
        name: res.data.name,
        prompts:
          res.data.prompts?.length > 0
            ? res.data.prompts.map((p) => ({
                name: p.name,
                body: p.body,
                type: 'context' as const,
              }))
            : defaultFormValues.prompts,
      });
    } catch {
      clearDemoDraftCredentials();
      const created = await demoApi.createDraft();
      persistDemoDraftCredentials(created.data.draftId, created.data.secret);
      const me = await demoApi.getDraft();
      setDraft(me.data);
      reset({
        name: me.data.name,
        prompts:
          me.data.prompts?.length > 0
            ? me.data.prompts.map((p) => ({
                name: p.name,
                body: p.body,
                type: 'context' as const,
              }))
            : defaultFormValues.prompts,
      });
    }
  }, [reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitLoading(true);
      try {
        await ensureDraft();
      } catch (e) {
        if (!cancelled) {
          setInitError(getErrorMessage(e, 'Не удалось загрузить демо'));
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureDraft]);

  const loadChatHistory = useCallback(async () => {
    try {
      const res = await demoApi.getChatHistory();
      setChatMessages(res.data?.messages ?? []);
    } catch {
      setChatMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!draft) return;
    loadChatHistory();
  }, [draft, loadChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatSending]);

  const onSave = async (data: DemoForm) => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await demoApi.updateDraft({
        name: data.name,
        prompts: data.prompts,
      });
      setDraft(res.data);
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(getErrorMessage(e, 'Не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!saveSuccess) return;
    const t = window.setTimeout(() => setSaveSuccess(false), 4000);
    return () => window.clearTimeout(t);
  }, [saveSuccess]);

  const onSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatError('');
    setChatInput('');
    setChatMessages((prev) => [
      ...prev,
      { type: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await demoApi.sendChat(text);
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: res.data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setChatError(getErrorMessage(e, 'Ошибка ответа'));
      setChatMessages((prev) => prev.slice(0, -1));
      setChatInput(text);
    } finally {
      setChatSending(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-600">Загрузка демо…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <p className="text-red-600 mb-4">{initError}</p>
          <Button
            onClick={() => {
              setInitError('');
              setInitLoading(true);
              ensureDraft()
                .catch((e) => setInitError(getErrorMessage(e, 'Ошибка')))
                .finally(() => setInitLoading(false));
            }}
          >
            Попробовать снова
          </Button>
        </Card>
        <Link href="/" className="mt-6 text-blue-600 hover:text-blue-800 text-sm">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      <header className="border-b border-gray-200/80 bg-white/70 backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Демо настроек бота</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Без токена и выбора мессенджера — как в кабинете, только черновик
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Войти в аккаунт
          </Link>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-1 min-h-0">
          <Card className="lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Настройки</h2>
            <form onSubmit={handleSubmit(onSave)} className="space-y-5">
              <Input
                label="Название бота"
                placeholder="Мой продающий бот"
                error={errors.name?.message}
                {...register('name')}
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

              {saveError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{saveError}</div>
              )}

              {saveSuccess && (
                <div
                  role="status"
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2.5 rounded-lg text-sm font-medium"
                >
                  Всё сохранено
                </div>
              )}

              <Button type="submit" className="w-full sm:w-auto" isLoading={saving}>
                Сохранить настройки
              </Button>
            </form>
          </Card>

          <Card className="flex flex-col h-[min(520px,calc(100vh-24rem))] min-h-[320px] p-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Напишите сообщение — ответ появится здесь.
                  </p>
                )}
                {chatMessages.map((m, i) => (
                  <div
                    key={`${m.createdAt}-${i}`}
                    className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-500">
                      Печатает…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {chatError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-700 text-sm">
                  {chatError}
                </div>
              )}

              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendChat();
                      }
                    }}
                    placeholder="Сообщение боту…"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={chatSending}
                  />
                  <Button onClick={onSendChat} disabled={chatSending || !chatInput.trim()} isLoading={chatSending}>
                    Отправить
                  </Button>
                </div>
              </div>
          </Card>
        </div>

        <p className="text-center text-sm text-gray-500 py-4 shrink-0">
          После регистрации можно перенести настройки в аккаунт и подключить токен бота.
        </p>
      </main>
    </div>
  );
}
