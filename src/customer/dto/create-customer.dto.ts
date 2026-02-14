import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long'),
  
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase(),
  
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)')
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must be at most 15 characters'),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
