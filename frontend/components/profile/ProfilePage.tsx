'use client';

import React, { useState } from 'react';
import { ProfileTab } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { BotsSection } from './BotsSection';
import { OrganizationSection } from './OrganizationSection';
import { SubscriptionSection } from './SubscriptionSection';

const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'bots', label: 'Боты', icon: '🤖' },
  { id: 'organization', label: 'Организация', icon: '🏢' },
  { id: 'subscription', label: 'Тариф', icon: '💳' },
];

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('bots');

  const renderContent = () => {
    switch (activeTab) {
      case 'bots':
        return <BotsSection />;
      case 'organization':
        return <OrganizationSection />;
      case 'subscription':
        return <SubscriptionSection />;
      default:
        return <BotsSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold text-gray-900">Bot Seller</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.email || user?.phone || 'Пользователь'}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
