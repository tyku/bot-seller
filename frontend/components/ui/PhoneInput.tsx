'use client';

import React from 'react';
import { useIMask } from 'react-imask';

interface PhoneInputProps {
  label?: string;
  error?: string;
  onComplete?: (phone: string) => void;
  onChange?: (phone: string) => void;
}

export function PhoneInput({ label, error, onComplete, onChange }: PhoneInputProps) {
  const { ref } = useIMask(
    {
      mask: '+7 (000) 000-00-00',
      lazy: false,
    },
    {
      onAccept: (_val, mask) => {
        const digits = mask.unmaskedValue;
        onChange?.(digits.length > 0 ? `+7${digits}` : '');
      },
      onComplete: (_val, mask) => {
        onComplete?.(`+7${mask.unmaskedValue}`);
      },
    },
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type="tel"
        inputMode="tel"
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
