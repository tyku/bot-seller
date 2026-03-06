import { Injectable } from '@nestjs/common';
import { TariffRepository } from './tariff.repository';
import { TariffResponseDto } from './dto/tariff-response.dto';
import { TariffDocument } from './schemas/tariff.schema';

@Injectable()
export class TariffService {
  constructor(private readonly tariffRepository: TariffRepository) {}

  async findAll(activeOnly = false): Promise<TariffResponseDto[]> {
    const tariffs = activeOnly
      ? await this.tariffRepository.findActive()
      : await this.tariffRepository.findAll();
    return tariffs.map((t) => this.toResponseDto(t));
  }

  async findById(id: string): Promise<TariffResponseDto | null> {
    const tariff = await this.tariffRepository.findById(id);
    return tariff ? this.toResponseDto(tariff) : null;
  }

  private toResponseDto(tariff: TariffDocument): TariffResponseDto {
    return new TariffResponseDto({
      id: tariff._id.toString(),
      name: tariff.name,
      price: tariff.price,
      limits: {
        requests: tariff.limits?.requests ?? 0,
        chats: tariff.limits?.chats ?? 0,
        bots: tariff.limits?.bots ?? 0,
      },
      activityDurationDays: tariff.activityDurationDays ?? null,
      status: tariff.status,
    });
  }
}
