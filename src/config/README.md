# Configuration Module

Централизованное управление конфигурацией приложения с использованием `@nestjs/config`.

## Структура

- `configuration.ts` - Функция конфигурации, загружает все переменные окружения
- `env.validation.ts` - Валидация переменных окружения с использованием `class-validator`

## Использование

ConfigModule настроен как глобальный модуль, поэтому ConfigService доступен везде.

### В конструкторе сервиса

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    const dbUri = this.configService.get<string>('database.uri');
    const jwtSecret = this.configService.get<string>('jwt.secret');
    const port = this.configService.get<number>('port');
  }
}
```

### В async модулях (например, для инъекции в провайдеры)

```typescript
@Module({
  imports: [
    SomeModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get<string>('someService.apiKey'),
      }),
    }),
  ],
})
export class AppModule {}
```

## Доступные конфиги

### Основные настройки
- `nodeEnv` - окружение (development/production/test)
- `port` - порт приложения

### База данных
- `database.uri` - MongoDB connection string

### JWT
- `jwt.secret` - секретный ключ для JWT
- `jwt.expiresIn` - время жизни токена

### SMTP (Email)
- `smtp.host` - SMTP хост
- `smtp.port` - SMTP порт
- `smtp.user` - SMTP пользователь
- `smtp.pass` - SMTP пароль
- `smtp.from` - Email отправителя

### Telegram
- `telegram.botToken` - токен Telegram бота

## Валидация

Все обязательные переменные валидируются при старте приложения. Если какая-то переменная отсутствует или невалидна, приложение не запустится с подробным сообщением об ошибке.

Обязательные переменные:
- `MONGODB_URI`
- `JWT_SECRET`

Опциональные переменные получают значения по умолчанию.
