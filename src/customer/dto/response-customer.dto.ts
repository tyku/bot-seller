import { CustomerStatus } from '../schemas/customer.schema';

export class ResponseCustomerDto {
  id: string;
  customerId: number;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseCustomerDto>) {
    Object.assign(this, partial);
  }
}
