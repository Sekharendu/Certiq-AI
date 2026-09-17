import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { AnthropicAdapter, type AnthropicTextRequest } from "./anthropic.js";

/**
 * description: Creates a typed Anthropic response fixture for adapter tests.
 * return: A representative non-streaming Anthropic Message response.
 */
function createMessageFixture(): Message {
  return {
    id: "msg_fixture_123",
    container: null,
    content: [
      { type: "text", text: "Hello from Claude.", citations: null },
      { type: "text", text: " This is a fixture.", citations: null },
    ],
    model: "claude-sonnet-test",
    role: "assistant",
    stop_details: null,
    stop_reason: "end_turn",
    stop_sequence: null,
    type: "message",
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: 2,
      cache_read_input_tokens: 3,
      inference_geo: null,
      input_tokens: 11,
      output_tokens: 7,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

/**
 * description: Creates the minimum valid Anthropic request used by adapter tests.
 * return: A non-streaming text request fixture.
 */
function createRequestFixture(): AnthropicTextRequest {
  return {
    model: "claude-sonnet-test",
    max_tokens: 128,
    system: "Be concise.",
    messages: [{ role: "user", content: "Say hello." }],
  };
}

describe("AnthropicAdapter", () => {
  it("returns the original response and forces non-streaming mode", async () => {
    const response = createMessageFixture();
    let receivedRequest: unknown;
    const adapter = new AnthropicAdapter({
      messages: {
        async create(request) {
          receivedRequest = request;
          return response;
        },
      },
    });

    const result = await adapter.create(createRequestFixture());

    assert.equal(result, response);
    assert.deepEqual(receivedRequest, { ...createRequestFixture(), stream: false });
  });

  it("normalizes text, model identity, stop reason, and cache-inclusive usage", () => {
    const normalized = new AnthropicAdapter({ messages: { create: async () => createMessageFixture() } })
      .normalizeResponse(createMessageFixture());

    assert.deepEqual(normalized, {
      provider: "anthropic",
      model: "claude-sonnet-test",
      text: "Hello from Claude. This is a fixture.",
      usage: { inputTokens: 16, outputTokens: 7, totalTokens: 23 },
      requestId: "msg_fixture_123",
      finishReason: "end_turn",
    });
  });

  it("normalizes system messages and generation settings", () => {
    const normalized = new AnthropicAdapter({ messages: { create: async () => createMessageFixture() } })
      .normalizeRequest({ ...createRequestFixture(), temperature: 0.2 });

    assert.deepEqual(normalized, {
      provider: "anthropic",
      model: "claude-sonnet-test",
      messages: [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Say hello." },
      ],
      maxOutputTokens: 128,
      temperature: 0.2,
    });
  });

  it("preserves the original provider error while exposing a normalized copy", async () => {
    const providerError = Object.assign(new Error("Anthropic rate limit"), {
      status: 429,
      code: "rate_limit_error",
    });
    const adapter = new AnthropicAdapter({
      messages: {
        create: async () => {
          throw providerError;
        },
      },
    });

    await assert.rejects(() => adapter.create(createRequestFixture()), (error: unknown) => error === providerError);
    assert.deepEqual(adapter.normalizeError(providerError), {
      provider: "anthropic",
      kind: "rate_limit",
      message: "Anthropic rate limit",
      retryable: true,
      statusCode: 429,
      providerCode: "rate_limit_error",
    });
  });
});
