import type { User } from '@/lib/types';

/** Must match backend `src/auth/roles.ts` — hardcoded admin. */
export const ADMIN_EMAIL = 'mr.churilov@gmail.com';

export function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isAdmin(user: User | null | undefined): boolean {
  if (!isDevelopmentRuntime()) return false;
  if (!user) return false;
  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
