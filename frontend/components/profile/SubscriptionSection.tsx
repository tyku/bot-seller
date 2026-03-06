'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tariffsApi, subscriptionApi } from '@/lib/api';
import type { Tariff, ActiveSubscription } from '@/lib/types';

function formatDate(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDuration(days: number | null): string {
  if (days == null || days <= 0) return 'по умолчанию';
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

export function SubscriptionSection() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTariff, setConfirmTariff] = useState<Tariff | null>(null);
  const [paymentTariff, setPaymentTariff] = useState<Tariff | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tariffsRes, subRes] = await Promise.all([
          tariffsApi.getAll(true),
          subscriptionApi.getCurrent(),
        ]);
        if (!cancelled) {
          setTariffs(tariffsRes.data ?? []);
          setCurrentSubscription(subRes.data ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTariffId = currentSubscription?.tariff?.id ?? null;
  const hasActiveSubscription = !!currentSubscription;

  const handleSelectTariff = (tariff: Tariff) => {
    if (tariff.id === activeTariffId) return;
    setConfirmTariff(tariff);
  };

  const handleConfirmChoice = () => {
    if (confirmTariff) {
      setPaymentTariff(confirmTariff);
      setConfirmTariff(null);
    }
  };

  const handleBackFromPayment = () => {
    setPaymentTariff(null);
  };

  // Payment step: crypto, card, SBP
  if (paymentTariff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackFromPayment}>
            ← Назад к тарифам
          </Button>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Оплата</h2>
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{paymentTariff.name}</h3>
            <p className="text-2xl font-bold text-blue-600">{paymentTariff.price} ₽</p>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Запросы: {paymentTariff.limits.requests === 0 ? 'по умолчанию' : paymentTariff.limits.requests.toLocaleString()}</li>
            <li>• Активных чатов: {paymentTariff.limits.chats === 0 ? '—' : paymentTariff.limits.chats.toLocaleString()}</li>
            <li>• Ботов: {paymentTariff.limits.bots === 0 ? '—' : paymentTariff.limits.bots.toLocaleString()}</li>
            <li>• Срок: {formatDuration(paymentTariff.activityDurationDays)}</li>
            {paymentTariff.limits.bots > 1 && (
              <li className="text-gray-500 italic">Лимиты общие на всех ботов</li>
            )}
          </ul>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Способ оплаты</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
            >
              <span className="text-3xl">₿</span>
              <span className="font-semibold text-gray-900">Криптовалюта</span>
              <span className="text-sm text-gray-500">BTC, USDT и др.</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
            >
              <span className="text-3xl">💳</span>
              <span className="font-semibold text-gray-900">Банковская карта</span>
              <span className="text-sm text-gray-500">Visa, Mastercard, МИР</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
            >
              <span className="text-3xl">📱</span>
              <span className="font-semibold text-gray-900">СБП</span>
              <span className="text-sm text-gray-500">Система быстрых платежей</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Выберите способ оплаты — на следующем шаге откроется платёжная форма.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Тариф и лимиты</h2>
        <p className="text-gray-500">Загрузка тарифов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Тариф и лимиты</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Тариф и лимиты</h2>
        <p className="text-gray-600 mt-1">
          Управление подпиской и отслеживание использования
        </p>
      </div>

      {/* Current plan — only if there is an active paid tariff */}
      {currentSubscription && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Текущий тариф</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {currentSubscription.tariff.name}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {currentSubscription.tariff.price} ₽
              </p>
              <p className="text-sm text-gray-500">
                {currentSubscription.expiresAt
                  ? `до ${formatDate(currentSubscription.expiresAt)}`
                  : 'бессрочно'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Активен
            </span>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-700 mb-2">Лимиты и возможности:</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Запросы: {currentSubscription.tariff.limits.requests === 0 ? 'по умолчанию' : currentSubscription.tariff.limits.requests.toLocaleString()}</li>
              <li>• Активных чатов: {currentSubscription.tariff.limits.chats === 0 ? '—' : currentSubscription.tariff.limits.chats.toLocaleString()}</li>
              <li>• Ботов: {currentSubscription.tariff.limits.bots === 0 ? '—' : currentSubscription.tariff.limits.bots.toLocaleString()}</li>
              <li>• Срок: {formatDuration(currentSubscription.tariff.activityDurationDays)}</li>
              {currentSubscription.tariff.limits.bots > 1 && (
                <li className="text-gray-500 italic">Лимиты общие на всех ботов</li>
              )}
              {currentSubscription.expiresAt && (
                <li>• Действует до: {formatDate(currentSubscription.expiresAt)}</li>
              )}
            </ul>
          </div>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            После оплаты тариф изменить нельзя. Новый тариф можно оформить только после окончания текущего.
          </p>
        </Card>
      )}

      {/* All plans from backend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Все тарифы</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tariffs.map((tariff) => {
            const isCurrent = tariff.id === activeTariffId;
            return (
              <Card
                key={tariff.id}
                className={`relative ${
                  isCurrent ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">
                    {tariff.name}
                  </h4>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-3xl font-bold text-blue-600">
                      {tariff.price}
                    </span>
                    <span className="text-gray-500 mb-0.5">₽</span>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-gray-700 mb-2">Лимиты и возможности:</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Запросы: {tariff.limits.requests === 0 ? 'по умолчанию' : tariff.limits.requests.toLocaleString()}</li>
                    <li>• Активных чатов: {tariff.limits.chats === 0 ? '—' : tariff.limits.chats.toLocaleString()}</li>
                    <li>• Ботов: {tariff.limits.bots === 0 ? '—' : tariff.limits.bots.toLocaleString()}</li>
                    <li>• Срок: {formatDuration(tariff.activityDurationDays)}</li>
                    {tariff.limits.bots > 1 && (
                      <li className="text-gray-500 italic">Лимиты общие на всех ботов</li>
                    )}
                  </ul>
                </div>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'primary'}
                  disabled={isCurrent}
                  onClick={() => handleSelectTariff(tariff)}
                >
                  {isCurrent ? 'Текущий тариф' : 'Выбрать'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmTariff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Подтверждение выбора
            </h3>
            <p className="text-gray-600 mb-4">
              Тариф «{confirmTariff.name}» — {confirmTariff.price} ₽. После подтверждения вы перейдёте на страницу оплаты (криптовалюта, карта, СБП).
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmTariff(null)}>
                Отмена
              </Button>
              <Button variant="primary" onClick={handleConfirmChoice}>
                Перейти к оплате
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
