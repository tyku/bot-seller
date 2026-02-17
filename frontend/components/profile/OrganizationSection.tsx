'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWizard } from '@/contexts/WizardContext';
import { customerApi } from '@/lib/api';

export function OrganizationSection() {
  const { user, setUser } = useWizard();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        try {
          const response = await customerApi.getMe();
          setUser(response.data);
          setName(response.data?.name || '');
        } catch (err) {
          console.error('Failed to fetch user:', err);
        }
      }
    };
    fetchUser();
  }, [user, setUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // stub - just update local state
      if (user) {
        setUser({ ...user, name });
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Организация</h2>
        <p className="text-gray-600 mt-1">Информация о вашей организации</p>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Основные данные</h3>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">ID клиента</label>
              <p className="text-gray-900 font-medium">{user?.customerId ?? '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Статус</label>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                user?.status === 'verified'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  user?.status === 'verified' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
                {user?.status === 'verified' ? 'Верифицирован' : 'Не верифицирован'}
              </span>
            </div>
          </div>

          <div className="border-t pt-5">
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="Название организации"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ООО Моя Компания"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name || '');
                    }}
                  >
                    Отмена
                  </Button>
                  <Button onClick={handleSave} isLoading={isSaving}>
                    Сохранить
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Название</label>
                  <p className="text-gray-900 font-medium">{user?.name || 'Не указано'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Редактировать
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <div className="grid grid-cols-2 gap-6">
              {user?.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              )}
              {user?.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Телефон</label>
                  <p className="text-gray-900">{user.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Безопасность</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Двухфакторная аутентификация</p>
              <p className="text-sm text-gray-500">Дополнительная защита аккаунта</p>
            </div>
            <span className="text-sm text-gray-400">Скоро</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">API ключи</p>
              <p className="text-sm text-gray-500">Управление доступом через API</p>
            </div>
            <span className="text-sm text-gray-400">Скоро</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
