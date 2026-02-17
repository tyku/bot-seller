'use client';

import React from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { StepIndicator } from '@/components/StepIndicator';
import { RegisterStep } from '@/components/steps/RegisterStep';
import { VerifyStep } from '@/components/steps/VerifyStep';
import { ProfilePage } from '@/components/profile/ProfilePage';

function AppContent() {
  const { currentStep } = useWizard();

  // Profile has its own full-page layout
  if (currentStep === 'profile') {
    return <ProfilePage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bot Seller
          </h1>
          <p className="text-gray-600">
            Создайте продающего бота за 5 минут
          </p>
        </div>

        <StepIndicator />

        <div className="mt-8">
          {currentStep === 'register' && <RegisterStep />}
          {currentStep === 'verify' && <VerifyStep />}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <WizardProvider>
      <AppContent />
    </WizardProvider>
  );
}
