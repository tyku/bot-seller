'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWizard } from '@/contexts/WizardContext';
import { settingsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';

export function DashboardStep() {
  const { user, settings: wizardSettings, setStep } = useWizard();
  const [settings, setSettings] = useState(wizardSettings);
  const [stats, setStats] = useState({
    messages: 0,
    users: 0,
    conversions: 0,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (user && !settings) {
        try {
          const response = await settingsApi.getAll(user.customerId.toString());
          if (response.data.length > 0) {
            setSettings(response.data[0]);
          }
        } catch (err) {
          const errorMessage = getErrorMessage(err, 'Не удалось загрузить настройки');
          console.error('Failed to fetch settings:', errorMessage, err);
        }
      }
    };
    fetchSettings();
  }, [user, settings]);

  // Симуляция статистики
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        messages: prev.messages + Math.floor(Math.random() * 5),
        users: prev.users + Math.floor(Math.random() * 2),
        conversions: prev.conversions + (Math.random() > 0.8 ? 1 : 0),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Дашборд</h1>
        <p className="text-gray-600">Управляйте вашим ботом и отслеживайте результаты</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Сообщений</p>
              <p className="text-3xl font-bold text-gray-900">{stats.messages}</p>
            </div>
            <div className="text-4xl">💬</div>
          </div>
          <div className="mt-2 text-sm text-green-600">+12% за последний час</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Пользователей</p>
              <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <div className="mt-2 text-sm text-green-600">+8% за последний час</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Конверсий</p>
              <p className="text-3xl font-bold text-gray-900">{stats.conversions}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
          <div className="mt-2 text-sm text-green-600">+15% за последний час</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Настройки бота</h2>
          {settings ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Название:</span>
                <span className="font-semibold">{settings.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Тип:</span>
                <span className="font-semibold">
                  {settings.botType === 'tg' ? 'Telegram' : 'VK'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Промптов:</span>
                <span className="font-semibold">{settings.prompts.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Статус:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-600 font-semibold">Активен</span>
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setStep('settings')}
              >
                Редактировать настройки
              </Button>
            </div>
          ) : (
            <p className="text-gray-500">Загрузка настроек...</p>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">📊</span>
              Посмотреть полную аналитику
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">💬</span>
              История диалогов
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">🔔</span>
              Настроить уведомления
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setStep('payment')}
            >
              <span className="mr-2">💳</span>
              Изменить тариф
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Последние сообщения</h2>
        <div className="space-y-3">
          {[
            { user: 'Иван Петров', message: 'Здравствуйте, хочу узнать о продукте', time: '2 мин назад' },
            { user: 'Мария Смирнова', message: 'Какая стоимость доставки?', time: '5 мин назад' },
            { user: 'Алексей Иванов', message: 'Спасибо за помощь!', time: '10 мин назад' },
          ].map((msg, index) => (
            <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {msg.user[0]}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900">{msg.user}</span>
                  <span className="text-xs text-gray-500">{msg.time}</span>
                </div>
                <p className="text-gray-600 text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
