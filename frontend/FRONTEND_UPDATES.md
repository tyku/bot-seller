# Обновления фронтенда для нового модуля верификации

## ✅ Что обновлено

### 1. `lib/api.ts`

#### Обновлён метод `authApi.verify()`
Теперь требует параметр `method`:

```typescript
// До
authApi.verify({ email, code })

// После
authApi.verify({ 
  email, 
  code, 
  method: 'email' | 'telegram' | 'sms' 
})
```

#### Добавлено новое API: `verificationApi`
```typescript
// Отправить код верификации (требует авторизацию)
await verificationApi.send({
  email: 'user@example.com',
  type: 'email'
});

// Проверить код (публичный endpoint)
await verificationApi.verify({
  email: 'user@example.com',
  code: '123456',
  type: 'email'
});

// Получить историю верификаций (требует авторизацию)
await verificationApi.getMyVerifications();
```

### 2. `components/steps/VerifyStep.tsx`

Обновлён для передачи `method` при верификации:

```typescript
await authApi.verify({
  email,
  code: data.code,
  method, // <- добавлено
});
```

### 3. `lib/types.ts`

Добавлены новые типы:

```typescript
export type VerificationType = 'email' | 'telegram' | 'sms';
export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'failed';

export interface Verification {
  id: string;
  customerId: string;
  type: VerificationType;
  status: VerificationStatus;
  contact: string;
  expiresAt: string;
  verifiedAt?: string;
  attempts: number;
  createdAt: string;
}
```

## 📚 Примеры использования

### Регистрация и верификация

```typescript
// 1. Регистрация (RegisterStep.tsx уже обновлён)
const response = await authApi.register({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  password: 'Password123',
  verificationMethod: 'email',
});

// Сохраняем для следующего шага
localStorage.setItem('registrationEmail', email);
localStorage.setItem('verificationMethod', 'email');

// 2. Верификация (VerifyStep.tsx уже обновлён)
await authApi.verify({
  email: 'john@example.com',
  code: '123456',
  method: 'email',
});

// 3. Повторная отправка кода
await authApi.resendCode('john@example.com', 'email');
```

### Использование нового API верификаций

```typescript
// Отправить код после входа (если нужна повторная верификация)
const sendVerification = async () => {
  try {
    const result = await verificationApi.send({
      email: user.email,
      type: 'email',
    });
    
    console.log('Verification sent:', result.data.id);
  } catch (error) {
    console.error('Failed to send verification');
  }
};

// Показать историю верификаций в настройках
const loadVerifications = async () => {
  try {
    const result = await verificationApi.getMyVerifications();
    const verifications = result.data; // Verification[]
    
    verifications.forEach(v => {
      console.log(`${v.type}: ${v.status}`);
    });
  } catch (error) {
    console.error('Failed to load verifications');
  }
};
```

### Создание компонента истории верификаций

```tsx
'use client';

import { useState, useEffect } from 'react';
import { verificationApi } from '@/lib/api';
import { Verification } from '@/lib/types';

export function VerificationHistory() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const result = await verificationApi.getMyVerifications();
      setVerifications(result.data);
    } catch (error) {
      console.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">История верификаций</h2>
      
      {verifications.map((v) => (
        <div key={v.id} className="border p-4 rounded">
          <div className="flex justify-between">
            <span className="font-medium">{v.type.toUpperCase()}</span>
            <span className={`px-2 py-1 rounded text-sm ${
              v.status === 'verified' ? 'bg-green-100 text-green-800' :
              v.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              v.status === 'expired' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {v.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <div>Контакт: {v.contact}</div>
            <div>Попыток: {v.attempts}</div>
            <div>Создано: {new Date(v.createdAt).toLocaleString()}</div>
            {v.verifiedAt && (
              <div>Верифицировано: {new Date(v.verifiedAt).toLocaleString()}</div>
            )}
          </div>
        </div>
      ))}
      
      {verifications.length === 0 && (
        <div className="text-center text-gray-500">
          Нет верификаций
        </div>
      )}
    </div>
  );
}
```

## 🔄 Обратная совместимость

### Существующие API endpoints
Все существующие endpoints работают без изменений:

- ✅ `POST /auth/register` - работает
- ✅ `POST /auth/login` - работает
- ✅ `POST /auth/verify` - работает (но теперь требует `method`)
- ✅ `POST /auth/resend-code` - работает

### Изменения в ответах

#### `POST /auth/verify`
```typescript
// Теперь возвращает
{
  success: true,
  data: {
    accessToken: "...",  // было: token
    tokenType: "Bearer",
    expiresIn: "24h",
    customer: { ... }
  }
}
```

Обновлено в `api.ts`:
```typescript
if (response.data.data?.accessToken) {
  localStorage.setItem('token', response.data.data.accessToken);
}
```

#### `POST /auth/register`
```typescript
// Теперь возвращает
{
  success: true,
  data: {
    customerId: 1,
    email: "user@example.com",
    verificationMethod: "email",
    verificationId: "507f...",  // <- новое поле
    message: "..."
  }
}
```

## 🚀 Тестирование

### Checklist

- [x] Регистрация с email верификацией
- [x] Регистрация с telegram верификацией
- [x] Верификация кода
- [x] Повторная отправка кода
- [ ] История верификаций (если компонент создан)
- [ ] Отправка кода через новое API (если используется)

### Запуск фронтенда

```bash
cd frontend
npm install  # или yarn
npm run dev  # или yarn dev
```

## 🐛 Возможные проблемы

### Проблема: "method is required"
**Решение**: Убедитесь, что при вызове `authApi.verify()` передаёте `method`

### Проблема: Token не сохраняется
**Решение**: Проверьте, что используете `accessToken` вместо `token`:
```typescript
response.data.data?.accessToken // ✅
response.data.data?.token       // ❌
```

### Проблема: 401 при запросе к `/verifications/*`
**Решение**: Убедитесь, что токен есть в localStorage и передаётся в заголовках

## 📝 Что дальше?

### Опциональные улучшения

1. **Компонент истории верификаций** в настройках пользователя
2. **Переключение метода верификации** после регистрации
3. **Показ оставшегося времени** до истечения кода
4. **Счётчик попыток** при вводе кода
5. **Toast уведомления** при успешной верификации

### Пример: Таймер истечения кода

```tsx
const [timeLeft, setTimeLeft] = useState(900); // 15 минут в секундах

useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft((prev) => Math.max(0, prev - 1));
  }, 1000);

  return () => clearInterval(timer);
}, []);

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// В JSX
{timeLeft > 0 ? (
  <div>Код действителен: {formatTime(timeLeft)}</div>
) : (
  <div className="text-red-600">Код истёк</div>
)}
```

## ✅ Готово!

Фронтенд обновлён и готов к работе с новым модулем верификации! 🎉
