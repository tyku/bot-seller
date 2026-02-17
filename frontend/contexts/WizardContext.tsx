'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WizardStep, WizardState, User, BotSettings } from '@/lib/types';

interface WizardContextType extends WizardState {
  setStep: (step: WizardStep) => void;
  setUser: (user: User | null) => void;
  setSettings: (settings: BotSettings | null) => void;
  completeStep: (step: WizardStep) => void;
  canAccessStep: (step: WizardStep) => boolean;
  logout: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

const STEP_ORDER: WizardStep[] = ['register', 'verify', 'profile'];

const INITIAL_STATE: WizardState = {
  currentStep: 'register',
  completedSteps: [],
  user: null,
  settings: null,
};

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  useEffect(() => {
    const saved = localStorage.getItem('wizardState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error('Failed to parse saved wizard state', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('wizardState', JSON.stringify(state));
  }, [state]);

  const setStep = (step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const setUser = (user: User | null) => {
    setState((prev) => ({ ...prev, user }));
  };

  const setSettings = (settings: BotSettings | null) => {
    setState((prev) => ({ ...prev, settings }));
  };

  const completeStep = (step: WizardStep) => {
    setState((prev) => {
      if (prev.completedSteps.includes(step)) return prev;
      return {
        ...prev,
        completedSteps: [...prev.completedSteps, step],
      };
    });
  };

  const canAccessStep = (step: WizardStep): boolean => {
    const stepIndex = STEP_ORDER.indexOf(step);
    if (stepIndex === 0) return true;

    for (let i = 0; i < stepIndex; i++) {
      if (!state.completedSteps.includes(STEP_ORDER[i])) {
        return false;
      }
    }
    return true;
  };

  const logout = () => {
    localStorage.removeItem('wizardState');
    localStorage.removeItem('token');
    localStorage.removeItem('registrationEmail');
    localStorage.removeItem('registrationPhone');
    localStorage.removeItem('verificationMethod');
    localStorage.removeItem('telegramBotUsername');
    setState(INITIAL_STATE);
  };

  return (
    <WizardContext.Provider
      value={{
        ...state,
        setStep,
        setUser,
        setSettings,
        completeStep,
        canAccessStep,
        logout,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
