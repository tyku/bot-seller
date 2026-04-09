import { CustomerRole } from '../customer/schemas/customer.schema';

/** Hardcoded admin email — admin access only applies in DEV (see `isAdmin`). */
export const ADMIN_EMAIL = 'mr.churilov@gmail.com';

/** Same rule as `configuration.nodeEnv`: only `development` counts as DEV for admin. */
export function isDevelopmentNodeEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'development';
}

export function isAdmin(
  user: {
    email?: string;
    role?: CustomerRole;
  },
  isDevEnvironment: boolean,
): boolean {
  if (!isDevEnvironment) return false;
  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function resolveRole(
  user: {
    email?: string;
    role?: CustomerRole;
  },
  isDevEnvironment: boolean,
): CustomerRole {
  return isAdmin(user, isDevEnvironment) ? CustomerRole.ADMIN : CustomerRole.USER;
}
