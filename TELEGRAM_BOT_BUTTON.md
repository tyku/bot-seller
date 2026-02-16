# 📱 Кнопка перехода в Telegram бота

## ✅ Что добавлено

Теперь на странице верификации при регистрации через Telegram появляется **кнопка для перехода в бота**.

## 🎯 User Flow

```
1. Пользователь выбирает "Telegram" на регистрации
   ↓
2. Вводит имя + телефон
   ↓
3. Нажимает "Зарегистрироваться"
   ↓
4. Переходит на страницу верификации
   ↓
5. Видит кнопку "📱 Перейти в бота за кодом"
   ↓
6. Нажимает → открывается https://t.me/your_bot_username
   ↓
7. В боте получает код
   ↓
8. Вводит код на сайте
   ↓
9. Готово! ✅
```

## 📝 Изменения

### Backend (3 файла)

#### 1. `.env` + `.env.example`
```env
# Telegram Bot Username (без @)
TELEGRAM_BOT_USERNAME=your_bot_username
```

#### 2. `src/config/configuration.ts`
```typescript
telegram: {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  botUsername: process.env.TELEGRAM_BOT_USERNAME || 'your_bot', // ✅ НОВОЕ
}
```

#### 3. `src/auth/auth.service.ts`
```typescript
async registerTelegram(registerDto: RegisterTelegramDto) {
  // ... создание customer и отправка кода ...
  
  const botUsername = this.configService.get<string>('telegram.botUsername'); // ✅ НОВОЕ
  
  return {
    customerId: customer.customerId,
    phone: customer.phone,
    verificationMethod: 'telegram',
    verificationId: verification.id,
    botUsername, // ✅ НОВОЕ - передается во frontend
    message: 'Verification code sent via Telegram',
  };
}
```

### Frontend (2 файла)

#### 1. `frontend/components/steps/RegisterStep.tsx`
```typescript
const onSubmitTelegram = async (data: RegisterTelegramForm) => {
  const response = await authApi.registerTelegram(data);
  
  // ✅ НОВОЕ - сохраняем botUsername
  if (response.data?.botUsername) {
    localStorage.setItem('telegramBotUsername', response.data.botUsername);
  }
  
  // ...
};
```

#### 2. `frontend/components/steps/VerifyStep.tsx`
```typescript
// ✅ НОВОЕ - получаем botUsername из localStorage
const botUsername = localStorage.getItem('telegramBotUsername') || 'bot';
const telegramBotLink = `https://t.me/${botUsername}`;

// ✅ НОВОЕ - кнопка для Telegram
{method === 'telegram' && (
  <a href={telegramBotLink} target="_blank">
    <Button variant="secondary" className="w-full">
      <span className="mr-2">📱</span>
      Перейти в бота за кодом
    </Button>
  </a>
)}

// ✅ НОВОЕ - обновленная подсказка
<p>Код придет в Telegram бота @{botUsername}. Нажмите кнопку выше.</p>
```

## 🎨 UI

### До изменений
```
┌──────────────────────────┐
│ Верификация              │
│                          │
│ 📱                       │
│ Мы отправили код         │
│                          │
│ [Код: ______]            │
│ [Подтвердить]            │
│ Отправить повторно       │
└──────────────────────────┘
```

### После изменений (Telegram)
```
┌──────────────────────────┐
│ Верификация              │
│                          │
│ 📱                       │
│ Мы отправили код         │
│ +79991234567             │
│                          │
│ [Код: ______]            │
│ [Подтвердить]            │
│                          │
│ [📱 Перейти в бота]      │ ← НОВОЕ!
│                          │
│ Отправить повторно       │
│                          │
│ 💡 Код в @bot_username   │
└──────────────────────────┘
```

### Email (без изменений)
```
┌──────────────────────────┐
│ Верификация              │
│                          │
│ ✉️                       │
│ Мы отправили код         │
│ test@example.com         │
│                          │
│ [Код: ______]            │
│ [Подтвердить]            │
│                          │
│ Отправить повторно       │
│                          │
│ 💡 Проверьте Спам        │
└──────────────────────────┘
```

## 🔧 Настройка

### 1. Обновите `.env`

```bash
# Укажите username вашего Telegram бота (без @)
TELEGRAM_BOT_USERNAME=your_actual_bot
```

**Пример:**
- Если ваш бот: `@MySalesBot`
- Укажите: `TELEGRAM_BOT_USERNAME=MySalesBot`

### 2. Перезапустите backend

```bash
npm run start:dev
```

### 3. Протестируйте

1. Откройте frontend: http://localhost:3001
2. Выберите "Telegram"
3. Заполните форму
4. На странице верификации увидите кнопку
5. Нажмите → откроется Telegram бот
6. Получите код в боте
7. Введите код на сайте

## 📊 API Response

### POST /auth/register/telegram

**Request:**
```json
{
  "name": "Test User",
  "phone": "+79991234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": 12,
    "phone": "+79991234567",
    "verificationMethod": "telegram",
    "verificationId": "abc123...",
    "botUsername": "your_bot_username", // ✅ НОВОЕ
    "message": "Verification code sent via Telegram"
  },
  "message": "Registration successful. Please check Telegram for verification code."
}
```

## 🔗 Ссылка на бота

Кнопка открывает: `https://t.me/{botUsername}`

**Примеры:**
- `TELEGRAM_BOT_USERNAME=MySalesBot` → `https://t.me/MySalesBot`
- `TELEGRAM_BOT_USERNAME=BotSellerBot` → `https://t.me/BotSellerBot`

## ✨ Особенности

- ✅ Кнопка появляется **только для Telegram** регистрации
- ✅ Открывается в новой вкладке (`target="_blank"`)
- ✅ Красивая серая кнопка с иконкой 📱
- ✅ Подсказка с именем бота в тексте
- ✅ Username берется из переменной окружения

## 🎉 Готово!

Теперь пользователи могут легко перейти в бота одним кликом для получения кода.

---

**Файлы изменены:**
- Backend: 3 файла (.env, configuration.ts, auth.service.ts)
- Frontend: 2 файла (RegisterStep.tsx, VerifyStep.tsx)

**Переменная окружения:**
- `TELEGRAM_BOT_USERNAME` - имя бота (без @)
