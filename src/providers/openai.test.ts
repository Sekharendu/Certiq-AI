import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Response } from "openai/resources/responses/responses";
import { OpenAIAdapter, type OpenAITextRequest } from "./openai.js";

/**
 * description: Creates a typed OpenAI response fixture for adapter tests.
 * return: A representative non-streaming OpenAI Response object.
 */
function createResponseFixture(): Response {
  return {
    id: "resp_fixture_123",
    created_at: 1760000000,
    error: null,
    incomplete_details: null,
    instructions: "Be concise.",
    metadata: null,
    model: "gpt-test",
    object: "response",
    output: [],
    output_text: "Hello from GPT.",
    parallel_tool_calls: false,
    temperature: 0.2,
    tool_choice: "auto",
    tools: [],
    top_p: 1,
    usage: {
      input_tokens: 12,
      input_tokens_details: { cache_write_tokens: 0, cached_tokens: 2 },
      output_tokens: 8,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 20,
    },
    status: "completed",
    max_output_tokens: null,
    previous_response_id: null,
    truncation: "disabled",
    store: true,
    service_tier: "default",
    background: false,
    completed_at: 1760000001,
    conversation: null,
    prompt: null,
    prompt_cache_key: null,
    prompt_cache_retention: null,
    reasoning: { effort: null, generate_summary: null, summary: null },
    safety_identifier: null,
    text: { format: { type: "text" }, verbosity: "medium" },
  } as Response;
}

/**
 * description: Creates the minimum valid OpenAI request used by adapter tests.
 * return: A non-streaming text request fixture.
 */
function createRequestFixture(): OpenAITextRequest {
  return {
    model: "gpt-test",
    input: "Say hello.",
    instructions: "Be concise.",
    max_output_tokens: 128,
  };
}

describe("OpenAIAdapter", () => {
  it("returns the original response and forces non-streaming mode", async () => {
    const response = createResponseFixture();
    let receivedRequest: unknown;
    const adapter = new OpenAIAdapter({
      responses: {
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

  it("normalizes output text, model identity, status, and usage", () => {
    const normalized = new OpenAIAdapter({ responses: { create: async () => createResponseFixture() } })
      .normalizeResponse(createResponseFixture());

    assert.deepEqual(normalized, {
      provider: "openai",
      model: "gpt-test",
      text: "Hello from GPT.",
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 },
      requestId: "resp_fixture_123",
      finishReason: "completed",
    });
  });

  it("normalizes instructions, text input, and generation settings", () => {
    const normalized = new OpenAIAdapter({ responses: { create: async () => createResponseFixture() } })
      .normalizeRequest(createRequestFixture());

    assert.deepEqual(normalized, {
      provider: "openai",
      model: "gpt-test",
      messages: [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Say hello." },
      ],
      maxOutputTokens: 128,
    });
  });

  it("preserves the original provider error while exposing a normalized copy", async () => {
    const providerError = Object.assign(new Error("OpenAI rate limit"), {
      status: 429,
      code: "rate_limit_exceeded",
    });
    const adapter = new OpenAIAdapter({
      responses: {
        create: async () => {
          throw providerError;
        },
      },
    });

    await assert.rejects(() => adapter.create(createRequestFixture()), (error: unknown) => error === providerError);
    assert.deepEqual(adapter.normalizeError(providerError), {
      provider: "openai",
      kind: "rate_limit",
      message: "OpenAI rate limit",
      retryable: true,
      statusCode: 429,
      providerCode: "rate_limit_exceeded",
    });
  });
});
