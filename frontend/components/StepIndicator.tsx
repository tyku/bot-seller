'use client';

import React from 'react';
import { WizardStep } from '@/lib/types';
import { useWizard } from '@/contexts/WizardContext';

const STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'register', label: 'Регистрация', icon: '👤' },
  { id: 'verify', label: 'Верификация', icon: '✉️' },
];

export function StepIndicator() {
  const { currentStep, completedSteps } = useWizard();

  // Don't show step indicator on the profile page
  if (currentStep === 'profile') return null;

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-center max-w-md mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
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
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded transition-all ${
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
