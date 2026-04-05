'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { settingsApi, debugChatApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/error-utils';
import type { BotSettings } from '@/lib/types';

const BOT_PARAM = 'bot';

export interface DebugMessage {
  type: string;
  content: string;
  createdAt: string;
}

export function DebugSection() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bots, setBots] = useState<BotSettings[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const botParam = searchParams.get(BOT_PARAM);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load bots and sync selected bot from URL
  useEffect(() => {
    const init = async () => {
      if (!user?.customerId) return;
      setLoading(true);
      setError('');
      try {
        const res = await settingsApi.getAll(user.customerId.toString());
        const list: BotSettings[] = res.data || [];
        setBots(list);
        const preferredId = botParam && list.some((b: BotSettings) => b.id === botParam) ? botParam : list[0]?.id ?? null;
        setSelectedBotId(preferredId);
      } catch (err) {
        setError(getErrorMessage(err, 'Не удалось загрузить список ботов'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.customerId, botParam]);

  // Load history when selected bot changes
  useEffect(() => {
    if (!selectedBotId) {
      setMessages([]);
      return;
    }
    const load = async () => {
      try {
        const res = await debugChatApi.getHistory(selectedBotId);
        setMessages(res.data?.messages ?? []);
      } catch (err) {
        setMessages([]);
      }
    };
    load();
  }, [selectedBotId]);

  const setBotInUrl = useCallback(
    (botId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'debug');
      if (botId) params.set(BOT_PARAM, botId);
      else params.delete(BOT_PARAM);
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSelectBot = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null;
    setSelectedBotId(id);
    setBotInUrl(id);
  };

  const handleResetOperatorMode = async () => {
    if (!selectedBotId || resetting) return;
    setResetting(true);
    setError('');
    try {
      await debugChatApi.resetMode(selectedBotId);
      if (selectedBotId) {
        const res = await debugChatApi.getHistory(selectedBotId);
        setMessages(res.data?.messages ?? []);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось сбросить режим'));
    } finally {
      setResetting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedBotId || sending) return;
    setSending(true);
    setError('');
    setInput('');
    setMessages((prev) => [
      ...prev,
      { type: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    scrollToBottom();
    try {
      const res = await debugChatApi.send(selectedBotId, text);
      const line = res.data.reply?.trim() ? res.data.reply : '—';
      setMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: line,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Ошибка ответа бота'));
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </Card>
    );
  }

  if (bots.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Тест бота</h2>
          <p className="text-gray-600 mb-4">
            Создайте бота в разделе «Боты», чтобы тестировать диалог здесь.
          </p>
          <Button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('tab', 'bots');
              router.push(`/?${params.toString()}`, { scroll: false });
            }}
          >
            Перейти к ботам
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Тест бота</h2>
        <p className="text-gray-600 mt-1">
          Выберите бота и общайтесь с ним как в реальном чате. Тестовые диалоги не списывают лимиты.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-16rem)] min-h-[420px] p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Бот</label>
            <select
              value={selectedBotId ?? ''}
              onChange={handleSelectBot}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Выберите бота</option>
              {bots.map((b) => (
                <option key={b.id} value={b.id ?? ''}>
                  {b.name} {b.botType === 'tg' ? '(TG)' : '(VK)'}
                </option>
              ))}
            </select>
          </div>
          {selectedBotId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetOperatorMode}
              disabled={resetting}
              isLoading={resetting}
            >
              Сбросить режим теста
            </Button>
          )}
        </div>

        {!selectedBotId ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-6">
            Выберите бота из списка выше
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  Напишите сообщение — ответ бота появится здесь. История тестового диалога сохраняется.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
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
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-500">
                    Печатает...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Сообщение..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending || !input.trim()} isLoading={sending}>
                  Отправить
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
