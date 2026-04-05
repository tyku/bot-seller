'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { inboxApi, settingsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/error-utils';
import type { BotSettings } from '@/lib/types';

type PlatformFilter = 'all' | 'tg' | 'vk';

function platformLabel(p: string): string {
  if (p === 'tg') return 'Telegram';
  if (p === 'vk') return 'VK';
  return p;
}

function messageTypeLabel(type: string): string {
  switch (type) {
    case 'user':
      return 'Пользователь';
    case 'assistant':
      return 'Бот';
    case 'system':
      return 'Система';
    case 'operator':
      return 'Оператор';
    default:
      return type;
  }
}

export function InboxSection() {
  const { user } = useAuth();
  const [botNameById, setBotNameById] = useState<Record<string, string>>({});
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [items, setItems] = useState<
    Array<{
      id: string;
      platform: string;
      chatId: string;
      botId: string;
      controlMode: string;
      updatedAt: string;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    platform: string;
    chatId: string;
    botId: string;
    controlMode: string;
    messages: Array<{ type: string; content: string; createdAt: string }>;
  } | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [operatorText, setOperatorText] = useState('');
  const [sending, setSending] = useState(false);
  const [modeUpdating, setModeUpdating] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const platformParam = useMemo(() => {
    if (platformFilter === 'all') return undefined;
    return platformFilter;
  }, [platformFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  useEffect(() => {
    const loadBots = async () => {
      if (!user?.customerId) return;
      try {
        const res = await settingsApi.getAll(user.customerId.toString());
        const list: BotSettings[] = res.data || [];
        const map: Record<string, string> = {};
        for (const b of list) {
          if (b.id) map[b.id] = b.name;
        }
        setBotNameById(map);
      } catch {
        setBotNameById({});
      }
    };
    loadBots();
  }, [user?.customerId]);

  const loadList = useCallback(async () => {
    if (!user?.customerId) return;
    setListLoading(true);
    setError('');
    try {
      const res = await inboxApi.list({
        platform: platformParam,
        page: 0,
        limit: 50,
      });
      setItems(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось загрузить диалоги'));
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.customerId, platformParam]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await inboxApi.getOne(id);
      setDetail(res.data);
    } catch (err) {
      setDetail(null);
      setError(getErrorMessage(err, 'Не удалось загрузить диалог'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const handleSendOperator = async () => {
    const text = operatorText.trim();
    if (!selectedId || !text || sending) return;
    setSending(true);
    setError('');
    try {
      await inboxApi.sendOperator(selectedId, text);
      setOperatorText('');
      await loadDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось отправить'));
    } finally {
      setSending(false);
    }
  };

  const handleToggleMode = async (next: 'bot' | 'operator') => {
    if (!selectedId || modeUpdating) return;
    setModeUpdating(true);
    setError('');
    try {
      await inboxApi.setControlMode(selectedId, next);
      await loadDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось сменить режим'));
    } finally {
      setModeUpdating(false);
    }
  };

  const filteredItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Диалоги</h2>
        <p className="text-gray-600 mt-1 text-sm">
          Переписки из подключённых каналов (Telegram, VK). Демо-черновики и тест «Тест бота» сюда не
          попадают.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-800 text-sm px-4 py-3 border border-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">Канал:</span>
        {(['all', 'tg', 'vk'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setPlatformFilter(f);
              setSelectedId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              platformFilter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Все' : platformLabel(f)}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-2">всего: {total}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[480px]">
        <Card className="p-4 flex flex-col min-h-0">
          <h3 className="font-semibold text-gray-900 mb-3">Список</h3>
          <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg max-h-[520px]">
            {listLoading ? (
              <p className="p-4 text-gray-500 text-sm">Загрузка…</p>
            ) : filteredItems.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">Нет диалогов</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredItems.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                        selectedId === row.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {platformLabel(row.platform)} · чат {row.chatId}
                      </div>
                      <div className="text-gray-600 truncate">
                        {botNameById[row.botId] ?? row.botId}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {row.controlMode === 'operator' ? 'Оператор' : 'Бот'} ·{' '}
                        {new Date(row.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-4 flex flex-col min-h-0">
          <h3 className="font-semibold text-gray-900 mb-3">Сообщения</h3>
          {!selectedId ? (
            <p className="text-gray-500 text-sm">Выберите диалог слева</p>
          ) : detailLoading ? (
            <p className="text-gray-500 text-sm">Загрузка…</p>
          ) : !detail ? (
            <p className="text-gray-500 text-sm">Нет данных</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3 items-center">
                <span className="text-xs text-gray-500">
                  Режим: {detail.controlMode === 'operator' ? 'оператор' : 'бот'}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={modeUpdating || detail.controlMode === 'operator'}
                  onClick={() => handleToggleMode('operator')}
                >
                  Передать оператору
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={modeUpdating || detail.controlMode === 'bot'}
                  onClick={() => handleToggleMode('bot')}
                >
                  Вернуть боту
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg p-3 max-h-[320px] space-y-3 mb-4 bg-gray-50/50">
                {detail.messages.map((m, i) => (
                  <div
                    key={`${m.createdAt}-${i}`}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      m.type === 'operator'
                        ? 'bg-amber-50 border border-amber-100 ml-4'
                        : m.type === 'user'
                          ? 'bg-white border border-gray-200 mr-4'
                          : m.type === 'assistant'
                            ? 'bg-blue-50 border border-blue-100 ml-4'
                            : 'bg-gray-100 text-gray-700 mx-2'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-500 mb-0.5">
                      {messageTypeLabel(m.type)} ·{' '}
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Сообщение от оператора
                </label>
                <textarea
                  value={operatorText}
                  onChange={(e) => setOperatorText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Текст уйдёт пользователю в канал (Telegram) и сохранится в истории…"
                  disabled={sending}
                />
                <Button type="button" onClick={handleSendOperator} disabled={sending || !operatorText.trim()}>
                  {sending ? 'Отправка…' : 'Отправить'}
                </Button>
                {detail.platform === 'vk' && (
                  <p className="text-xs text-amber-700">
                    VK: запись в истории есть; доставка в мессенджер пока не подключена.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
