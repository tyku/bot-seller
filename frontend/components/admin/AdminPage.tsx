'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SystemPromptsSection } from '@/components/admin/SystemPromptsSection';
import { useAuth } from '@/contexts/AuthContext';
import { customerApi } from '@/lib/api';
import { isAdmin } from '@/lib/auth';

export function AdminPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }
      try {
        const res = await customerApi.getMe();
        if (!cancelled && res.data) {
          setUser(res.data);
        }
      } catch {
        // 401 → session-expired clears auth
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setUser]);

  const allowed = isAdmin(user);

  useEffect(() => {
    if (checking || !isAuthenticated || allowed) return;
    router.replace('/');
  }, [checking, isAuthenticated, allowed, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <p className="text-sm text-gray-600">Загрузка…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 gap-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Нужен вход</h1>
          <p className="text-sm text-gray-600 mb-6">Войдите в аккаунт, чтобы открыть админ-панель.</p>
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            На главную
          </Link>
        </Card>
      </div>
    );
  }

  if (!allowed && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <p className="text-sm text-gray-600">Перенаправление…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      <header className="border-b border-gray-200/80 bg-white/70 backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-600">Админ-панель</p>
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            На главную
          </Link>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">
        <SystemPromptsSection />
      </main>
    </div>
  );
}
