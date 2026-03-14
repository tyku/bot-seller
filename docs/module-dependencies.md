# Схема зависимостей модулей (NestJS)

## Граф импортов между модулями

```mermaid
flowchart TB
    subgraph root["AppModule"]
        direction TB
    end

    subgraph standalone["Самодостаточные"]
        Customer[CustomerModule]
        User[UserModule]
        Tariff[TariffModule]
        Redis[RedisModule]
        Telegram[TelegramModule]
    end

    subgraph layer1["Уровень 1"]
        Verification[VerificationModule]
        CustomerTariffs[CustomerTariffsModule]
    end

    subgraph layer2["Уровень 2 — возможные циклы"]
        Auth[AuthModule]
        CustomerSettings[CustomerSettingsModule]
        TariffUsage[TariffUsageModule]
        Conversations[ConversationsModule]
        Llm[LlmModule]
    end

    subgraph layer3["Уровень 3 — оркестратор"]
        Gateway[GatewayModule]
    end

    root --> Customer
    root --> CustomerSettings
    root --> Auth
    root --> Verification
    root --> Telegram
    root --> User
    root --> Gateway
    root --> Conversations
    root --> Llm
    root --> Tariff
    root --> CustomerTariffs
    root --> TariffUsage
    root --> Redis

    Auth --> Customer
    Auth --> Verification
    Auth --> Telegram

    Verification --> Telegram

    CustomerTariffs --> Tariff

    CustomerSettings -.->|forwardRef| TariffUsage
    CustomerSettings -.->|forwardRef| Llm

    TariffUsage --> CustomerTariffs
    TariffUsage --> Customer
    TariffUsage --> Telegram
    TariffUsage -.->|forwardRef| CustomerSettings

    Conversations --> CustomerSettings
    Conversations -.->|forwardRef| Llm

    Llm --> Conversations

    Gateway --> CustomerSettings
    Gateway --> TariffUsage
    Gateway --> User
    Gateway --> Conversations
    Gateway --> Llm
```

## Циклические зависимости (где «запуталось»)

| Цикл | Модули | Как развязано |
|------|--------|----------------|
| **1** | **LlmModule** ↔ **ConversationsModule** | Только ConversationsModule использует `forwardRef(() => LlmModule)`. LlmModule импортирует ConversationsModule **без** forwardRef — при инициализации возможны проблемы. |
| **2** | **CustomerSettingsModule** ↔ **TariffUsageModule** | Оба используют `forwardRef` друг к другу — развязка есть. |
| **3** | **CustomerSettingsModule** → **LlmModule** | CustomerSettings использует `forwardRef(() => LlmModule)`. |

## Рекомендация по циклу Llm ↔ Conversations

В `llm.module.ts` лучше импортировать Conversations через forwardRef, чтобы цикл был развязан с обеих сторон:

```ts
// llm.module.ts
import { Module, forwardRef } from '@nestjs/common';
// ...
import { forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    // ...
    forwardRef(() => ConversationsModule),
  ],
  // ...
})
export class LlmModule {}
```

## Краткая таблица: кто кого импортирует

| Модуль | Импортирует |
|--------|-------------|
| **CustomerModule** | — |
| **UserModule** | — |
| **TariffModule** | — |
| **RedisModule** | — (global) |
| **TelegramModule** | ConfigModule, Mongoose (схема Customer — не модуль!) |
| **VerificationModule** | TelegramModule |
| **CustomerTariffsModule** | TariffModule |
| **AuthModule** | CustomerModule, VerificationModule, TelegramModule |
| **CustomerSettingsModule** | TariffUsageModule (forwardRef), LlmModule (forwardRef) |
| **TariffUsageModule** | CustomerTariffsModule, CustomerModule, TelegramModule, CustomerSettingsModule (forwardRef) |
| **ConversationsModule** | CustomerSettingsModule, LlmModule (forwardRef) |
| **LlmModule** | ConversationsModule *(без forwardRef)* |
| **GatewayModule** | CustomerSettingsModule, TariffUsageModule, UserModule, ConversationsModule, LlmModule |
