import { Injectable } from '@nestjs/common';
import { CustomerTariffsRepository } from './customer-tariffs.repository';
import { CustomerTariffDocument } from './schemas/customer-tariff.schema';

@Injectable()
export class CustomerTariffsService {
  constructor(
    private readonly customerTariffsRepository: CustomerTariffsRepository,
  ) {}

  async findByCustomerId(customerId: number): Promise<CustomerTariffDocument[]> {
    return this.customerTariffsRepository.findByCustomerId(customerId);
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
