import type { ProviderId, NormalizedProviderError, ProviderErrorKind } from "./contract.js";

/**
 * description: Converts an unknown provider failure into the common provider error shape.
 * provider: Provider that produced the failure.
 * aerror: Provider-specific error value.
 * return: A normalized error with retry classification and safe metadata.
 */
export function normalizeProviderError(
  provider: ProviderId,
  error: unknown,
): NormalizedProviderError {
  const details = asErrorDetails(error);
  const statusCode = details.statusCode;
  const providerCode = details.code;
  const kind = classifyError(statusCode, providerCode, details.message);

  return {
    provider,
    kind,
    message: details.message,
    retryable: kind === "rate_limit" || kind === "timeout" || kind === "provider_unavailable",
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(providerCode === undefined ? {} : { providerCode }),
  };
}

/**
 * description: Extracts safe message, status, and provider code fields from an unknown error.
 * error: Unknown error value returned by a provider SDK or transport.
 * return: Safe error details used by the normalizer.
 */
function asErrorDetails(error: unknown): {
  message: string;
  statusCode?: number;
  code?: string;
} {
  if (error instanceof Error) {
    const details = error as Error & { status?: number; statusCode?: number; code?: string };
    return {
      message: error.message || "Provider request failed.",
      statusCode: details.statusCode ?? details.status,
      code: details.code,
    };
  }

  if (typeof error === "object" && error !== null) {
    const details = error as { message?: unknown; status?: unknown; statusCode?: unknown; code?: unknown };
    return {
      message: typeof details.message === "string" ? details.message : "Provider request failed.",
      statusCode: numberOrUndefined(details.statusCode) ?? numberOrUndefined(details.status),
      code: typeof details.code === "string" ? details.code : undefined,
    };
  }

  return { message: "Provider request failed." };
}

/**
 * description: Returns an integer value when the unknown input is an integer.
 * value: Unknown candidate numeric value.
 * return: The integer value or undefined.
 */
function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/**
 * description: Classifies a provider failure for retry and reporting behavior.
 * statusCode: Optional HTTP status code.
 * code: Optional provider error code.
 * message: Provider error message.
 * return: A normalized provider error category.
 */
function classifyError(statusCode: number | undefined, code: string | undefined, message: string): ProviderErrorKind {
  const normalizedCode = code?.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (statusCode === 401 || statusCode === 403 || normalizedCode?.includes("auth")) return "authentication";
  if (statusCode === 429 || normalizedCode?.includes("rate") || normalizedMessage.includes("rate limit")) {
    return "rate_limit";
  }
  if (statusCode !== undefined && statusCode >= 500) return "provider_unavailable";
  if (normalizedCode?.includes("timeout") || normalizedMessage.includes("timeout")) return "timeout";
  if (statusCode === 400 || statusCode === 422) return "invalid_request";
  return "unknown";
}
