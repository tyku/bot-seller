# Bot Seller - Платформа для создания продающих ботов

Полноценная система для управления клиентами и настройками ботов с аутентификацией на базе JWT (OpenID Connect pattern) и верификацией через email/Telegram.

## 🎉 Frontend готов!

**Современный web-интерфейс с wizard flow** для создания и управления ботами.

📖 **Подробная документация:** [`FRONTEND_SUMMARY.md`](./FRONTEND_SUMMARY.md)
🚀 **Быстрый старт:** [`frontend/QUICKSTART.md`](./frontend/QUICKSTART.md)

**Структура:**
- ✅ Next.js 16 + TypeScript + Tailwind CSS
- ✅ 5-шаговый wizard: Регистрация → Верификация → Настройки → Оплата → Дашборд
- ✅ Возможность вернуться на любой шаг
- ✅ Простой UI без сложных компонентов
- ✅ Полная интеграция с backend API

## 🚀 Возможности

### Backend (NestJS)
- ✅ **Регистрация и аутентификация** с JWT токенами
- ✅ **Двухфакторная верификация** через email или Telegram
- ✅ **Защита API** на основе JWT guards
- ✅ **Управление настройками ботов** (Telegram, VK)
- ✅ **Система промптов** для AI-ботов
- ✅ **Простой Telegram модуль** для верификации кодов (не мешает future webhooks)
- ✅ **MongoDB** с транзакциями для надежности
- ✅ **Валидация** с помощью Zod схем
- ✅ **Безопасность**: bcrypt хеширование, JWT, ownership checks

### Frontend (Next.js) ✨ НОВОЕ!
- ✅ **Wizard flow** - пошаговый процесс настройки (5 шагов)
- ✅ **Простой UI** - без сложных компонентов, понятный каждому
- ✅ **Валидация форм** - в реальном времени с Zod
- ✅ **Возврат на любой шаг** - можно редактировать настройки в любой момент
- ✅ **Сохранение прогресса** - localStorage, не потеряете данные
- ✅ **Выбор тарифа** - 3 плана с визуальным сравнением
- ✅ **Дашборд** - статистика, управление ботом
- ✅ **Адаптивный дизайн** - работает на всех устройствах

## 📋 Требования

- Node.js 18+
- MongoDB 5.0+
- npm или yarn

## 🔧 Установка и запуск

### Backend

#### 1. Клонируйте репозиторий (если еще не сделали)

```bash
git clone <repository-url>
cd bot-seller
```

#### 2. Установите зависимости

```bash
npm install
```

#### 3. Настройте переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/bot-seller

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# SMTP Configuration (для email верификации)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@bot-seller.com

# Application
PORT=3000
NODE_ENV=development
```

**Важно:** Для Gmail нужно использовать App Password (не обычный пароль). 
[Инструкция по созданию App Password](https://support.google.com/accounts/answer/185833)

### 4. Запустите MongoDB

```bash
# Используя Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Или установите локально
# https://www.mongodb.com/docs/manual/installation/
```

### 5. Соберите проект

```bash
npm run build
```

## 🏃 Запуск

### Development режим (с hot reload)

```bash
npm run start:dev
```

### Production режим

```bash
npm run start:prod
```

Сервер запустится на `http://localhost:3000`

### Frontend ✨

#### 1. Перейдите в директорию frontend

```bash
cd frontend
```

#### 2. Установите зависимости

```bash
npm install
# или
yarn install
```

**Если npm install зависает**, см. решения в [`frontend/QUICKSTART.md`](./frontend/QUICKSTART.md)

#### 3. Создайте .env.local (уже создан)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 4. Запустите dev server

```bash
npm run dev
```

Frontend запустится на `http://localhost:3000` (или 3001 если 3000 занят)

**📖 Полная документация:** [`frontend/README.md`](./frontend/README.md)

## 📚 Документация

### API Документация

Полная документация API доступна в файле [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

Основные эндпоинты:

**Публичные (без авторизации):**
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/verify` - Подтверждение кода
- `POST /auth/resend-code` - Повторная отправка кода
- `GET /telegram/verification/:username` - Получить pending код для Telegram
- `POST /telegram/link` - Привязать Telegram аккаунт

**Защищенные (требуют JWT токен):**
- `GET /customers/me` - Текущий пользователь
- `GET /customer-settings` - Список настроек ботов
- `POST /customer-settings` - Создать настройку бота
- `PATCH /customer-settings/:id` - Обновить настройки
- `DELETE /customer-settings/:id` - Удалить настройки

### Telegram Bot

Пример простого Telegram бота для верификации: [TELEGRAM_BOT_EXAMPLE.md](./TELEGRAM_BOT_EXAMPLE.md)

## 🏗 Архитектура

```
src/
├── auth/                    # Модуль аутентификации
│   ├── strategies/         # Passport стратегии (JWT)
│   ├── guards/             # Guards для защиты эндпоинтов
│   ├── decorators/         # @Public, @CurrentUser
│   └── dto/                # DTOs для регистрации, логина, верификации
├── verification/           # Модуль верификации (email/telegram)
├── telegram/               # Простой Telegram модуль для кодов
├── customer/               # Модуль клиентов
│   ├── schemas/           # MongoDB схемы
│   ├── dto/               # Data Transfer Objects
│   └── pipes/             # Zod validation pipe
├── customer-settings/      # Модуль настроек ботов
└── app.module.ts          # Главный модуль
```

### Технологии

- **NestJS** - фреймворк
- **MongoDB + Mongoose** - база данных
- **Passport + JWT** - аутентификация
- **Zod** - валидация
- **bcryptjs** - хеширование паролей
- **nodemailer** - отправка email

## 🔐 Безопасность

### JWT Токены
- Срок действия: 24 часа
- Алгоритм: HS256
- Payload: `sub` (user id), `customerId`, `email`

### Пароли
- Минимум 8 символов
- Должен содержать: заглавную букву, строчную букву, цифру
- Хешируются с bcrypt (10 rounds)

### Верификация
- 6-значные коды
- Срок действия: 15 минут
- Отдельные коды для email и telegram

### API Protection
- Глобальный JWT guard на всех эндпоинтах
- Декоратор `@Public()` для публичных эндпоинтов
- Проверка ownership (пользователь может работать только со своими данными)

## 🧪 Тестирование

### Unit тесты
```bash
npm run test
```

### E2E тесты
```bash
npm run test:e2e
```

### Coverage
```bash
npm run test:cov
```

## 📝 Примеры использования

### 1. Регистрация через Email

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

# 2. Проверить email, получить код (например, 123456)

# 3. Подтвердить
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "code": "123456",
    "method": "email"
  }'

# Получите JWT токен в ответе
```

### 2. Создание настроек бота

```bash
# Используйте токен из предыдущего шага
curl -X POST http://localhost:3000/customer-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "1",
    "name": "Мой Telegram бот",
    "token": "1234567890:ABCdef...",
    "botType": "tg",
    "prompts": [
      {
        "name": "greeting",
        "body": "Привет! Как я могу помочь?",
        "type": "context"
      }
    ]
  }'
```

## 🔄 Development Flow

1. **Разработка**: `npm run start:dev` (hot reload)
2. **Линтинг**: `npm run lint`
3. **Форматирование**: `npm run format`
4. **Сборка**: `npm run build`
5. **Продакшн**: `npm run start:prod`

## 📦 Структура базы данных

### Customer Collection
```javascript
{
  _id: ObjectId,
  customerId: Number,        // Auto-increment ID
  name: String,
  email: String,             // Unique
  phone: String,             // Unique
  passwordHash: String,
  status: "created" | "verified",
  emailVerified: Boolean,
  telegramVerified: Boolean,
  emailVerificationCode: String,
  emailVerificationExpires: Date,
  telegramVerificationCode: String,
  telegramVerificationExpires: Date,
  telegramId: Number,        // Unique, optional
  telegramUsername: String,
  createdAt: Date,
  updatedAt: Date
}
```

### CustomerSettings Collection
```javascript
{
  _id: ObjectId,
  customerId: String,        // Reference to Customer.customerId
  name: String,
  token: String,
  botType: "tg" | "vk",
  prompts: [
    {
      name: String,
      body: String,
      type: "context"
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## 🚧 TODO / Roadmap

- [ ] Refresh tokens
- [ ] Rate limiting и throttling
- [ ] Admin роли и RBAC
- [ ] OAuth2 providers (Google, GitHub, VK)
- [ ] Swagger/OpenAPI документация
- [ ] Multi-tenant Telegram webhook server
- [ ] Websocket поддержка для real-time уведомлений
- [ ] Логирование (Winston/Pino)
- [ ] Мониторинг (Prometheus)
- [ ] Docker Compose для простого запуска
- [ ] CI/CD pipeline

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

[MIT](LICENSE)

## 📧 Контакты

Если у вас есть вопросы или предложения, создайте Issue в репозитории.

---

**Happy Coding! 🚀**
