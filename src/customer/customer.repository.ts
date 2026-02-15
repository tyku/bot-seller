import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import type { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  /**
   * Get next customerId using atomic counter operation
   * This is thread-safe and performs well under high load
   */
  private async getNextCustomerId(): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'customerId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  /**
   * Create customer with auto-incremented customerId
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
    const customerId = await this.getNextCustomerId();
    const customer = new this.customerModel({
      ...createCustomerDto,
      customerId,
    });
    return customer.save();
  }

  async findByEmail(email: string): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ email }).exec();
  }

  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ phone }).exec();
  }

  async findByCustomerId(customerId: number): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ customerId }).exec();
  }

  async findById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel.findById(id).exec();
  }

  async findAll(): Promise<CustomerDocument[]> {
    return this.customerModel.find().exec();
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async update(
    id: string,
    updateData: Partial<Customer>,
  ): Promise<CustomerDocument | null> {
    return this.customerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findByTelegramId(telegramId: number): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ telegramId }).exec();
  }
}
