# 🚀 Quick Start Guide

## Быстрый запуск за 5 минут

### 1. Установка и настройка

```bash
# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env

# Запустите MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Запустите приложение
npm run start:dev
```

### 2. Тестирование API

#### Регистрация нового пользователя

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+79123456789",
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
    "email": "test@example.com",
    "verificationMethod": "email",
    "message": "Verification code sent via email"
  }
}
```

#### Получение кода (для теста без email сервера)

Если вы не настроили SMTP, код будет записан в базу данных. Вы можете:

**Вариант 1:** Настроить SMTP в `.env` и получить реальный email

**Вариант 2:** Посмотреть код в MongoDB:
```bash
# Подключитесь к MongoDB
mongosh bot-seller

# Найдите код
db.customers.findOne({ email: "test@example.com" })
```

**Вариант 3:** Временно отключить верификацию для теста (см. ниже)

#### Подтверждение кода

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "method": "email"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "24h",
    "customer": {
      "customerId": 1,
      "email": "test@example.com",
      "name": "Test User"
    }
  }
}
```

**Сохраните accessToken** - он понадобится для следующих запросов!

#### Получение информации о себе

```bash
# Замените YOUR_TOKEN на реальный токен
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3000/customers/me \
  -H "Authorization: Bearer $TOKEN"
```

#### Создание настроек бота

```bash
curl -X POST http://localhost:3000/customer-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "1",
    "name": "Мой первый бот",
    "token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    "botType": "tg",
    "prompts": [
      {
        "name": "greeting",
        "body": "Привет! Я бот-помощник.",
        "type": "context"
      }
    ]
  }'
```

#### Получение всех настроек

```bash
curl -X GET http://localhost:3000/customer-settings \
  -H "Authorization: Bearer $TOKEN"
```

## 💡 Полезные команды

```bash
# Разработка (hot reload)
npm run start:dev

# Сборка
npm run build

# Продакшн
npm run start:prod

# Линтинг
npm run lint

# Форматирование кода
npm run format

# Тесты
npm run test
```

## 🔍 Отладка

### Проверка подключения к MongoDB

```bash
# В другом терминале
mongosh bot-seller

# Проверка коллекций
show collections

# Просмотр пользователей
db.customers.find().pretty()

# Просмотр настроек
db.customersettings.find().pretty()
```

### Проверка JWT токена

Используйте [jwt.io](https://jwt.io) для декодирования токена и просмотра payload.

### Логи приложения

Приложение выводит логи в консоль. Следите за:
- `Telegram service initialized` - Telegram модуль запущен
- `Verification code stored for @username` - код сохранен
- `Telegram account linked` - аккаунт привязан

## 🧪 Тестовый сценарий

### Полный flow с Telegram

```bash
# 1. Регистрация с Telegram
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Telegram User",
    "email": "tg@example.com",
    "phone": "+79999999999",
    "password": "Test1234",
    "verificationMethod": "telegram",
    "telegramUsername": "@testuser"
  }'

# 2. Получить код (эмулируем бота)
curl -X GET http://localhost:3000/telegram/verification/testuser

# 3. Привязать аккаунт (эмулируем бота получившего /start от пользователя)
curl -X POST http://localhost:3000/telegram/link \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 123456789,
    "telegramUsername": "testuser",
    "code": "123456"
  }'

# 4. Подтвердить регистрацию
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tg@example.com",
    "code": "123456",
    "method": "telegram"
  }'

# 5. Получить токен и использовать API!
```

## 🐛 Частые проблемы

### MongoDB не запускается

```bash
# Проверьте что порт 27017 свободен
lsof -i :27017

# Или используйте другой порт в .env
MONGODB_URI=mongodb://localhost:27018/bot-seller
```

### Email не отправляется

- Проверьте настройки SMTP в `.env`
- Для Gmail используйте App Password, а не обычный пароль
- Или используйте dev email сервис типа Mailtrap для тестирования

### Токен не работает

- Проверьте что токен передается в заголовке: `Authorization: Bearer <token>`
- Проверьте что токен не истек (24 часа)
- Проверьте что `JWT_SECRET` в `.env` не изменился

### 401 Unauthorized на защищенных эндпоинтах

- Убедитесь что пользователь verified (status = "verified")
- Проверьте что токен валидный
- Проверьте формат заголовка Authorization

## 📚 Дополнительная документация

- [README.md](./README.md) - Полная документация проекта
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Подробное описание всех API эндпоинтов
- [TELEGRAM_BOT_EXAMPLE.md](./TELEGRAM_BOT_EXAMPLE.md) - Пример Telegram бота для верификации

## 🎯 Следующие шаги

1. ✅ Запустили приложение
2. ✅ Протестировали регистрацию
3. ✅ Создали настройки бота
4. 🔜 Интегрируйте с вашим фронтендом
5. 🔜 Создайте Telegram бота (см. TELEGRAM_BOT_EXAMPLE.md)
6. 🔜 Добавьте свою бизнес-логику

---

**Готово! Теперь у вас есть полноценное API с аутентификацией 🎉**
