import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import type { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Get next customerId using atomic counter operation
   * This is thread-safe and performs well under high load
   */
  private async getNextCustomerId(session?: ClientSession): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'customerId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    );
    return counter.seq;
  }

  /**
   * Create customer with transaction support for full atomicity
   * Ensures customerId is not wasted if save fails
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
    const session = await this.connection.startSession();
    
    try {
      let result: CustomerDocument | null = null;
      
      await session.withTransaction(async () => {
        // Get next ID within transaction
        const customerId = await this.getNextCustomerId(session);
        
        // Create and save customer within same transaction
        const customer = new this.customerModel({
          ...createCustomerDto,
          customerId,
        });
        
        result = await customer.save({ session });
      });
      
      if (!result) {
        throw new Error('Transaction failed to create customer');
      }
      
      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create customer without transaction (faster, but may skip IDs on error)
   * Use this if you don't care about gaps in customerId sequence
   */
  async createFast(createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
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
}
