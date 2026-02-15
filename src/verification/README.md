# Verification Module

Отдельный модуль для управления верификацией пользователей через различные каналы.

## Архитектура

```
verification/
├── schemas/
│   └── verification.schema.ts       # Mongoose схема верификаций
├── dto/
│   ├── send-verification.dto.ts     # DTO для отправки кода
│   ├── verify-code.dto.ts           # DTO для проверки кода
│   └── response-verification.dto.ts # DTO для ответа
├── verification.controller.ts        # REST API endpoints
├── verification.service.ts           # Бизнес-логика верификации
├── verification.repository.ts        # Работа с БД
├── verification.module.ts            # NestJS модуль
└── index.ts                          # Экспорты модуля
```

## Типы верификации

### VerificationType
- `EMAIL` - верификация через email
- `TELEGRAM` - верификация через Telegram
- `SMS` - верификация через SMS (будет реализовано)

### VerificationStatus
- `PENDING` - ожидает верификации
- `VERIFIED` - успешно верифицирован
- `EXPIRED` - истек срок действия
- `FAILED` - превышено количество попыток

## Схема данных

```typescript
{
  customerId: ObjectId,        // ID клиента
  type: VerificationType,      // Тип верификации
  code: string,                // 6-значный код
  status: VerificationStatus,  // Статус
  expiresAt: Date,            // Время истечения (15 минут)
  verifiedAt: Date,           // Время верификации
  attempts: number,           // Количество попыток (макс. 5)
  contact: string,            // email/phone/telegram username
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### POST /verifications/send
Отправить код верификации (требует авторизацию)

**Request:**
```json
{
  "type": "email",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "customerId": "...",
    "type": "email",
    "status": "pending",
    "expiresAt": "2026-02-16T12:15:00.000Z"
  },
  "message": "Verification code sent via email"
}
```

### POST /verifications/verify
Проверить код верификации (публичный endpoint)

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "..."
  },
  "message": "Verification successful"
}
```

### GET /verifications/my
Получить все верификации текущего пользователя (требует авторизацию)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "email",
      "status": "verified",
      "contact": "user@example.com",
      "verifiedAt": "2026-02-16T12:10:00.000Z"
    }
  ]
}
```

## Использование в коде

### В AuthService

```typescript
// Отправка кода при регистрации
const verification = await this.verificationService.sendVerification(customerId, {
  email: registerDto.email,
  type: VerificationType.EMAIL,
});

// Проверка кода
const result = await this.verificationService.verifyCode(
  email,
  code,
  VerificationType.EMAIL,
);

if (result.verified) {
  // Обновить статус клиента
  await this.customerService.updateCustomer(customerId, {
    status: CustomerStatus.VERIFIED,
  });
}
```

## Особенности

1. **Инвалидация старых кодов**: При отправке нового кода все предыдущие коды этого типа инвалидируются
2. **Ограничение попыток**: Максимум 5 попыток проверки кода
3. **Автоматическое истечение**: Коды действительны 15 минут
4. **Очистка старых данных**: Метод `cleanupOldVerifications()` для удаления старых записей
5. **Индексы**: Оптимизированные индексы для быстрого поиска

## TODO

- [ ] Реализовать SMS верификацию (Twilio, AWS SNS)
- [ ] Добавить rate limiting для предотвращения спама
- [ ] Добавить систему уведомлений о подозрительной активности
- [ ] Реализовать 2FA верификацию
- [ ] Добавить логирование попыток верификации
