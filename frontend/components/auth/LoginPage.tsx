'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import { authApi, customerApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const emailSchema = z.object({
  contact: z
    .string()
    .min(1, 'Введите email')
    .email('Введите корректный email'),
});

const codeSchema = z.object({
  code: z.string().min(4, 'Минимум 4 символа'),
});

type ContactForm = { contact: string };
type CodeForm = z.infer<typeof codeSchema>;

type InputMethod = 'email' | 'phone';

export function LoginPage() {
  const { setUser } = useAuth();
  const [step, setStep] = useState<'contact' | 'code'>('contact');
  const [inputMethod, setInputMethod] = useState<InputMethod>('email');
  const [contact, setContact] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [method, setMethod] = useState<'email' | 'telegram'>('email');
  const [botUsername, setBotUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const emailForm = useForm<ContactForm>({
    resolver: zodResolver(emailSchema),
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
  });

  useEffect(() => {
    setError('');
    setPhoneError('');
    setPhoneValue('');
    emailForm.reset();
  }, [inputMethod]);

  const handleSubmitContact = async (contactValue: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.enter(contactValue);
      const detectedMethod = response.data?.method || (inputMethod === 'email' ? 'email' : 'telegram');

      setContact(contactValue);
      setMethod(detectedMethod);

      if (response.data?.botUsername) {
        setBotUsername(response.data.botUsername);
      }
      if (response.data?.telegramLink) {
        window.open(response.data.telegramLink, '_blank');
      }

      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitEmail = (data: ContactForm) => handleSubmitContact(data.contact);

  const onSubmitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\+7\d{10}$/.test(phoneValue)) {
      setPhoneError('Введите полный номер телефона');
      return;
    }
    setPhoneError('');
    handleSubmitContact(phoneValue);
  };

  const onSubmitCode = async (data: CodeForm) => {
    setIsLoading(true);
    setError('');

    try {
      const verifyPayload = {
        ...(method === 'email' ? { email: contact } : { phone: contact }),
        code: data.code,
        method,
      };

      const verifyResponse = await authApi.verify(verifyPayload);
      if (verifyResponse.data?.customer) {
        setUser(verifyResponse.data.customer);
      } else {
        const meResponse = await customerApi.getMe();
        setUser(meResponse.data);
      }
    } catch (err: any) {
      setError(err.message || 'Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await authApi.resendCode(contact, method);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      setError('Не удалось отправить код повторно');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    setStep('contact');
    setError('');
    codeForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo + tagline */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-5">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bot Seller</h1>
          <p className="text-gray-500 mt-2">Создайте продающего бота за 5 минут</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 border border-white/60 p-8">
          {step === 'contact' && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Войти или создать аккаунт</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Отправим код подтверждения
                </p>
              </div>

              {/* Method toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setInputMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    inputMethod === 'email'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    inputMethod === 'phone'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  Телефон
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {inputMethod === 'email' ? (
                <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-5">
                  <Input
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="ivan@example.com"
                    error={emailForm.formState.errors.contact?.message}
                    {...emailForm.register('contact')}
                  />
                  <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                    Получить код
                  </Button>
                </form>
              ) : (
                <form onSubmit={onSubmitPhone} className="space-y-5">
                  <PhoneInput
                    label="Номер телефона"
                    error={phoneError}
                    onChange={(phone) => setPhoneValue(phone)}
                  />
                  <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                    Получить код
                  </Button>
                </form>
              )}
            </>
          )}

          {step === 'code' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 mb-4">
                  {method === 'email' ? (
                    <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">Введите код</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Отправили на {method === 'email' ? 'email' : 'Telegram'}
                </p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{contact}</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {resendSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl text-sm">
                  Код отправлен повторно!
                </div>
              )}

              <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="space-y-5">
                <Input
                  label="Код подтверждения"
                  placeholder="123456"
                  autoFocus
                  error={codeForm.formState.errors.code?.message}
                  helpText={
                    method === 'telegram'
                      ? 'Код придет в Telegram на ваш номер'
                      : 'Проверьте папку Спам, если код не пришел'
                  }
                  {...codeForm.register('code')}
                />

                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                  Подтвердить
                </Button>

                {method === 'telegram' && botUsername && (
                  <a
                    href={`https://t.me/${botUsername}?start=auth`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button type="button" variant="outline" className="w-full">
                      <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                      </svg>
                      Открыть бота за кодом
                    </Button>
                  </a>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isResending ? 'Отправка...' : 'Отправить ещё раз'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Нажимая «Получить код», вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  );
}
