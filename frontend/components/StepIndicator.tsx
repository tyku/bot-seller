'use client';

import React from 'react';
import { WizardStep } from '@/lib/types';
import { useWizard } from '@/contexts/WizardContext';

const STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'register', label: 'Регистрация', icon: '👤' },
  { id: 'verify', label: 'Верификация', icon: '✉️' },
  { id: 'settings', label: 'Настройка бота', icon: '⚙️' },
  { id: 'payment', label: 'Оплата', icon: '💳' },
  { id: 'dashboard', label: 'Дашборд', icon: '🚀' },
];

export function StepIndicator() {
  const { currentStep, completedSteps, setStep, canAccessStep } = useWizard();

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const canAccess = canAccessStep(step.id);
          const isPast = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => canAccess && setStep(step.id)}
                disabled={!canAccess}
                className={`flex flex-col items-center transition-all ${
                  canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-110'
                      : isCompleted || isPast
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted || isPast ? '✓' : step.icon}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-blue-600' : isCompleted || isPast ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-all ${
                    isCompleted || isPast ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
