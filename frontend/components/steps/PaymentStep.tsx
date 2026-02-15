'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWizard } from '@/contexts/WizardContext';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 990,
    period: 'месяц',
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
    features: [
      'До 1000 сообщений в день',
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

export function PaymentStep() {
  const { setStep, completeStep } = useWizard();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    // Симуляция оплаты
    setTimeout(() => {
      completeStep('payment');
      setStep('dashboard');
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Выберите тариф</h1>
        <p className="text-gray-600">Выберите план, который подходит вашему бизнесу</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? 'ring-4 ring-blue-500 shadow-xl'
                : 'hover:shadow-xl'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Рекомендуем
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-end justify-center gap-1">
                <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                <span className="text-gray-600 mb-1">₽/{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-center">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {selectedPlan === plan.id && (
                  <span className="text-white text-sm">✓</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Выбранный тариф:</span>
            <span className="font-semibold">
              {PLANS.find((p) => p.id === selectedPlan)?.name}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Стоимость:</span>
            <span className="text-2xl font-bold text-blue-600">
              {PLANS.find((p) => p.id === selectedPlan)?.price} ₽
            </span>
          </div>

          <Button
            onClick={handlePayment}
            className="w-full"
            size="lg"
            isLoading={isProcessing}
          >
            {isProcessing ? 'Обработка платежа...' : 'Оплатить'}
          </Button>

          <button
            onClick={() => setStep('settings')}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-800"
          >
            Назад к настройкам
          </button>
        </div>
      </Card>
    </div>
  );
}
