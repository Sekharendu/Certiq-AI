import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type {
  NormalizedProviderError,
  NormalizedRequest,
  NormalizedResponse,
  ProviderAdapter,
} from "./contract.js";
import { normalizeProviderError } from "./errors.js";

/**
 * description: Defines the text-only non-streaming request accepted by the Anthropic adapter.
 */
export type AnthropicTextRequest = Omit<MessageCreateParamsNonStreaming, "stream" | "messages" | "system"> & {
  system?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

/**
 * description: Defines the smallest Anthropic client surface required by the adapter.
 */
export interface AnthropicMessagesClient {
  messages: {
    create(request: MessageCreateParamsNonStreaming): Promise<Message>;
  };
}

/**
 * description: Adapts Anthropic Messages requests and responses to the common provider contract.
 * return: An Anthropic provider adapter.
 */
export class AnthropicAdapter implements ProviderAdapter<AnthropicTextRequest, Message> {
  readonly provider = "anthropic" as const;

  /**
   * description: Creates an adapter backed by an Anthropic Messages client.
   * client - Anthropic SDK client.
   * return: A configured Anthropic adapter.
   */
  constructor(private readonly client: AnthropicMessagesClient) {}

  /**
   * description: Sends one non-streaming text request and returns Anthropic's original response unchanged.
   * request: Anthropic text request parameters.
   * return: The original Anthropic Message response.
   */
  async create(request: AnthropicTextRequest): Promise<Message> {
    return this.client.messages.create({ ...request, stream: false });
  }

  /**
   * description: Converts an Anthropic request into the normalized request shape.
   * request - Anthropic text request parameters.
   * return: Provider-independent normalized request.
   */
  normalizeRequest(request: AnthropicTextRequest): NormalizedRequest {
    return {
      provider: "anthropic",
      model: request.model,
      messages: [
        ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
        ...request.messages,
      ],
      ...(request.max_tokens === undefined ? {} : { maxOutputTokens: request.max_tokens }),
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
    };
  }

  /**
   * description: Converts Anthropic text blocks and usage fields into the normalized response shape.
   * response - Original Anthropic Message response.
   * return: Provider-independent normalized response.
   */
  normalizeResponse(response: Message): NormalizedResponse {
    const inputTokens =
      response.usage.input_tokens +
      (response.usage.cache_creation_input_tokens ?? 0) +
      (response.usage.cache_read_input_tokens ?? 0);
    const outputTokens = response.usage.output_tokens;

    return {
      provider: "anthropic",
      model: response.model,
      text: response.content
        .filter((block): block is Extract<Message["content"][number], { type: "text" }> => block.type === "text")
        .map((block) => block.text)
        .join(""),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      requestId: response.id,
      ...(response.stop_reason === null ? {} : { finishReason: response.stop_reason }),
    };
  }

  /**
   * description: Converts an Anthropic error into the common provider error shape.
   * error - Original Anthropic error value.
   * return: Provider-independent normalized error.
   */
  normalizeError(error: unknown): NormalizedProviderError {
    return normalizeProviderError("anthropic", error);
  }
}

/**
 * description: Creates an Anthropic adapter from the official SDK client.
 * client: Official Anthropic SDK client.
 * return: A configured Anthropic adapter.
 */
export function createAnthropicAdapter(client: Anthropic): AnthropicAdapter {
  return new AnthropicAdapter(client);
}
