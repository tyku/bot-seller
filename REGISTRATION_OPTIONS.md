# 🔐 Варианты регистрации

## Концепция

Система поддерживает гибкую регистрацию: **либо email, либо phone** (или оба, если хочется).

## ✅ Что изменилось

### Было (требовалось ОБА поля):
```json
{
  "name": "Иван",
  "email": "ivan@example.com",       // ❌ Обязательно
  "phone": "+79123456789",           // ❌ Обязательно
  "password": "Test1234",
  "verificationMethod": "email"
}
```

### Стало (ЛИБО email, ЛИБО phone):
```json
// Вариант 1: Только email
{
  "name": "Иван",
  "email": "ivan@example.com",       // ✅ Достаточно
  "password": "Test1234",
  "verificationMethod": "email"
}

// Вариант 2: Только phone
{
  "name": "Петр",
  "phone": "+79123456789",           // ✅ Достаточно
  "password": "Test1234",
  "verificationMethod": "sms"        // TODO: SMS пока не реализовано
}

// Вариант 3: И то, и другое (если нужно)
{
  "name": "Мария",
  "email": "maria@example.com",
  "phone": "+79123456789",
  "password": "Test1234",
  "verificationMethod": "email"
}
```

---

## 📱 Варианты регистрации и верификации

### 1️⃣ Регистрация по Email

**Регистрация:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "password": "Test1234",
    "verificationMethod": "email"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "customerId": 1,
    "email": "ivan@example.com",
    "phone": null,
    "verificationMethod": "email",
    "message": "Verification code sent via email"
  }
}
```

**Подтверждение:**
```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "code": "123456",
    "method": "email"
  }'
```

**Вход:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "password": "Test1234"
  }'
```

---

### 2️⃣ Регистрация по Phone (+ Email верификация)

Можно зарегистрироваться по телефону, но верифицироваться через email:

**Регистрация:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Петр Петров",
    "phone": "+79123456789",
    "email": "petr@example.com",
    "password": "Test1234",
    "verificationMethod": "email"
  }'
```

**Вход по телефону:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+79123456789",
    "password": "Test1234"
  }'
```

---

### 3️⃣ Регистрация по Phone + Telegram верификация

**Регистрация:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Мария Сидорова",
    "phone": "+79999999999",
    "password": "Test1234",
    "verificationMethod": "telegram",
    "telegramUsername": "@maria_user"
  }'
```

**Получение кода (для бота или фронтенда):**
```bash
curl -X GET http://localhost:3000/telegram/verification/maria_user
```

**Подтверждение:**
```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+79999999999",
    "code": "123456",
    "method": "telegram"
  }'
```

**Вход:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+79999999999",
    "password": "Test1234"
  }'
```

---

### 4️⃣ Регистрация только по Email + Telegram верификация

**Регистрация:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Алексей",
    "email": "alex@example.com",
    "password": "Test1234",
    "verificationMethod": "telegram",
    "telegramUsername": "@alex_user"
  }'
```

**Подтверждение:**
```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "code": "123456",
    "method": "telegram"
  }'
```

---

## 🔍 Валидация

### Правила

1. **Хотя бы одно** - email ИЛИ phone должно быть указано
2. **Соответствие метода** - если `verificationMethod: "email"`, то email обязателен
3. **Соответствие метода** - если `verificationMethod: "sms"`, то phone обязателен
4. **Telegram username** - если `verificationMethod: "telegram"`, то telegramUsername обязателен

### Примеры ошибок

**❌ Нет ни email, ни phone:**
```json
{
  "name": "Test",
  "password": "Test1234",
  "verificationMethod": "email"
}
// Ошибка: "Either email or phone must be provided"
```

**❌ Email верификация без email:**
```json
{
  "name": "Test",
  "phone": "+79123456789",
  "password": "Test1234",
  "verificationMethod": "email"
}
// Ошибка: "Email is required for email verification"
```

**❌ Telegram без username:**
```json
{
  "name": "Test",
  "email": "test@example.com",
  "password": "Test1234",
  "verificationMethod": "telegram"
}
// Ошибка: "Telegram username is required for telegram verification"
```

---

## 🗃 Схема базы данных

```javascript
{
  _id: ObjectId,
  customerId: Number,        // Auto-increment
  name: String,              // Обязательно
  email: String,             // Опционально, unique если указан
  phone: String,             // Опционально, unique если указан
  passwordHash: String,      // Обязательно
  status: "created" | "verified",
  
  // Verification fields
  emailVerified: Boolean,
  telegramVerified: Boolean,
  emailVerificationCode: String,
  emailVerificationExpires: Date,
  telegramVerificationCode: String,
  telegramVerificationExpires: Date,
  
  // Telegram
  telegramId: Number,        // После привязки
  telegramUsername: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

**Важно:** 
- Email и phone имеют `sparse: true` unique индексы - это позволяет иметь несколько записей с `null` значениями
- Хотя бы одно из двух (email или phone) должно быть заполнено при регистрации

---

## 🎯 Рекомендации

### Для MVP:
✅ **Email регистрация** - самый простой вариант
```json
{
  "email": "user@example.com",
  "password": "...",
  "verificationMethod": "email"
}
```

### Для B2C продукта:
✅ **Phone + SMS** (когда реализуете SMS)
```json
{
  "phone": "+79123456789",
  "password": "...",
  "verificationMethod": "sms"
}
```

### Для международного продукта:
✅ **Email + Telegram** (без SMS)
```json
{
  "email": "user@example.com",
  "password": "...",
  "verificationMethod": "telegram",
  "telegramUsername": "@username"
}
```

### Для максимальной гибкости:
✅ **Все поля + выбор метода**
```json
{
  "email": "user@example.com",
  "phone": "+79123456789",
  "password": "...",
  "verificationMethod": "email"  // или telegram, или sms
}
```

---

## 🔜 TODO: SMS верификация

Сейчас `verificationMethod: "sms"` выбрасывает ошибку:
```
"SMS verification is not implemented yet"
```

Для реализации нужно:
1. Интегрировать SMS провайдера (Twilio, MessageBird, Vonage)
2. Добавить поля в Customer schema:
   ```typescript
   phoneVerified: Boolean
   phoneVerificationCode: String
   phoneVerificationExpires: Date
   ```
3. Реализовать `VerificationService.sendSmsVerification()`
4. Обновить `verifyCode()` для метода 'sms'

---

## 💡 Примеры использования

### Сценарий 1: Минималистичная регистрация

Пользователь вводит только email и пароль:

```typescript
// Frontend
const registerData = {
  name: formData.name,
  email: formData.email,
  password: formData.password,
  verificationMethod: 'email'
};

await api.post('/auth/register', registerData);
```

### Сценарий 2: Выбор метода верификации

Пользователь выбирает email или telegram:

```typescript
// Frontend
const registerData = {
  name: formData.name,
  email: formData.email,
  password: formData.password,
  verificationMethod: formData.preferredMethod, // 'email' или 'telegram'
  telegramUsername: formData.preferredMethod === 'telegram' ? formData.telegram : undefined
};

await api.post('/auth/register', registerData);
```

### Сценарий 3: Phone-first продукт

Основная регистрация через телефон:

```typescript
// Frontend
const registerData = {
  name: formData.name,
  phone: formData.phone,
  password: formData.password,
  verificationMethod: 'sms' // Когда будет реализовано
};

await api.post('/auth/register', registerData);
```

---

## 🧪 Тестирование

```bash
# 1. Регистрация по email
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test1","email":"test1@test.com","password":"Test1234","verificationMethod":"email"}'

# 2. Регистрация по phone (без email)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test2","phone":"+79111111111","email":"test2@test.com","password":"Test1234","verificationMethod":"email"}'

# 3. Вход по email
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@test.com","password":"Test1234"}'

# 4. Вход по phone
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79111111111","password":"Test1234"}'
```

---

**Готово! Теперь регистрация гибкая - можно использовать либо email, либо phone, либо оба! 🎉**
