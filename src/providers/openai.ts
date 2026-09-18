import type OpenAI from "openai";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import type {
  NormalizedProviderError,
  NormalizedRequest,
  NormalizedResponse,
  ProviderAdapter,
} from "./contract.js";
import { normalizeProviderError } from "./errors.js";

/**
 * description: Defines the text-only non-streaming request accepted by the OpenAI adapter.
 */
export type OpenAITextRequest = Omit<ResponseCreateParamsNonStreaming, "stream" | "input" | "model"> & {
  model: string;
  input: string;
};

/**
 * description: Defines the smallest OpenAI client surface required by the adapter.
 */
export interface OpenAIResponsesClient {
  responses: {
    create(request: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
}

/**
 * description: Adapts OpenAI Responses requests and responses to the common provider contract.
 * return: An OpenAI provider adapter.
 */
export class OpenAIAdapter implements ProviderAdapter<OpenAITextRequest, Response> {
  readonly provider = "openai" as const;

  /**
   * description: Creates an adapter backed by an OpenAI Responses client.
   * client - OpenAI SDK client or compatible test double.
   * return: A configured OpenAI adapter.
   */
  constructor(private readonly client: OpenAIResponsesClient) {}

  /**
   * description: Sends one non-streaming text request and returns OpenAI's original response unchanged.
   * request - OpenAI text request parameters.
   * return: The original OpenAI Response object.
   */
  async create(request: OpenAITextRequest): Promise<Response> {
    return this.client.responses.create({ ...request, stream: false });
  }

  /**
   * description: Converts an OpenAI request into the normalized request shape.
   * request - OpenAI text request parameters.
   * return: Provider-independent normalized request.
   */
  normalizeRequest(request: OpenAITextRequest): NormalizedRequest {
    return {
      provider: "openai",
      model: request.model,
      messages: [
        ...(request.instructions ? [{ role: "system" as const, content: request.instructions }] : []),
        { role: "user", content: request.input },
      ],
      ...(request.max_output_tokens == null ? {} : { maxOutputTokens: request.max_output_tokens }),
      ...(request.temperature == null ? {} : { temperature: request.temperature }),
    };
  }

  /**
   * description: Converts OpenAI output text and usage fields into the normalized response shape.
   * response - Original OpenAI Response object.
   * return: Provider-independent normalized response.
   */
  normalizeResponse(response: Response): NormalizedResponse {
    return {
      provider: "openai",
      model: response.model,
      text: response.output_text,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
      requestId: response.id,
      finishReason: response.status,
    };
  }

  /**
   * description: Converts an OpenAI error into the common provider error shape.
   * error - Original OpenAI error value.
   * return: Provider-independent normalized error.
   */
  normalizeError(error: unknown): NormalizedProviderError {
    return normalizeProviderError("openai", error);
  }
}

/**
 * description: Creates an OpenAI adapter from the official SDK client.
 * client - Official OpenAI SDK client.
 * return: A configured OpenAI adapter.
 */
export function createOpenAIAdapter(client: OpenAI): OpenAIAdapter {
  return new OpenAIAdapter(client);
}
