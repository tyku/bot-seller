# Bot Seller API Documentation

## Описание

API для управления клиентами (customers) и настройками ботов с полной системой аутентификации через JWT (OpenID Connect pattern), включая регистрацию с подтверждением через email или Telegram.

## Аутентификация

API использует JWT токены для аутентификации. После регистрации и верификации вы получите `accessToken`, который нужно передавать в заголовке:

```
Authorization: Bearer <accessToken>
```

### OpenID Connect Flow

1. **Регистрация** → Получение verification code
2. **Подтверждение** → Получение JWT токена
3. **Использование токена** → Доступ к защищенным эндпоинтам

## Эндпоинты

### 🔓 Публичные эндпоинты (не требуют аутентификации)

#### POST /auth/register
Регистрация нового пользователя

**Body (вариант 1 - только email):**
```json
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "SecurePass123",
  "verificationMethod": "email"
}
```

**Body (вариант 2 - только phone):**
```json
{
  "name": "Петр Петров",
  "phone": "+79123456789",
  "password": "SecurePass123",
  "verificationMethod": "sms"
}
```

**Body (вариант 3 - email и phone):**
```json
{
  "name": "Мария Сидорова",
  "email": "maria@example.com",
  "phone": "+79123456789",
  "password": "SecurePass123",
  "verificationMethod": "email",
  "telegramUsername": "@maria_user"
}
```

**Validation:**
- `name`: минимум 2 символа (обязательно)
- `email`: валидный email адрес (опционально*)
- `phone`: международный формат E.164 (опционально*)
- `password`: минимум 8 символов, должен содержать заглавную букву, строчную букву и цифру (обязательно)
- `verificationMethod`: "email", "telegram", или "sms" (обязательно)
- `telegramUsername`: опционально, обязательно если method = "telegram"

**\*Важно:** Хотя бы одно из двух (email или phone) должно быть указано. Также:
- Если `verificationMethod: "email"` → email обязателен
- Если `verificationMethod: "sms"` → phone обязателен
- Если `verificationMethod: "telegram"` → telegramUsername обязателен

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": 1,
    "email": "ivan@example.com",
    "verificationMethod": "email",
    "message": "Verification code sent via email"
  },
  "message": "Registration successful. Please verify your account."
}
```

---

#### POST /auth/verify
Подтверждение аккаунта кодом из email/telegram/sms

**Body (подтверждение по email):**
```json
{
  "email": "ivan@example.com",
  "code": "123456",
  "method": "email"
}
```

**Body (подтверждение по phone):**
```json
{
  "phone": "+79123456789",
  "code": "123456",
  "method": "sms"
}
```

**Validation:**
- Должен быть указан либо `email`, либо `phone`
- `code` - 6 цифр
- `method` - "email", "telegram", или "sms"

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "24h",
    "customer": {
      "customerId": 1,
      "email": "ivan@example.com",
      "name": "Иван Иванов"
    }
  },
  "message": "Verification successful"
}
```

---

#### POST /auth/login
Вход в систему

**Body (вход по email):**
```json
{
  "email": "ivan@example.com",
  "password": "SecurePass123"
}
```

**Body (вход по phone):**
```json
{
  "phone": "+79123456789",
  "password": "SecurePass123"
}
```

**Validation:**
- Должен быть указан либо `email`, либо `phone`
- `password` обязателен

**Response:** Такой же как у `/auth/verify`

---

#### POST /auth/resend-code
Повторная отправка кода верификации

**Body:**
```json
{
  "email": "ivan@example.com",
  "method": "email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Verification code resent via email"
  },
  "message": "Verification code resent successfully"
}
```

---

#### GET /telegram/verification/:username
Получение pending верификационного кода для Telegram username

**Example:** `GET /telegram/verification/ivan_user`

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "123456",
    "expiresIn": 895
  },
  "message": "Pending verification found"
}
```

---

#### POST /telegram/link
Привязка Telegram аккаунта (вызывается ботом после того как пользователь предоставил код)

**Body:**
```json
{
  "telegramId": 123456789,
  "telegramUsername": "ivan_user",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telegram account linked successfully"
}
```

---

### 🔒 Защищенные эндпоинты (требуют JWT токен)

**Все эндпоинты ниже требуют заголовок:**
```
Authorization: Bearer <your_access_token>
```

---

#### GET /customers/me
Получить информацию о текущем пользователе

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": 1,
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+79123456789",
    "status": "verified",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Customer retrieved successfully"
}
```

---

#### GET /customers
Получить список всех клиентов (административный эндпоинт)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "customerId": 1,
      "name": "Иван Иванов",
      "email": "ivan@example.com",
      "phone": "+79123456789",
      "status": "verified",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Customers retrieved successfully"
}
```

---

#### GET /customers/:id
Получить клиента по ID (административный эндпоинт)

---

#### PATCH /customers/:id/status
Обновить статус клиента (административный эндпоинт)

**Body:**
```json
{
  "status": "verified"
}
```

---

### 🤖 Настройки ботов

#### POST /customer-settings
Создать настройки бота

**Body:**
```json
{
  "customerId": "1",
  "name": "Мой Telegram бот",
  "token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
  "botType": "tg",
  "prompts": [
    {
      "name": "greeting",
      "body": "Привет! Как я могу помочь?",
      "type": "context"
    }
  ]
}
```

**Validation:**
- `customerId`: должен совпадать с ID текущего пользователя
- `botType`: "tg" или "vk"
- `prompts[].type`: "context"

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": "1",
    "name": "Мой Telegram бот",
    "token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    "botType": "tg",
    "prompts": [
      {
        "name": "greeting",
        "body": "Привет! Как я могу помочь?",
        "type": "context"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Customer settings created successfully"
}
```

---

#### GET /customer-settings
Получить все настройки текущего пользователя

**Query params:**
- `customerId` (optional): ID клиента - если указан, должен совпадать с текущим пользователем

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "customerId": "1",
      "name": "Мой Telegram бот",
      "token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
      "botType": "tg",
      "prompts": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Customer settings retrieved successfully"
}
```

---

#### GET /customer-settings/:id
Получить настройки по ID

---

#### PATCH /customer-settings/:id
Обновить настройки бота

**Body:** Любые поля из CreateCustomerSettingsDto

**Response:** Обновленные настройки

---

#### DELETE /customer-settings/:id
Удалить настройки бота

**Response:**
```json
{
  "success": true,
  "message": "Customer settings deleted successfully"
}
```

---

## Безопасность

### JWT Токены
- Срок действия: 24 часа
- Payload содержит: `sub` (customer _id), `customerId`, `email`
- Секрет хранится в переменной окружения `JWT_SECRET`

### Пароли
- Хешируются с помощью bcrypt (10 rounds)
- Требования: минимум 8 символов, заглавная буква, строчная буква, цифра

### Верификация
- Коды состоят из 6 цифр
- Срок действия: 15 минут
- Хранятся в базе данных

### Авторизация
- Пользователи могут работать только со своими настройками
- Проверка ownership на всех эндпоинтах настроек

---

## Коды ошибок

- `400 Bad Request` - Невалидные данные
- `401 Unauthorized` - Не авторизован или неверные credentials
- `403 Forbidden` - Нет доступа к ресурсу
- `404 Not Found` - Ресурс не найден
- `409 Conflict` - Конфликт данных (например, email уже существует)
- `500 Internal Server Error` - Внутренняя ошибка сервера

---

## Примеры использования

### Полный flow регистрации через Email

```bash
# 1. Регистрация
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+79123456789",
    "password": "SecurePass123",
    "verificationMethod": "email"
  }'

# 2. Проверить email и получить код (123456)

# 3. Подтверждение
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "code": "123456",
    "method": "email"
  }'

# Response: { "accessToken": "..." }

# 4. Использование токена
curl -X GET http://localhost:3000/customers/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 5. Создание настроек бота
curl -X POST http://localhost:3000/customer-settings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "1",
    "name": "Мой бот",
    "token": "1234567890:ABC...",
    "botType": "tg"
  }'
```

### Полный flow регистрации через Telegram

```bash
# 1. Регистрация
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+79123456789",
    "password": "SecurePass123",
    "verificationMethod": "telegram",
    "telegramUsername": "@ivan_user"
  }'

# 2. Получить код (для отображения пользователю или бота)
curl -X GET http://localhost:3000/telegram/verification/ivan_user

# Response: { "code": "123456", "expiresIn": 895 }

# 3. Пользователь отправляет код боту, бот вызывает:
curl -X POST http://localhost:3000/telegram/link \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 123456789,
    "telegramUsername": "ivan_user",
    "code": "123456"
  }'

# 4. Подтверждение
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "code": "123456",
    "method": "telegram"
  }'

# Response: { "accessToken": "..." }
```

---

## Telegram модуль

### Описание
Простой модуль для работы с Telegram кодами верификации. Хранит коды в памяти и предоставляет API для:
- Сохранения кодов верификации
- Проверки кодов
- Привязки Telegram аккаунтов

### Особенности
- Не использует вебхуки (не мешает будущему multi-tenant Telegram серверу)
- Коды хранятся в памяти с TTL 15 минут
- Автоматическая очистка expired кодов каждые 5 минут
- Простой API для интеграции с любым Telegram ботом

### Использование с простым ботом
Вы можете создать простого Telegram бота, который:
1. Получает команду `/start` с username
2. Проверяет наличие pending verification через `GET /telegram/verification/:username`
3. Показывает код пользователю
4. Принимает код от пользователя
5. Вызывает `POST /telegram/link` для привязки аккаунта

---

## Переменные окружения

См. файл `.env.example` для всех необходимых переменных.

**Важно:** Измените `JWT_SECRET` в production!

---

## TODO / Будущие улучшения

- [ ] Refresh tokens
- [ ] Rate limiting
- [ ] Admin роли и permissions
- [ ] OAuth2 providers (Google, GitHub)
- [ ] Webhook события для интеграций
- [ ] Multi-tenant Telegram webhook server
- [ ] Логирование и мониторинг
- [ ] API documentation (Swagger/OpenAPI)
