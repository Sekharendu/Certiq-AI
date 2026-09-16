import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ProviderRegistry,
  normalizeProviderError,
  type ProviderAdapter,
  type NormalizedRequest,
  type NormalizedResponse,
} from "./index.js";

/**
 * description: Represents a provider-specific request used to exercise the adapter contract.
 * return: A fake model and prompt request.
 */
interface FakeRequest {
  model: string;
  prompt: string;
}

/**
 * description: Represents a provider-specific response used to exercise normalization.
 * return: A fake response with model, text, and token fields.
 */
interface FakeResponse {
  id: string;
  model: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
}

const fakeAdapter: ProviderAdapter<FakeRequest, FakeResponse> = {
  provider: "openai",
  /**
   * description: Converts the fake provider request into the common request shape.
   * arg1: request - Fake provider request.
   * return: Normalized provider request.
   */
  normalizeRequest(request): NormalizedRequest {
    return {
      provider: "openai",
      model: request.model,
      messages: [{ role: "user", content: request.prompt }],
    };
  },
  /**
   * description: Converts the fake provider response into the common response shape.
   * arg1: response - Fake provider response.
   * return: Normalized provider response.
   */
  normalizeResponse(response): NormalizedResponse {
    return {
      provider: "openai",
      model: response.model,
      text: response.output,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.inputTokens + response.outputTokens,
      },
      requestId: response.id,
    };
  },
  /**
   * description: Converts a fake provider failure into the common error shape.
   * arg1: error - Unknown provider error.
   * return: Normalized provider error.
   */
  normalizeError(error) {
    return normalizeProviderError("openai", error);
  },
};

describe("provider adapter contract", () => {
  it("normalizes provider-specific request and response shapes", () => {
    const request = fakeAdapter.normalizeRequest({ model: "gpt-test", prompt: "Hello" });
    const response = fakeAdapter.normalizeResponse({
      id: "request-1",
      model: "gpt-test",
      output: "Hi",
      inputTokens: 3,
      outputTokens: 2,
    });

    assert.deepEqual(request, {
      provider: "openai",
      model: "gpt-test",
      messages: [{ role: "user", content: "Hello" }],
    });
    assert.deepEqual(response.usage, { inputTokens: 3, outputTokens: 2, totalTokens: 5 });
    assert.equal(response.text, "Hi");
  });

  it("normalizes errors without exposing provider-specific error objects to core code", () => {
    const error = fakeAdapter.normalizeError({ status: 429, code: "rate_limit_exceeded", message: "Slow down" });

    assert.deepEqual(error, {
      provider: "openai",
      kind: "rate_limit",
      message: "Slow down",
      retryable: true,
      statusCode: 429,
      providerCode: "rate_limit_exceeded",
    });
  });

  it("selects adapters by provider and rejects duplicate registrations", () => {
    const registry = new ProviderRegistry([fakeAdapter]);
    assert.equal(registry.has("openai"), true);
    assert.equal(registry.get("openai"), fakeAdapter);
    assert.throws(() => new ProviderRegistry([fakeAdapter, fakeAdapter]), /already registered/);
    assert.throws(() => registry.get("anthropic"), /No provider adapter/);
  });
});
