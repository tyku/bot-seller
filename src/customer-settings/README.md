# Customer Settings Module

Модуль для управления настройками клиентов, включая конфигурацию ботов и промптов.

## Структура

```
customer-settings/
├── schemas/
│   └── customer-settings.schema.ts  # Mongoose схема
├── dto/
│   ├── create-customer-settings.dto.ts   # DTO для создания
│   └── response-customer-settings.dto.ts # DTO для ответа
├── customer-settings.repository.ts  # Репозиторий для работы с БД
├── customer-settings.service.ts     # Бизнес-логика
├── customer-settings.controller.ts  # REST API endpoints
├── customer-settings.module.ts      # NestJS модуль
├── index.ts                         # Экспорты
└── README.md
```

## Модель данных

### CustomerSettings

| Поле | Тип | Описание |
|------|-----|----------|
| `customerId` | `string` | ID клиента (ссылка на customer) |
| `name` | `string` | Название продукта/бота |
| `token` | `string` | Токен социальной сети |
| `botType` | `'tg' \| 'vk'` | Тип бота (Telegram или VKontakte) |
| `prompts` | `Prompt[]` | Массив промптов |
| `createdAt` | `Date` | Дата создания |
| `updatedAt` | `Date` | Дата обновления |

### Prompt

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | `string` | Название промпта |
| `body` | `string` | Текст промпта |
| `type` | `'context'` | Тип промпта (пока только context) |

## API Endpoints

### POST /customer-settings
Создание новых настроек клиента.

**Request Body:**
```json
{
  "customerId": "507f1f77bcf86cd799439011",
  "name": "My Bot",
  "token": "your-bot-token",
  "botType": "tg",
  "prompts": [
    {
      "name": "greeting",
      "body": "Hello! How can I help you?",
      "type": "context"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "customerId": "507f1f77bcf86cd799439011",
    "name": "My Bot",
    "token": "your-bot-token",
    "botType": "tg",
    "prompts": [
      {
        "name": "greeting",
        "body": "Hello! How can I help you?",
        "type": "context"
      }
    ],
    "createdAt": "2026-02-14T12:00:00.000Z",
    "updatedAt": "2026-02-14T12:00:00.000Z"
  },
  "message": "Customer settings created successfully"
}
```

### GET /customer-settings
Получение всех настроек или фильтрация по customerId.

**Query Parameters:**
- `customerId` (optional) - фильтр по ID клиента

**Examples:**
- `GET /customer-settings` - получить все настройки
- `GET /customer-settings?customerId=507f1f77bcf86cd799439011` - получить настройки конкретного клиента

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "customerId": "507f1f77bcf86cd799439011",
      "name": "My Bot",
      "token": "your-bot-token",
      "botType": "tg",
      "prompts": [...],
      "createdAt": "2026-02-14T12:00:00.000Z",
      "updatedAt": "2026-02-14T12:00:00.000Z"
    }
  ],
  "message": "Customer settings retrieved successfully"
}
```

### GET /customer-settings/:id
Получение настроек по ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    ...
  },
  "message": "Customer settings retrieved successfully"
}
```

### PATCH /customer-settings/:id
Обновление настроек.

**Request Body (все поля опциональны):**
```json
{
  "name": "Updated Bot Name",
  "token": "new-token",
  "prompts": [
    {
      "name": "new-prompt",
      "body": "New prompt text",
      "type": "context"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    ...
  },
  "message": "Customer settings updated successfully"
}
```

### DELETE /customer-settings/:id
Удаление настроек.

**Response:**
```json
{
  "success": true,
  "message": "Customer settings deleted successfully"
}
```

## Валидация

Модуль использует Zod для валидации входных данных:

- `customerId` - обязательное поле, строка
- `name` - от 2 до 100 символов
- `token` - обязательное поле
- `botType` - только 'tg' или 'vk'
- `prompts` - массив объектов Prompt
  - `name` - обязательное поле
  - `body` - обязательное поле
  - `type` - только 'context'

## Использование в других модулях

```typescript
import { CustomerSettingsModule, CustomerSettingsService } from './customer-settings';

@Module({
  imports: [CustomerSettingsModule],
})
export class YourModule {
  constructor(private readonly settingsService: CustomerSettingsService) {}
  
  async getSettings(customerId: string) {
    return this.settingsService.findByCustomerId(customerId);
  }
}
```

## Индексы

Модуль создает индекс на поле `customerId` для быстрого поиска настроек конкретного клиента.
