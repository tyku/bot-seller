import { TariffStatus } from '../schemas/tariff.schema';

export class TariffResponseDto {
  id: string;
  name: string;
  price: number;
  limits: { requests: number };
  expiresAt: Date | null;
  status: TariffStatus;

  constructor(partial: Partial<TariffResponseDto>) {
    Object.assign(this, partial);
  }
}
