import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  // Database
  @IsString()
  MONGODB_URI: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  // Resend
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM?: string;

  // Redis
  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT?: number;

  // Encryption
  @IsString()
  @IsOptional()
  ENCRYPTION_KEY?: string;

  // Gateway
  @IsString()
  @IsOptional()
  GATEWAY_BASE_URL?: string;

  // Telegram
  @IsString()
  @IsOptional()
  TELEGRAM_BOT_TOKEN?: string;

  // OpenRouter (LLM)
  @IsString()
  @IsOptional()
  OPENROUTER_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENROUTER_DEFAULT_MODEL?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  LLM_RATE_LIMIT_PER_BOT_PER_HOUR?: number;

  // Demo drafts (optional)
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  DEMO_DRAFT_TTL_DAYS?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  DEMO_RATE_LIMIT_CREATE_PER_MIN?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  DEMO_RATE_LIMIT_RW_PER_MIN?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
