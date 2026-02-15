# Логирование и обработка ошибок

## Проблема
- При создании пользователя возвращалась 500 ошибка
- В логах не было никакой информации об ошибках
- Фронтенд не получал понятных сообщений об ошибках

## Решение

### Backend

#### 1. Exception Filters (`src/common/filters/http-exception.filter.ts`)
Добавлено логирование во все фильтры:

- **HttpExceptionFilter** - логирует все HTTP исключения (400, 404, 409, и т.д.)
- **AllExceptionsFilter** - логирует все необработанные исключения (500 и другие)

Каждый фильтр теперь логирует:
- HTTP метод и URL запроса
- Сообщение об ошибке
- Тело запроса (body)
- Query параметры
- Route параметры
- Stack trace (для необработанных исключений)

#### 2. AuthService (`src/auth/auth.service.ts`)
Добавлено подробное логирование всех операций:

- `register()` - логирование попыток регистрации, проверок существующих пользователей, создания клиента
- `login()` - логирование попыток входа, проверки учетных данных
- `verifyCode()` - логирование процесса верификации кода
- `resendVerificationCode()` - логирование повторной отправки кода

#### 3. VerificationService (`src/verification/verification.service.ts`)
Добавлено логирование:

- Инициализация email transporter с проверкой конфигурации
- Отправка кодов верификации (email, SMS, Telegram)
- Верификация кодов
- Все ошибки при отправке и верификации

**Исправлена проблема с email transporter** - теперь правильно инициализируется с проверкой конфигурации.

#### 4. CustomerService (`src/customer/customer.service.ts`)
Добавлено логирование всех операций:

- `create()` - логирование создания клиента, проверок существующих email/phone
- `findAll()` - логирование получения всех клиентов
- `findById()` - логирование поиска по ID
- `updateStatus()` - логирование обновления статуса
- `updateCustomer()` - логирование обновления данных клиента

#### 5. CustomerSettingsService (`src/customer-settings/customer-settings.service.ts`)
Добавлено логирование всех операций:

- `create()` - логирование создания настроек с обработкой ошибок
- `findAll()` - логирование получения всех настроек
- `findById()` - логирование поиска по ID
- `findByCustomerId()` - логирование поиска по customer ID
- `update()` - логирование обновления настроек
- `delete()` - логирование удаления настроек

#### 6. TelegramService (`src/telegram/telegram.service.ts`)
Добавлено дополнительное логирование:

- `checkVerificationCode()` - логирование проверки кодов верификации
- `linkTelegramAccount()` - подробное логирование привязки аккаунта Telegram с try-catch
- `getPendingVerification()` - логирование получения pending верификаций

#### 7. Контроллеры
Добавлено логирование всех входящих запросов:

**AuthController** (`src/auth/auth.controller.ts`):
- `/auth/register`
- `/auth/login`
- `/auth/verify`
- `/auth/resend-code`

**CustomerController** (`src/customer/customer.controller.ts`):
- `/customers` (POST, GET)
- `/customers/me` (GET)
- `/customers/:id` (GET)
- `/customers/:id/status` (PATCH)

**CustomerSettingsController** (`src/customer-settings/customer-settings.controller.ts`):
- `/customer-settings` (POST, GET)
- `/customer-settings/:id` (GET, PATCH, DELETE)
- Включает логирование всех Forbidden ошибок (попытки доступа к чужим данным)

### Frontend

#### 1. API Interceptor (`frontend/lib/api.ts`)
Добавлен response interceptor для обработки ошибок:

- Логирование всех ошибок API в консоль
- Извлечение понятных сообщений об ошибках из ответов сервера
- Обработка сетевых ошибок
- Создание структурированных объектов ошибок

#### 2. Error Utils (`frontend/lib/error-utils.ts`)
Создана вспомогательная функция `getErrorMessage()`:

- Извлекает сообщение об ошибке из различных форматов
- Поддерживает Error объекты, axios ошибки, строки
- Возвращает понятные сообщения пользователю

#### 3. Компоненты
Обновлены все компоненты для правильной обработки ошибок:

- **RegisterStep.tsx** - отображение ошибок регистрации
- **VerifyStep.tsx** - отображение ошибок верификации и повторной отправки кода
- **SettingsStep.tsx** - отображение ошибок сохранения настроек и загрузки данных пользователя
- **DashboardStep.tsx** - обработка ошибок загрузки настроек

Все компоненты теперь:
- Логируют ошибки в консоль браузера
- Показывают понятные сообщения пользователю
- Используют единообразную обработку ошибок через `getErrorMessage()`

## Результат

### Теперь в логах можно увидеть:

```
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [VerificationService] Email transporter configured successfully
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [AuthController] POST /auth/register - Registration request received
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [AuthService] Registration attempt for email: test@example.com, phone: +1234567890
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [AuthService] Creating new customer...
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [AuthService] Customer created successfully: CUST-123
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [AuthService] Sending verification code via email
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [VerificationService] Sending verification for customer 507f1f77bcf86cd799439011, type: email
[Nest] 92692  - 02/16/2026, 12:51:45 AM     LOG [VerificationService] Sending email verification to test@example.com
[Nest] 92692  - 02/16/2026, 12:51:45 AM     ERROR [VerificationService] Failed to send email to test@example.com: Connection timeout
```

### При ошибках:

**Backend** логирует полную информацию:
```
[Nest] 92692 - ERROR [AllExceptionsFilter] Unhandled Exception: 500 - POST /auth/register
{
  "message": "Failed to send verification email",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ...",
  "body": { "email": "test@example.com", "name": "Test User" },
  "query": {},
  "params": {}
}
```

**Frontend** отображает понятное сообщение:
```
❌ Email verification is not configured. Please use another verification method.
```

## Проверка

Для проверки работы логирования:

1. Запустите сервер: `npm run start:dev`
2. Попробуйте зарегистрироваться на фронтенде
3. Проверьте логи в терминале - должны быть видны все операции
4. При ошибках - полная информация будет в логах

## Дальнейшие улучшения

1. Добавить централизованную систему логирования (Winston, Pino)
2. Настроить отправку логов в внешние сервисы (Sentry, LogRocket)
3. Добавить метрики и мониторинг (Prometheus, Grafana)
4. Настроить алерты при критических ошибках
