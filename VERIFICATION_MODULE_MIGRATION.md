# Миграция модуля верификации

## Что изменилось

Модуль верификации был полностью переработан и вынесен в отдельную сущность.

### До
- Поля верификации хранились в схеме `Customer`:
  - `emailVerified`, `telegramVerified`
  - `emailVerificationCode`, `emailVerificationExpires`
  - `telegramVerificationCode`, `telegramVerificationExpires`

### После
- Создан отдельный модуль `VerificationModule`
- Новая схема `Verification` с поддержкой разных типов
- Поля верификации удалены из `Customer` схемы
- Добавлена поддержка SMS верификации (подготовлена инфраструктура)

## Преимущества новой архитектуры

1. **Разделение ответственности**: Верификация - отдельный домен
2. **Масштабируемость**: Легко добавить новые типы верификации
3. **История**: Хранение всех попыток верификации
4. **Безопасность**: Ограничение попыток, автоматическое истечение
5. **Гибкость**: Независимое управление верификациями

## Структура нового модуля

```
src/verification/
├── schemas/
│   └── verification.schema.ts       # Схема с типами EMAIL, TELEGRAM, SMS
├── dto/
│   ├── send-verification.dto.ts
│   ├── verify-code.dto.ts
│   └── response-verification.dto.ts
├── verification.controller.ts       # API endpoints
├── verification.service.ts          # Бизнес-логика
├── verification.repository.ts       # Работа с БД
└── verification.module.ts
```

## Миграция данных (если нужно)

Если у вас уже есть пользователи с незавершенной верификацией:

### Опция 1: Отправить новые коды
Самый простой вариант - попросить пользователей пройти верификацию заново.

### Опция 2: Миграция существующих кодов (необязательно)

Создайте скрипт миграции:

```typescript
// scripts/migrate-verifications.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function migrateVerifications() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const CustomerModel = app.get(getModelToken('Customer'));
  const VerificationModel = app.get(getModelToken('Verification'));
  
  // Найти всех пользователей с активными кодами верификации
  const customers = await CustomerModel.find({
    $or: [
      { emailVerificationCode: { $exists: true, $ne: null } },
      { telegramVerificationCode: { $exists: true, $ne: null } }
    ]
  });
  
  console.log(`Found ${customers.length} customers with active verification codes`);
  
  for (const customer of customers) {
    // Мигрировать email верификацию
    if (customer.emailVerificationCode && customer.emailVerificationExpires) {
      if (customer.emailVerificationExpires > new Date()) {
        await VerificationModel.create({
          customerId: customer._id,
          type: 'email',
          code: customer.emailVerificationCode,
          expiresAt: customer.emailVerificationExpires,
          contact: customer.email,
          status: 'pending',
          attempts: 0,
        });
        console.log(`Migrated email verification for customer ${customer.customerId}`);
      }
    }
    
    // Мигрировать telegram верификацию
    if (customer.telegramVerificationCode && customer.telegramVerificationExpires) {
      if (customer.telegramVerificationExpires > new Date()) {
        await VerificationModel.create({
          customerId: customer._id,
          type: 'telegram',
          code: customer.telegramVerificationCode,
          expiresAt: customer.telegramVerificationExpires,
          contact: customer.telegramUsername || customer.email,
          status: 'pending',
          attempts: 0,
        });
        console.log(`Migrated telegram verification for customer ${customer.customerId}`);
      }
    }
  }
  
  console.log('Migration completed');
  await app.close();
}

migrateVerifications();
```

Запустите:
```bash
npx ts-node scripts/migrate-verifications.ts
```

## API изменения

### Новые endpoints

```
POST   /verifications/send     # Отправить код (требует auth)
POST   /verifications/verify   # Проверить код (публичный)
GET    /verifications/my       # Получить свои верификации (требует auth)
```

### Изменения в существующих endpoints

#### POST /auth/register
Ответ теперь включает `verificationId`:
```json
{
  "success": true,
  "data": {
    "customerId": 1,
    "email": "user@example.com",
    "verificationMethod": "email",
    "verificationId": "507f1f77bcf86cd799439011",  // <- новое поле
    "message": "Verification code sent via email"
  }
}
```

#### POST /auth/verify
Без изменений в API, но внутри использует новую структуру

#### POST /auth/resend-code
Ответ теперь включает `verificationId`:
```json
{
  "success": true,
  "data": {
    "verificationId": "507f1f77bcf86cd799439011",  // <- новое поле
    "message": "Verification code resent via email"
  }
}
```

## Типы верификации

```typescript
enum VerificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  SMS = 'sms',  // Подготовлено, но не реализовано
}

enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}
```

## Настройки

### Константы в VerificationService:
- `VERIFICATION_EXPIRY_MINUTES = 15` - срок действия кода
- `MAX_ATTEMPTS = 5` - максимальное количество попыток

## Что НЕ изменилось

1. Customer schema:
   - `telegramId` и `telegramUsername` остались (для связи с Telegram)
   - Все остальные поля без изменений

2. API регистрации и логина остались прежними

3. JWT токены и аутентификация без изменений

## Тестирование

Проверьте следующие сценарии:

1. **Регистрация нового пользователя**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234",
    "verificationMethod": "email"
  }'
```

2. **Верификация кода**
```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "method": "email"
  }'
```

3. **Повторная отправка кода**
```bash
curl -X POST http://localhost:3000/auth/resend-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "method": "email"
  }'
```

4. **Получение истории верификаций** (требует токен)
```bash
curl -X GET http://localhost:3000/verifications/my \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Запуск

После изменений нужно:

1. Установить зависимости (если нужно):
```bash
npm install
```

2. Запустить приложение:
```bash
npm run start:dev
```

3. MongoDB автоматически создаст новую коллекцию `verifications` при первом использовании

## Очистка старых данных

В production рекомендуется настроить cron-job для очистки:

```typescript
// В каком-то сервисе или отдельном скрипте
@Cron('0 0 * * *') // Каждый день в полночь
async cleanupOldVerifications() {
  await this.verificationService.expireOldVerifications();
  await this.verificationService.cleanupOldVerifications(30); // Удалить записи старше 30 дней
}
```

## Следующие шаги

1. ✅ Протестировать все сценарии верификации
2. ⏳ Реализовать SMS верификацию (Twilio, AWS SNS)
3. ⏳ Добавить rate limiting
4. ⏳ Настроить мониторинг и логирование
5. ⏳ Добавить 2FA верификацию

## Вопросы?

Если что-то не работает или нужна помощь с миграцией, проверьте:
- Логи приложения
- Подключение к MongoDB
- SMTP настройки для email
- Telegram bot настройки
