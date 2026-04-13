'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { systemPromptsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import type { SystemPromptAdminRow } from '@/lib/types';

export function SystemPromptsSection() {
  const [prompts, setPrompts] = useState<SystemPromptAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveErrorById, setSaveErrorById] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await systemPromptsApi.getAll();
      setPrompts(res.data ?? []);
    } catch (e) {
      setLoadError(getErrorMessage(e, 'Не удалось загрузить промпты'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!savedId) return;
    const t = window.setTimeout(() => setSavedId(null), 3500);
    return () => window.clearTimeout(t);
  }, [savedId]);

  const setTextForId = (id: string, text: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, text } : p)),
    );
    setSaveErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveOne = async (row: SystemPromptAdminRow) => {
    setSavingId(row.id);
    setSaveErrorById((prev) => ({ ...prev, [row.id]: '' }));
    try {
      const res = await systemPromptsApi.updateText(row.id, { text: row.text });
      if (res.data) {
        setPrompts((prev) =>
          prev.map((p) => (p.id === res.data.id ? res.data : p)),
        );
      }
      setSavedId(row.id);
    } catch (e) {
      setSaveErrorById((prev) => ({
        ...prev,
        [row.id]: getErrorMessage(e, 'Не удалось сохранить'),
      }));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl">
        <p className="text-sm text-gray-600">Загрузка системных промптов…</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="max-w-4xl">
        <p className="text-sm text-red-600 mb-4">{loadError}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => load()}>
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Системные промпты</h2>
      <p className="text-sm text-gray-600 mb-6">
        Тексты из коллекции <span className="font-mono text-xs">systemprompts</span>. Сохраняется только поле
        текста.
      </p>

      <div className="space-y-8">
        {prompts.length === 0 && (
          <p className="text-sm text-gray-500">Нет записей в базе.</p>
        )}
        {prompts.map((row) => (
          <div key={row.id} className="border-b border-gray-100 last:border-0 pb-8 last:pb-0">
            <h3 className="text-base font-semibold text-gray-900 mb-3">{row.name}</h3>

            <textarea
              aria-label={row.name}
              value={row.text}
              onChange={(e) => setTextForId(row.id, e.target.value)}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm min-h-[120px]"
            />

            {saveErrorById[row.id] && (
              <p className="text-sm text-red-600 mt-2">{saveErrorById[row.id]}</p>
            )}
            {savedId === row.id && (
              <p className="text-sm text-emerald-700 mt-2 font-medium" role="status">
                Сохранено
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                isLoading={savingId === row.id}
                onClick={() => saveOne(row)}
              >
                Сохранить
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
