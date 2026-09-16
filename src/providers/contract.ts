export const providerIds = ["anthropic", "openai", "gemini"] as const;

/**
 * description: Identifies a supported model provider.
 * return: A provider identifier from the supported provider set.
 */
export type ProviderId = (typeof providerIds)[number];

/**
 * description: Identifies the normalized message roles supported by the core workflow.
 * return: A system, user, or assistant role.
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * description: Represents provider-independent(means these interfaces use one common shape regardless of whether the request came from Anthropic, OpenAI, or Gemini.) text input.
 * return: A normalized message with role and text content.
 */
export interface NormalizedMessage {
  role: MessageRole;
  content: string;
}

/**
 * description: Represents a provider-independent model request.
 * return: Normalized model identity, messages, and optional generation settings.
 */
export interface NormalizedRequest {
  provider: ProviderId;
  model: string;
  messages: readonly NormalizedMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * description: Represents token counts returned by a provider.
 * return: Input, output, and total token counts.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * description: Represents a provider-independent model response.
 * return: Response text, model identity, usage, and optional provider metadata.
 */
export interface NormalizedResponse {
  provider: ProviderId;
  model: string;
  text: string;
  usage: TokenUsage | null;
  finishReason?: string;
  requestId?: string;
}

/**
 * description: Categorizes normalized provider failures for core retry and reporting logic.
 * return: A provider-independent error category.
 */
export type ProviderErrorKind =
  | "authentication"
  | "invalid_request"
  | "rate_limit"
  | "timeout"
  | "provider_unavailable"
  | "unknown";

/**
 * description: Represents a provider-independent error result.
 * return: Error category, safe message, retryability, and optional provider metadata.
 */
export interface NormalizedProviderError {
  provider: ProviderId;
  kind: ProviderErrorKind;
  message: string;
  retryable: boolean;
  statusCode?: number;
  providerCode?: string;
}

/**
 * description: Defines the boundary that converts provider-specific shapes into core types.
 * arg1: request - Provider-specific request shape.
 * arg2: response - Provider-specific response shape.
 * arg3: error - Provider-specific error value.
 * return: Normalized request, response, or error values.
 */
export interface ProviderAdapter<TRequest = unknown, TResponse = unknown> {
  readonly provider: ProviderId;
  normalizeRequest(request: TRequest): NormalizedRequest;
  normalizeResponse(response: TResponse): NormalizedResponse;
  normalizeError(error: unknown): NormalizedProviderError;
}

/**
 * description: Represents an adapter whose provider-specific request and response types are opaque to core code.
 * return: A provider adapter with unknown boundary types.
 */
export type AnyProviderAdapter = ProviderAdapter<unknown, unknown>;

/**
 * description: Stores provider adapters and resolves them without provider-specific branching in core code.
 * return: A provider adapter registry.
 */
export class ProviderRegistry {
  private readonly adapters = new Map<ProviderId, AnyProviderAdapter>();

  /**
   * description: Registers adapters and rejects duplicate provider registrations.
   * arg1: adapters - Provider adapters to register.
   * return: A configured provider registry.
   */
  constructor(adapters: readonly AnyProviderAdapter[]) {
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.provider)) {
        throw new Error(`A provider adapter is already registered for ${adapter.provider}.`);
      }
      this.adapters.set(adapter.provider, adapter);
    }
  }

  /**
   * description: Resolves the adapter registered for a provider.
   * arg1: provider - Provider identifier to resolve.
   * return: The registered provider adapter.
   */
  get(provider: ProviderId): AnyProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No provider adapter is registered for ${provider}.`);
    return adapter;
  }

  /**
   * description: Checks whether an adapter is registered for a provider.
   * arg1: provider - Provider identifier to check.
   * return: True when an adapter is registered, otherwise false.
   */
  has(provider: ProviderId): boolean {
    return this.adapters.has(provider);
  }
}
