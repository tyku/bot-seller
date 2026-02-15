# Быстрый старт - Модуль верификации

## 🚀 Что нужно знать

### Основные изменения
1. ✅ Верификация вынесена в отдельный модуль
2. ✅ Поддержка EMAIL, TELEGRAM, SMS (SMS - инфраструктура готова)
3. ✅ История всех верификаций
4. ✅ Защита от брутфорса (5 попыток, автоистечение)

## 📁 Структура модуля

```
src/verification/
├── schemas/verification.schema.ts       # Схема БД
├── dto/                                 # Валидация
├── verification.controller.ts           # API
├── verification.service.ts              # Логика
├── verification.repository.ts           # БД операции
└── verification.module.ts               # Модуль
```

## 🔌 API Endpoints

### 1. Отправить код (auth required)
```bash
POST /verifications/send
Authorization: Bearer <token>

{
  "type": "email",
  "email": "user@example.com"
}
```

### 2. Проверить код (public)
```bash
POST /verifications/verify

{
  "email": "user@example.com",
  "code": "123456",
  "type": "email"
}
```

### 3. История верификаций (auth required)
```bash
GET /verifications/my
Authorization: Bearer <token>
```

## 💡 Использование в коде

### Отправка кода
```typescript
import { VerificationService } from './verification';
import { VerificationType } from './verification/schemas/verification.schema';

// В сервисе
await this.verificationService.sendVerification(customerId, {
  email: 'user@example.com',
  type: VerificationType.EMAIL,
});
```

### Проверка кода
```typescript
const result = await this.verificationService.verifyCode(
  'user@example.com',
  '123456',
  VerificationType.EMAIL,
);

if (result.verified) {
  // Код верный
}
```

## 🎯 Типы верификации

```typescript
enum VerificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  SMS = 'sms',  // Готово к реализации
}
```

## ⚙️ Настройки

### Константы (в VerificationService)
```typescript
VERIFICATION_EXPIRY_MINUTES = 15  // Срок действия кода
MAX_ATTEMPTS = 5                   // Макс. попыток
```

### Environment Variables
```env
# Email (для email верификации)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@bot-seller.com

# Telegram (для telegram верификации)
TELEGRAM_BOT_TOKEN=your-bot-token
```

## 🔐 Безопасность

1. **Ограничение попыток**: 5 попыток → статус FAILED
2. **Автоистечение**: 15 минут → статус EXPIRED
3. **Инвалидация**: Новый код инвалидирует старые
4. **Очистка**: Старые записи удаляются автоматически

## 🧪 Тестирование

```bash
# 1. Регистрация
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234",
    "verificationMethod": "email"
  }'

# Ответ: verificationId в data

# 2. Проверка email для получения кода (в реальности код придёт на почту)

# 3. Верификация
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "XXXXXX",
    "method": "email"
  }'

# Ответ: JWT токен

# 4. История верификаций
curl -X GET http://localhost:3000/verifications/my \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Схема данных

```typescript
{
  _id: ObjectId,
  customerId: ObjectId,           // Ссылка на Customer
  type: VerificationType,         // email | telegram | sms
  code: string,                   // 6-значный код
  status: VerificationStatus,     // pending | verified | expired | failed
  expiresAt: Date,                // Время истечения
  verifiedAt: Date,               // Время верификации
  attempts: number,               // Количество попыток
  contact: string,                // email/phone/username
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Миграция существующих данных

Если у вас есть пользователи с незавершенной верификацией:

### Вариант 1 (рекомендуется)
Попросите пользователей пройти верификацию заново - просто отправьте новый код.

### Вариант 2
Используйте скрипт миграции - см. `VERIFICATION_MODULE_MIGRATION.md`

## ❓ FAQ

**Q: Где хранятся старые поля верификации?**  
A: Удалены из Customer schema. Теперь всё в коллекции `verifications`.

**Q: Как добавить SMS верификацию?**  
A: Реализуйте метод `sendSmsCode()` в VerificationService с Twilio или AWS SNS.

**Q: Можно ли изменить срок действия кода?**  
A: Да, измените константу `VERIFICATION_EXPIRY_MINUTES` в VerificationService.

**Q: Как очистить старые записи?**  
A: Вызовите `verificationService.cleanupOldVerifications(30)` (30 дней).

**Q: API изменился?**  
A: Нет, существующие endpoints работают как прежде. Добавлены новые.

## 📚 Документация

- `src/verification/README.md` - Подробная документация модуля
- `VERIFICATION_MODULE_MIGRATION.md` - Руководство по миграции
- `VERIFICATION_REFACTORING_SUMMARY.md` - Полное резюме изменений

## ✅ Checklist для запуска

- [ ] Проверить переменные окружения (SMTP, Telegram)
- [ ] Запустить MongoDB
- [ ] Запустить приложение: `npm run start:dev`
- [ ] Протестировать регистрацию
- [ ] Протестировать верификацию
- [ ] Проверить логи

## 🚨 Troubleshooting

**Проблема**: Email не отправляется  
**Решение**: Проверьте SMTP настройки в `.env`

**Проблема**: Telegram код не приходит  
**Решение**: Проверьте TELEGRAM_BOT_TOKEN и TelegramService

**Проблема**: "Customer not found"  
**Решение**: Убедитесь, что пользователь зарегистрирован

**Проблема**: "Too many attempts"  
**Решение**: Отправьте новый код через `/auth/resend-code`

## 🎉 Готово!

Модуль верификации готов к использованию. Тестируйте и наслаждайтесь чистой архитектурой!
