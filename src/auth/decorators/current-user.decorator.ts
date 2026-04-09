import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CustomerRole } from '../../customer/schemas/customer.schema';

export interface CurrentUserData {
  _id: string;
  customerId: number;
  email: string;
  role: CustomerRole;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
