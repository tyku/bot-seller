# Пример простого Telegram бота для верификации

Этот документ показывает как создать простого Telegram бота для верификации пользователей.

## Установка зависимостей

```bash
npm install telegraf
```

## Код бота (verification-bot.js)

```javascript
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Команда /start - показывает помощь
bot.start((ctx) => {
  ctx.reply(
    'Привет! Я бот для верификации аккаунтов.\n\n' +
    'Команды:\n' +
    '/verify - проверить есть ли код верификации для вас\n' +
    '/link <код> - привязать ваш Telegram аккаунт используя код'
  );
});

// Команда /verify - проверяет наличие pending verification
bot.command('verify', async (ctx) => {
  const username = ctx.from.username;
  
  if (!username) {
    return ctx.reply('У вас не установлен username в Telegram. Пожалуйста, установите его в настройках.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/telegram/verification/${username}`);
    const data = await response.json();

    if (data.success) {
      const expiresInMinutes = Math.floor(data.data.expiresIn / 60);
      ctx.reply(
        `✅ Найден код верификации: ${data.data.code}\n\n` +
        `Срок действия: ${expiresInMinutes} минут\n\n` +
        `Используйте команду /link ${data.data.code} чтобы привязать аккаунт.`
      );
    } else {
      ctx.reply('❌ Код верификации не найден. Возможно он истек или вы еще не зарегистрировались.');
    }
  } catch (error) {
    console.error('Error checking verification:', error);
    ctx.reply('❌ Ошибка при проверке кода. Попробуйте позже.');
  }
});

// Команда /link - привязывает Telegram аккаунт
bot.command('link', async (ctx) => {
  const username = ctx.from.username;
  const telegramId = ctx.from.id;
  const code = ctx.message.text.split(' ')[1];

  if (!username) {
    return ctx.reply('У вас не установлен username в Telegram. Пожалуйста, установите его в настройках.');
  }

  if (!code) {
    return ctx.reply('Пожалуйста, укажите код: /link <код>');
  }

  if (code.length !== 6 || !/^\d+$/.test(code)) {
    return ctx.reply('Код должен состоять из 6 цифр.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/telegram/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegramId,
        telegramUsername: username,
        code,
      }),
    });

    const data = await response.json();

    if (data.success) {
      ctx.reply(
        '✅ Telegram аккаунт успешно привязан!\n\n' +
        'Теперь вы можете подтвердить регистрацию через API используя этот код.'
      );
    } else {
      ctx.reply('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error linking account:', error);
    ctx.reply('❌ Ошибка при привязке аккаунта. Попробуйте позже.');
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Произошла ошибка. Попробуйте позже.');
});

// Запуск бота
bot.launch()
  .then(() => {
    console.log('Verification bot started successfully');
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

## Использование

### 1. Создайте бота через @BotFather

1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и получите токен

### 2. Создайте .env файл для бота

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
API_BASE_URL=http://localhost:3000
```

### 3. Запустите бота

```bash
node verification-bot.js
```

## Flow верификации

### Со стороны пользователя:

1. Пользователь регистрируется через API с `verificationMethod: "telegram"` и указывает свой `@username`
2. Пользователь открывает бота в Telegram
3. Пользователь отправляет команду `/verify`
4. Бот показывает 6-значный код
5. Пользователь отправляет команду `/link 123456`
6. Бот подтверждает привязку
7. Пользователь подтверждает регистрацию через API (`POST /auth/verify`)
8. Пользователь получает JWT токен

### Альтернативный flow (без бота):

1. Пользователь регистрируется через API
2. Фронтенд получает код через `GET /telegram/verification/:username`
3. Фронтенд показывает код пользователю
4. Пользователь вручную вводит код на фронтенде
5. Фронтенд отправляет `POST /auth/verify`
6. Пользователь получает JWT токен

## Примечания

- Этот бот не использует вебхуки, работает через long polling
- Бот не хранит состояние, все данные хранятся в основном API
- Коды верификации хранятся 15 минут
- Бот можно запустить отдельно от основного приложения
- Это простая реализация, которая не мешает будущему multi-tenant Telegram серверу с вебхуками

## Расширение функционала

В будущем этот бот можно расширить:
- Добавить нотификации о новых записях
- Добавить возможность управления настройками через бота
- Добавить команды для просмотра расписания
- Интегрировать с AI для ответов на вопросы
