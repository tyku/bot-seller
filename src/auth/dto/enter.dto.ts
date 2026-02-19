import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const EnterSchema = z.object({
  contact: z
    .string()
    .min(1, 'Contact is required')
    .refine(
      (val) => emailRegex.test(val) || phoneRegex.test(val),
      'Must be a valid email or phone number',
    ),
});

export type EnterDto = z.infer<typeof EnterSchema>;

export function detectContactType(contact: string): 'email' | 'phone' {
  return emailRegex.test(contact) ? 'email' : 'phone';
}
