import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TariffUsage, TariffUsageDocument } from './schemas/tariff-usage.schema';
import {
  CustomerChat,
  CustomerChatDocument,
} from './schemas/customer-chat.schema';

@Injectable()
export class TariffUsageRepository {
  constructor(
    @InjectModel(TariffUsage.name)
    private tariffUsageModel: Model<TariffUsageDocument>,
    @InjectModel(CustomerChat.name)
    private customerChatModel: Model<CustomerChatDocument>,
  ) {}

  async getOrCreateUsage(customerId: number): Promise<TariffUsageDocument> {
    let doc = await this.tariffUsageModel.findOne({ customerId }).exec();
    if (!doc) {
      doc = await this.tariffUsageModel.create({ customerId, requestsUsed: 0 });
    }
    return doc;
  }

  async getChatsCount(customerId: number): Promise<number> {
    return this.customerChatModel.countDocuments({ customerId }).exec();
  }

  async hasChat(customerId: number, chatId: string): Promise<boolean> {
    const doc = await this.customerChatModel
      .findOne({ customerId, chatId })
      .exec();
    return !!doc;
  }

  /** Returns true if chat was new and we inserted it, false if already existed */
  async ensureChat(customerId: number, chatId: string): Promise<boolean> {
    const existing = await this.customerChatModel
      .findOne({ customerId, chatId })
      .exec();
    if (existing) return false;
    try {
      await this.customerChatModel.create({ customerId, chatId });
      return true;
    } catch (err: any) {
      if (err?.code === 11000) return false;
      throw err;
    }
  }

  async incrementRequests(customerId: number): Promise<void> {
    await this.tariffUsageModel
      .findOneAndUpdate(
        { customerId },
        { $inc: { requestsUsed: 1 } },
        { new: true, upsert: true },
      )
      .exec();
  }

  async set75NotificationSent(customerId: number): Promise<void> {
    await this.tariffUsageModel
      .findOneAndUpdate(
        { customerId },
        { last75NotificationSentAt: new Date() },
        { new: true, upsert: true },
      )
      .exec();
  }

  async getUsage(customerId: number): Promise<{
    requestsUsed: number;
    chatsUsed: number;
    last75NotificationSentAt: Date | null;
  }> {
    const [usage, chatsUsed] = await Promise.all([
      this.getOrCreateUsage(customerId),
      this.getChatsCount(customerId),
    ]);
    return {
      requestsUsed: usage.requestsUsed,
      chatsUsed,
      last75NotificationSentAt: usage.last75NotificationSentAt ?? null,
    };
  }
}
