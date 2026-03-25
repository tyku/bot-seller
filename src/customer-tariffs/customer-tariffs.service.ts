import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTariffsRepository } from './customer-tariffs.repository';
import { CustomerTariffDocument } from './schemas/customer-tariff.schema';
import { TariffService } from '../tariff/tariff.service';
import { TariffResponseDto } from '../tariff/dto/tariff-response.dto';

export interface ActiveSubscriptionDto {
  id: string;
  tariffId: string;
  appliedAt: Date;
  expiresAt: Date | null;
  tariff: TariffResponseDto;
}

@Injectable()
export class CustomerTariffsService {
  constructor(
    private readonly customerTariffsRepository: CustomerTariffsRepository,
    private readonly tariffService: TariffService,
  ) {}

  async findByCustomerId(
    customerId: number,
  ): Promise<CustomerTariffDocument[]> {
    return this.customerTariffsRepository.findByCustomerId(customerId);
  }

  async getActiveSubscription(
    customerId: number,
  ): Promise<ActiveSubscriptionDto | null> {
    const ct =
      await this.customerTariffsRepository.findActiveByCustomerId(customerId);
    if (!ct) return null;
    const tariff = await this.tariffService.findById(ct.tariffId);
    if (!tariff) return null;
    return {
      id: ct._id.toString(),
      tariffId: ct.tariffId,
      appliedAt: ct.appliedAt,
      expiresAt: ct.expiresAt ?? null,
      tariff,
    };
  }

  async findByCustomerAndTariff(
    customerId: number,
    tariffId: string,
  ): Promise<CustomerTariffDocument | null> {
    return this.customerTariffsRepository.findByCustomerAndTariff(
      customerId,
      tariffId,
    );
  }

  async applyTariff(data: {
    customerId: number;
    tariffId: string;
    expiresAt?: Date;
  }): Promise<CustomerTariffDocument> {
    return this.customerTariffsRepository.create({
      ...data,
      appliedAt: new Date(),
    });
  }

  /**
   * Test payment flow: create customer-tariff with expiresAt = now + tariff.activityDurationDays.
   * Fails if customer already has an active subscription.
   */
  async completeTestPayment(
    customerId: number,
    tariffId: string,
  ): Promise<CustomerTariffDocument> {
    const existing =
      await this.customerTariffsRepository.findActiveByCustomerId(customerId);
    if (existing) {
      throw new BadRequestException(
        'У вас уже есть активная подписка. Новый тариф можно оформить после её окончания.',
      );
    }
    const tariff = await this.tariffService.findById(tariffId);
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }
    const days = tariff.activityDurationDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return this.applyTariff({ customerId, tariffId, expiresAt });
  }

  /**
   * Активировать пробный тариф: берётся последний по createdAt среди active + trial=true.
   * Нельзя, если уже есть активная подписка.
   */
  async activateTrialSubscription(
    customerId: number,
  ): Promise<ActiveSubscriptionDto> {
    const existing = await this.getActiveSubscription(customerId);
    if (existing) {
      throw new BadRequestException(
        'У вас уже есть активная подписка. Пробный период недоступен.',
      );
    }
    const tariff = await this.tariffService.getLatestActiveTrialTariff();
    const days = tariff.activityDurationDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await this.applyTariff({
      customerId,
      tariffId: tariff._id.toString(),
      expiresAt,
    });
    const sub = await this.getActiveSubscription(customerId);
    if (!sub) {
      throw new BadRequestException('Не удалось активировать подписку');
    }
    return sub;
  }
}
