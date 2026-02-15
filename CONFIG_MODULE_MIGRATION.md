# Миграция на ConfigModule

## Что было сделано

Создан централизованный модуль конфигурации для управления переменными окружения.

## Структура

### Новые файлы

1. **`src/config/configuration.ts`** - Функция конфигурации
   - Загружает все переменные окружения
   - Группирует конфиг по разделам (database, jwt, smtp, telegram)
   - Предоставляет значения по умолчанию

2. **`src/config/env.validation.ts`** - Валидация переменных окружения
   - Использует `class-validator` для проверки типов
   - Обязательные поля: MONGODB_URI, JWT_SECRET
   - Валидирует форматы (порты, енумы и т.д.)

3. **`src/config/README.md`** - Документация по использованию

## Обновленные файлы

### 1. `src/app.module.ts`
- Подключен `ConfigModule` как глобальный модуль
- `MongooseModule.forRootAsync` теперь использует `ConfigService`
- Убрано прямое использование `process.env.MONGODB_URI`

### 2. `src/auth/auth.module.ts`
- `JwtModule.registerAsync` использует `ConfigService`
- Убрано прямое использование `process.env.JWT_SECRET`

### 3. `src/auth/strategies/jwt.strategy.ts`
- Инъекция `ConfigService` в конструктор
- Использование `configService.getOrThrow('jwt.secret')`

### 4. `src/verification/verification.service.ts`
- Инъекция `ConfigService` в конструктор
- Использование конфига для SMTP настроек

### 5. `src/main.ts`
- Получение порта через `ConfigService`
- Добавлен вывод URL при запуске

## Как использовать

### В любом сервисе

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    const dbUri = this.configService.get<string>('database.uri');
    const jwtSecret = this.configService.getOrThrow<string>('jwt.secret');
  }
}
```

### Доступные конфиги

```typescript
// Основные
configService.get<string>('nodeEnv')
configService.get<number>('port')

// База данных
configService.get<string>('database.uri')

// JWT
configService.getOrThrow<string>('jwt.secret')
configService.get<string>('jwt.expiresIn')

// SMTP
configService.get<string>('smtp.host')
configService.get<number>('smtp.port')
configService.get<string>('smtp.user')
configService.get<string>('smtp.pass')
configService.get<string>('smtp.from')

// Telegram
configService.get<string>('telegram.botToken')
```

## Преимущества

1. **Централизация** - Все переменные окружения в одном месте
2. **Типизация** - TypeScript знает типы конфигов
3. **Валидация** - Приложение не запустится с невалидной конфигурацией
4. **Тестируемость** - Легко мокать конфиг в тестах
5. **Безопасность** - Валидация обязательных переменных
6. **DRY** - Нет дублирования значений по умолчанию

## Зависимости

Добавлены пакеты:
- `@nestjs/config`
- `class-validator`
- `class-transformer`

## Проверка

✅ Сборка проходит успешно (`npm run build`)
✅ Приложение запускается
✅ ConfigModule инициализируется корректно
✅ Нет прямого использования `process.env` в коде (кроме `configuration.ts`)
