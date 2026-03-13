export type Primitive = string | number | boolean | null | undefined;

export interface SanitizeOptions {
  /**
   * If true, phone numbers are also redacted.
   * Default: true
   */
  redactPhones?: boolean;
  /**
   * If true, email addresses are also redacted.
   * Default: true
   */
  redactEmails?: boolean;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  redactPhones: true,
  redactEmails: true,
};

/**
 * Luhn algorithm check for payment card numbers.
 * Works with a string of digits (no spaces/dashes).
 */
function isValidLuhn(number: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i]);
    if (Number.isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Try to redact payment card numbers in various formats (spaces/dashes).
 * Examples:
 * - 4111 1111 1111 1111
 * - 4111-1111-1111-1111
 * - 4111111111111111
 */
function redactCardNumbers(input: string): string {
  const cardLikePattern = /\b(?:\d[ -]*?){13,19}\b/g;

  return input.replace(cardLikePattern, (match) => {
    const digitsOnly = match.replace(/\D/g, '');

    if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      return match;
    }

    if (!isValidLuhn(digitsOnly)) {
      return match;
    }

    return '[CARD_NUMBER_REDACTED]';
  });
}

/**
 * Redact Russian SNILS numbers in common formats:
 * - 123-456-789 00
 * - 12345678900
 */
function redactSnils(input: string): string {
  const snilsPattern = /\b\d{3}-\d{3}-\d{3}\s?\d{2}\b/g;
  const snilsCompactPattern = /\b\d{11}\b/g;

  let result = input.replace(snilsPattern, '[SNILS_REDACTED]');

  result = result.replace(snilsCompactPattern, (match) => {
    // Heuristic: treat 11-digit sequences as SNILS-like and redact
    return '[SNILS_REDACTED]';
  });

  return result;
}

/**
 * Redact Russian internal/foreign passport / generic document numbers:
 * - 12 34 567890
 * - 1234 567890
 * - 1234-567890
 */
function redactDocumentNumbers(input: string): string {
  const passportPattern = /\b\d{2}\s?\d{2}\s?\d{6}\b/g;
  const docPattern = /\b\d{4}[ -]?\d{6}\b/g;

  return input
    .replace(passportPattern, '[DOC_NUMBER_REDACTED]')
    .replace(docPattern, '[DOC_NUMBER_REDACTED]');
}

/**
 * Redact Russian / generic driver license numbers.
 * Russian example: 12 34 567890, 1234 567890, 1234567890
 */
function redactDriverLicense(input: string): string {
  const driverPattern = /\b\d{2}\s?\d{2}\s?\d{6}\b/g;
  const driverCompactPattern = /\b\d{10}\b/g;

  return input
    .replace(driverPattern, '[DRIVER_LICENSE_REDACTED]')
    .replace(driverCompactPattern, '[DRIVER_LICENSE_REDACTED]');
}

/**
 * Redact potential full names (ФИО) for Russian / Latin alphabets.
 * Heuristic: 2–3 consecutive capitalized words.
 * Examples:
 * - Иванов Иван Иванович
 * - Ivanov Ivan
 */
function redactNames(input: string): string {
  const namePattern =
    /\b([A-ZА-ЯЁ][a-zа-яё]+)\s+([A-ZА-ЯЁ][a-zа-яё]+)(?:\s+([A-ZА-ЯЁ][a-zа-яё]+))?\b/gu;

  return input.replace(namePattern, '[NAME_REDACTED]');
}

/**
 * Redact common address patterns (Russian + simple English).
 * This is heuristic and focuses on street-level parts.
 */
function redactAddresses(input: string): string {
  const russianAddressPattern =
    /\b(ул\.?|улица|просп\.?|проспект|пер\.?|переулок|пл\.?|площадь|бул\.?|бульвар|шоссе|ш\.?|г\.|город)\s+[^,;.\n]+/gi;

  const englishAddressPattern =
    /\b(st\.?|street|ave\.?|avenue|road|rd\.?|lane|ln\.?|blvd\.?|boulevard|drive|dr\.?)\s+[^,;.\n]+/gi;

  return input
    .replace(russianAddressPattern, '[ADDRESS_REDACTED]')
    .replace(englishAddressPattern, '[ADDRESS_REDACTED]');
}

/**
 * Redact phone numbers (simple heuristics, including +7, 8, international).
 * Examples:
 * - +7 999 123-45-67
 * - 8 (999) 123-45-67
 * - +1-202-555-0173
 */
function redactPhones(input: string): string {
  const phonePattern =
    /\b(?:\+?\d{1,3}[ \-()]*)?(?:\d[ \-()]*){7,}\b/g;

  return input.replace(phonePattern, '[PHONE_REDACTED]');
}

/**
 * Redact email addresses.
 */
function redactEmails(input: string): string {
  const emailPattern =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  return input.replace(emailPattern, '[EMAIL_REDACTED]');
}

/**
 * Sanitize a plain string from PII.
 * Order of operations is important to avoid overlapping patterns.
 */
export function sanitizeText(text: string, options?: SanitizeOptions): string {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  const opts = { ...DEFAULT_OPTIONS, ...(options || {}) };

  let result = text;

  // Specific numeric identifiers first
  result = redactSnils(result);
  result = redactDriverLicense(result);
  result = redactDocumentNumbers(result);
  result = redactCardNumbers(result);

  // Contact info
  if (opts.redactEmails) {
    result = redactEmails(result);
  }
  if (opts.redactPhones) {
    result = redactPhones(result);
  }

  // Textual identifiers
  result = redactAddresses(result);
  result = redactNames(result);

  return result;
}

/**
 * Recursively sanitize any JSON-serializable value.
 * Strings are sanitized, arrays/objects are traversed.
 */
export function sanitizeDeep<T>(value: T, options?: SanitizeOptions): T {
  const visited = new WeakMap<object, any>();

  function innerSanitize<V>(val: V): V {
    if (typeof val === 'string') {
      return sanitizeText(val, options) as unknown as V;
    }

    if (val === null || val === undefined) {
      return val;
    }

    if (Array.isArray(val)) {
      return val.map((item) => innerSanitize(item)) as unknown as V;
    }

    if (typeof val === 'object') {
      const existing = visited.get(val as unknown as object);
      if (existing) {
        return existing;
      }

      const result: any = Array.isArray(val) ? [] : {};
      visited.set(val as unknown as object, result);

      for (const [key, item] of Object.entries(val as any)) {
        // If key itself is clearly PII (email, phone, name, etc.), redact aggressively
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret')
        ) {
          result[key] = '[SENSITIVE_REDACTED]';
          continue;
        }

        if (
          lowerKey.includes('email') ||
          lowerKey.includes('phone') ||
          lowerKey.includes('tel') ||
          lowerKey.includes('name') ||
          lowerKey.includes('fio') ||
          lowerKey.includes('address')
        ) {
          if (typeof item === 'string') {
            result[key] = sanitizeText(item, options);
            continue;
          }
        }

        result[key] = innerSanitize(item);
      }

      return result;
    }

    return val;
  }

  return innerSanitize(value);
}

