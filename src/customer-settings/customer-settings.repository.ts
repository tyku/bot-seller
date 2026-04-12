import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CustomerSettings,
  CustomerSettingsDocument,
  BotStatus,
  BotType,
} from './schemas/customer-settings.schema';

// BotStatus used in countNonArchivedByCustomerId
import type { CreateCustomerSettingsDto } from './dto/create-customer-settings.dto';

@Injectable()
export class CustomerSettingsRepository {
  constructor(
    @InjectModel(CustomerSettings.name)
    private customerSettingsModel: Model<CustomerSettingsDocument>,
  ) {}

  async create(
    data: CreateCustomerSettingsDto & {
      webhookSecret?: string;
      vkConfirmationCode?: string;
      vkCallbackSecret?: string;
    },
  ): Promise<CustomerSettingsDocument> {
    const customerSettings = new this.customerSettingsModel(data);
    return customerSettings.save();
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<CustomerSettingsDocument[]> {
    return this.customerSettingsModel.find({ customerId }).exec();
  }

  /** Количество ботов без архива (учитываются в лимите тарифа) */
  async countNonArchivedByCustomerId(customerId: string): Promise<number> {
    return this.customerSettingsModel
      .countDocuments({
        customerId,
        status: { $ne: BotStatus.ARCHIVED },
      })
      .exec();
  }

  async findById(id: string): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel.findById(id).exec();
  }

  async findAll(): Promise<CustomerSettingsDocument[]> {
    return this.customerSettingsModel.find().exec();
  }

  async findByStatusAndBotType(
    status: BotStatus,
    botType: BotType,
  ): Promise<CustomerSettingsDocument[]> {
    return this.customerSettingsModel.find({ status, botType }).exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateCustomerSettingsDto> & {
      currentNormalizedPromptId?: Types.ObjectId;
    },
  ): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<CustomerSettingsDocument | null> {
    return this.customerSettingsModel.findByIdAndDelete(id).exec();
  }
}
