import { TariffStatus } from '../schemas/tariff.schema';

export class TariffResponseDto {
  id: string;
  name: string;
  price: number;
  limits: { requests: number; chats: number; bots: number };
  /** Длительность активности в днях (например 30, 10) */
  activityDurationDays: number | null;
  status: TariffStatus;
  /** Пробный тариф — без оплаты */
  trial: boolean;

  constructor(partial: Partial<TariffResponseDto>) {
    Object.assign(this, partial);
  }
}
