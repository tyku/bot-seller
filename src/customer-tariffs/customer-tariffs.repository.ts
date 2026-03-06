import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CustomerTariff,
  CustomerTariffDocument,
} from './schemas/customer-tariff.schema';

@Injectable()
export class CustomerTariffsRepository {
  constructor(
    @InjectModel(CustomerTariff.name)
    private customerTariffModel: Model<CustomerTariffDocument>,
  ) {}

  async findByCustomerId(customerId: number): Promise<CustomerTariffDocument[]> {
    return this.customerTariffModel.find({ customerId }).exec();
  }

  /**
   * Active = not expired: expiresAt is null or expiresAt > now.
   * Returns the current active subscription (most recent by appliedAt).
   */
  async findActiveByCustomerId(
    customerId: number,
  ): Promise<CustomerTariffDocument | null> {
    const now = new Date();
    return this.customerTariffModel
      .findOne({
        customerId,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .sort({ appliedAt: -1 })
      .limit(1)
      .exec();
  }

  async findByCustomerAndTariff(
    customerId: number,
    tariffId: string,
  ): Promise<CustomerTariffDocument | null> {
    const filter = { customerId, tariffId };
    return this.customerTariffModel
      .findOne(filter as unknown as Parameters<Model<CustomerTariffDocument>['findOne']>[0])
      .exec();
  }

  async create(data: {
    customerId: number;
    tariffId: string;
    appliedAt?: Date;
    expiresAt?: Date;
  }): Promise<CustomerTariffDocument> {
    const customerTariff = new this.customerTariffModel(data);
    return customerTariff.save();
  }

  async findById(id: string): Promise<CustomerTariffDocument | null> {
    return this.customerTariffModel.findById(id).exec();
  }

  async update(
    id: string,
    updateData: Partial<Pick<CustomerTariff, 'expiresAt'>>,
  ): Promise<CustomerTariffDocument | null> {
    return this.customerTariffModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<CustomerTariffDocument | null> {
    return this.customerTariffModel.findByIdAndDelete(id).exec();
  }
}
