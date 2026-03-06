import { Injectable } from '@nestjs/common';
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

  async findByCustomerId(customerId: number): Promise<CustomerTariffDocument[]> {
    return this.customerTariffsRepository.findByCustomerId(customerId);
  }

  async getActiveSubscription(
    customerId: number,
  ): Promise<ActiveSubscriptionDto | null> {
    const ct = await this.customerTariffsRepository.findActiveByCustomerId(
      customerId,
    );
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
}
