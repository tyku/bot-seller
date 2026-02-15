/**
 * Extracts error message from various error formats
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (!error) {
    return defaultMessage;
  }

  // If it's already a string
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // If it's an axios error with response data (legacy format, before interceptor)
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Check for response.data.message (axios error format)
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    
    // Check for message property
    if (err.message) {
      return err.message;
    }
  }

  return defaultMessage;
}
