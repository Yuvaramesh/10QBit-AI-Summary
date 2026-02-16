/**
 * Maps error codes to professional, user-friendly single-line messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
  SERVICE_QUOTA_EXCEEDED:
    "The AI service is temporarily unavailable due to high demand. Please try again in a few moments.",
  SERVICE_PERMISSION_DENIED:
    "The AI service is currently unavailable. Please contact support if this persists.",
  SERVICE_TEMPORARILY_UNAVAILABLE:
    "The AI service is temporarily unavailable. Please try again shortly.",
  SERVICE_INVALID_API_KEY:
    "Service configuration error. Please contact support.",
  SERVICE_RESOURCE_EXHAUSTED:
    "The service is experiencing high load. Please try again in a moment.",
  SERVICE_INVALID_REQUEST:
    "Invalid request format. Please check your input and try again.",
  SERVICE_UNKNOWN_ERROR:
    "An unexpected error occurred. Please try again later.",
};

/**
 * Formats error messages to be professional and concise
 * Returns a single-line user-friendly message
 */
export function formatErrorMessage(
  errorCode: string,
  fallbackMessage?: string,
): string {
  // If it's a known error code, return the professional message
  if (errorCode in ERROR_MESSAGES) {
    return ERROR_MESSAGES[errorCode];
  }

  // If there's a fallback message, return it (already processed)
  if (fallbackMessage) {
    return fallbackMessage;
  }

  // Default fallback
  return ERROR_MESSAGES.SERVICE_UNKNOWN_ERROR;
}

/**
 * Extracts error code from error message string
 */
export function extractErrorCode(errorMessage: string): string {
  if (errorMessage.includes("SERVICE_")) {
    const match = errorMessage.match(/SERVICE_\w+/);
    return match ? match[0] : "SERVICE_UNKNOWN_ERROR";
  }
  return "SERVICE_UNKNOWN_ERROR";
}

/**
 * Creates a clean error message for API responses
 */
export function createErrorResponse(error: unknown): {
  error: string;
  code: string;
} {
  let errorMessage = "An error occurred while processing your request.";
  let errorCode = "SERVICE_UNKNOWN_ERROR";

  if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Extract the error code
  errorCode = extractErrorCode(errorMessage);

  // Get the professional message
  const professionalMessage = formatErrorMessage(errorCode);

  return {
    error: professionalMessage,
    code: errorCode,
  };
}
