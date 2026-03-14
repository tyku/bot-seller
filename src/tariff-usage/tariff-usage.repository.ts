import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TariffUsage, TariffUsageDocument } from './schemas/tariff-usage.schema';
import {
  CustomerChat,
  CustomerChatDocument,
} from './schemas/customer-chat.schema';

@Injectable()
export class TariffUsageRepository implements OnModuleInit {
  constructor(
    @InjectModel(TariffUsage.name)
    private tariffUsageModel: Model<TariffUsageDocument>,
    @InjectModel(CustomerChat.name)
    private customerChatModel: Model<CustomerChatDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Удаляем старый уникальный индекс customerId_1 (остался от схемы до введения tariffId).
    // Без этого при создании второй записи на одного customerId (другой tariffId) падаем с E11000.
    try {
      await this.tariffUsageModel.collection.dropIndex('customerId_1');
    } catch {
      // Индекс уже удалён или не существовал — игнорируем
    }
  }

  /**
   * @param tariffId — привязка к тарифу подписки; для старых записей можно не передавать
   */
  async getOrCreateUsage(
    customerId: number,
    tariffId?: string | null,
  ): Promise<TariffUsageDocument> {
    const filter =
      tariffId !== undefined
        ? { customerId, tariffId: tariffId ?? null }
        : {
            customerId,
            $or: [{ tariffId: null }, { tariffId: { $exists: false } }],
          };
    let doc = await this.tariffUsageModel.findOne(filter).exec();
    if (!doc) {
      doc = await this.tariffUsageModel.create({
        customerId,
        tariffId: tariffId ?? null,
        requestsUsed: 0,
        botsUsed: 0,
      });
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

  async incrementRequests(
    customerId: number,
    tariffId?: string | null,
  ): Promise<void> {
    const filter =
      tariffId !== undefined
        ? { customerId, tariffId: tariffId ?? null }
        : {
            customerId,
            $or: [{ tariffId: null }, { tariffId: { $exists: false } }],
          };
    await this.tariffUsageModel
      .findOneAndUpdate(filter, {
        $inc: { requestsUsed: 1 },
        $setOnInsert: { customerId, tariffId: tariffId ?? null },
      }, { new: true, upsert: true })
      .exec();
  }

  async set75NotificationSent(
    customerId: number,
    tariffId?: string | null,
  ): Promise<void> {
    const filter =
      tariffId !== undefined
        ? { customerId, tariffId: tariffId ?? null }
        : {
            customerId,
            $or: [{ tariffId: null }, { tariffId: { $exists: false } }],
          };
    await this.tariffUsageModel
      .findOneAndUpdate(filter, {
        $set: { last75NotificationSentAt: new Date() },
        $setOnInsert: { customerId, tariffId: tariffId ?? null },
      }, { new: true, upsert: true })
      .exec();
  }

  async getUsage(
    customerId: number,
    tariffId?: string | null,
  ): Promise<{
    requestsUsed: number;
    chatsUsed: number;
    botsUsed: number;
    last75NotificationSentAt: Date | null;
  }> {
    const [usage, chatsUsed] = await Promise.all([
      this.getOrCreateUsage(customerId, tariffId),
      this.getChatsCount(customerId),
    ]);
    return {
      requestsUsed: usage.requestsUsed,
      chatsUsed,
      botsUsed: usage.botsUsed ?? 0,
      last75NotificationSentAt: usage.last75NotificationSentAt ?? null,
    };
  }

  async incrementBotsUsed(
    customerId: number,
    tariffId?: string | null,
  ): Promise<void> {
    const filter =
      tariffId !== undefined
        ? { customerId, tariffId: tariffId ?? null }
        : {
            customerId,
            $or: [{ tariffId: null }, { tariffId: { $exists: false } }],
          };
    await this.tariffUsageModel
      .findOneAndUpdate(filter, {
        $inc: { botsUsed: 1 },
        $setOnInsert: { customerId, tariffId: tariffId ?? null, requestsUsed: 0 },
      }, { new: true, upsert: true })
      .exec();
  }

  /** Декремент с ограничением снизу 0 (на случай рассинхрона). */
  async decrementBotsUsed(
    customerId: number,
    tariffId?: string | null,
  ): Promise<void> {
    const filter =
      tariffId !== undefined
        ? { customerId, tariffId: tariffId ?? null }
        : {
            customerId,
            $or: [{ tariffId: null }, { tariffId: { $exists: false } }],
          };
    await this.tariffUsageModel
      .findOneAndUpdate(
        { ...filter, botsUsed: { $gt: 0 } },
        { $inc: { botsUsed: -1 } },
      )
      .exec();
  }
}
