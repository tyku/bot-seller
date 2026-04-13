import { CustomerRole, CustomerStatus } from '../schemas/customer.schema';

export class ResponseCustomerDto {
  id: string;
  customerId: number;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  role: CustomerRole;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseCustomerDto>) {
    Object.assign(this, partial);
  }
}
