'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { customerApi } from '@/lib/api';

export function OrganizationSection() {
  const { user, setUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        try {
          const response = await customerApi.getMe();
          setUser(response.data);
          setName(response.data?.name || '');
        } catch (err: any) {
          if (err.statusCode === 401) {
            logout();
          }
        }
      }
    };
    fetchUser();
  }, [user, setUser, logout]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const response = await customerApi.updateMe({ name });
      if (response.data) {
        setUser(response.data);
      }
      setIsEditing(false);
    } catch (err: any) {
      if (err.statusCode === 401) {
        logout();
        return;
      }
      setError(err.message || 'Не удалось сохранить');
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
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ID клиента</label>
            <p className="text-gray-900 font-medium">{user?.customerId ?? '—'}</p>
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

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setError('');
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
