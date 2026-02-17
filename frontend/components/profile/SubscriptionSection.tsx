'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 990,
    period: 'месяц',
    messagesPerDay: 100,
    botsLimit: 1,
    features: [
      'До 100 сообщений в день',
      'Базовая аналитика',
      'Email поддержка',
      '1 бот',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2990,
    period: 'месяц',
    messagesPerDay: 1000,
    botsLimit: 5,
    features: [
      'До 1 000 сообщений в день',
      'Расширенная аналитика',
      'Приоритетная поддержка',
      'До 5 ботов',
      'Интеграция с CRM',
    ],
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 9990,
    period: 'месяц',
    messagesPerDay: -1,
    botsLimit: -1,
    features: [
      'Безлимитные сообщения',
      'Полная аналитика + отчеты',
      'Персональный менеджер',
      'Неограниченное количество ботов',
      'API доступ',
      'Кастомные интеграции',
    ],
  },
];

const CURRENT_PLAN = PLANS[1]; // Pro plan as default stub
const MESSAGES_USED = 342;
const MESSAGES_LIMIT = CURRENT_PLAN.messagesPerDay;
const BOTS_USED = 2;
const BOTS_LIMIT = CURRENT_PLAN.botsLimit;

export function SubscriptionSection() {
  const messagesPercent = MESSAGES_LIMIT > 0
    ? Math.min((MESSAGES_USED / MESSAGES_LIMIT) * 100, 100)
    : 0;
  const botsPercent = BOTS_LIMIT > 0
    ? Math.min((BOTS_USED / BOTS_LIMIT) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Тариф и лимиты</h2>
        <p className="text-gray-600 mt-1">Управление подпиской и отслеживание использования</p>
      </div>

      {/* Current plan */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Текущий тариф</p>
            <h3 className="text-2xl font-bold text-gray-900">{CURRENT_PLAN.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{CURRENT_PLAN.price} ₽</p>
            <p className="text-sm text-gray-500">/ {CURRENT_PLAN.period}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Активен
          </span>
          <span className="text-sm text-gray-500">
            Следующее списание: 17 марта 2026
          </span>
        </div>

        <div className="border-t pt-4">
          <ul className="grid grid-cols-2 gap-2">
            {CURRENT_PLAN.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Usage / Limits */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Сообщения сегодня</h3>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-gray-900">{MESSAGES_USED}</span>
              <span className="text-gray-500 text-sm">
                из {MESSAGES_LIMIT > 0 ? MESSAGES_LIMIT.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  messagesPercent > 80 ? 'bg-red-500' : messagesPercent > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${messagesPercent}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {MESSAGES_LIMIT > 0
                ? `Использовано ${messagesPercent.toFixed(0)}% дневного лимита`
                : 'Безлимитные сообщения'}
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Боты</h3>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-gray-900">{BOTS_USED}</span>
              <span className="text-gray-500 text-sm">
                из {BOTS_LIMIT > 0 ? BOTS_LIMIT : '∞'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  botsPercent > 80 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${BOTS_LIMIT > 0 ? botsPercent : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {BOTS_LIMIT > 0
                ? `Использовано ${BOTS_USED} из ${BOTS_LIMIT} ботов`
                : 'Неограниченное количество ботов'}
            </p>
          </div>
        </Card>
      </div>

      {/* All plans */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Все тарифы</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === CURRENT_PLAN.id;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isCurrent ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-xs font-semibold">
                    Рекомендуем
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h4>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-3xl font-bold text-blue-600">{plan.price}</span>
                    <span className="text-gray-500 mb-0.5">₽/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'primary'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Текущий тариф' : 'Выбрать'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment info stub */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Способ оплаты</h3>
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
            VISA
          </div>
          <div>
            <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
            <p className="text-sm text-gray-500">Истекает 12/27</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto">
            Изменить
          </Button>
        </div>
      </Card>
    </div>
  );
}
