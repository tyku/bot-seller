import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CustomerSettings,
  CustomerSettingsDocument,
} from './schemas/customer-settings.schema';
import type { CreateCustomerSettingsDto } from './dto/create-customer-settings.dto';

@Injectable()
export class CustomerSettingsRepository {
  constructor(
    @InjectModel(CustomerSettings.name)
    private customerSettingsModel: Model<CustomerSettingsDocument>,
  ) {}

  async create(
    createCustomerSettingsDto: CreateCustomerSettingsDto,
  ): Promise<CustomerSettingsDocument> {
    const customerSettings = new this.customerSettingsModel(
      createCustomerSettingsDto,
    );
    return customerSettings.save();
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<CustomerSettingsDocument[]> {
    return this.customerSettingsModel.find({ customerId }).exec();
  }

  async findById(id: string): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel.findById(id).exec();
  }

  async findAll(): Promise<CustomerSettingsDocument[]> {
    return this.customerSettingsModel.find().exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateCustomerSettingsDto>,
  ): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel.findByIdAndDelete(id).exec();
  }
}
