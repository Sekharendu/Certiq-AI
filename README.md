# Certiq AI

Certiq AI is a local-first TypeScript toolkit for tracking AI request cost and evaluating whether a cheaper model could handle a feature's workload.

## Current Status

The repository currently contains the Phase 1 foundation:

- TypeScript package and CLI entry point
- `analyze` and `dashboard` placeholder commands
- Validated configuration loading from process environment variables and `.env`
- Common provider adapter contract for normalized requests, responses, usage, and errors
- Anthropic Messages adapter for non-streaming text requests
- pnpm-based build, type-check, and test commands

OpenAI and Gemini adapters, telemetry persistence, analysis, and the dashboard are planned Phase 1 work. They are not available in the current build yet.

## Phase 1 Scope

Phase 1 will support:

- Non-streaming text requests through Anthropic Messages, OpenAI Responses, and Gemini APIs
- A feature-labeled client wrapper that preserves the provider's normal response behavior
- Best-effort telemetry written to the developer's Postgres database
- Permanent raw prompt and response storage while the core workflow is developed
- Manual `analyze` runs that sample stored requests and perform batch shadow evaluation
- Report-only model recommendations; production routing is never changed automatically
- A temporary localhost dashboard over the same report data

The production model response is always the primary operation. Telemetry failure must never fail or delay that response indefinitely.

## Phase 1 Constraints

- Data stays in the developer's own database; Certiq AI does not provide hosted data storage.
- The database connection and provider keys are supplied through environment configuration.
- API keys must never be written to telemetry records.
- Phase 1 payloads remain in Postgres permanently unless the developer deletes them manually.
- Analysis is manual. Scheduled analysis is not part of the current implementation.
- Shadow evaluation creates additional provider cost and is subject to sample-size and budget limits.
- Recommendations are informational and require sufficient eligible examples and calibrated evaluator thresholds.
- The initial dashboard binds to localhost only.

## Deferred Features

The following are intentionally outside the current Phase 1 scope:

- Configurable payload expiration and cleanup
- Scheduled analysis
- Streaming responses
- Tool calls
- Structured outputs
- Multimodal requests
- Automatic runtime model routing
- Predictive routing trained from evaluation history
- BERTopic prompt categorization
- A hosted demo

## Configuration

Copy `.env.example` to `.env` and provide a Postgres URL plus at least one provider API key. `.env` is ignored by Git and must never be committed.

```bash
cp .env.example .env
pnpm install
pnpm run check
pnpm test
pnpm run build
```

The configuration loader validates required values before they are used. Invalid or missing settings produce an error that names the configuration fields without printing secret values.

## CLI

The package exposes the `certiq-ai` command. The commands are placeholders until their implementation tickets are completed:

```bash
pnpm run dev -- analyze
pnpm run dev -- dashboard
```

After building, use `pnpm start -- analyze` or `pnpm start -- dashboard`.

See [`Certiq-ai-project-status.md`](./Certiq-ai-project-status.md) for the complete architecture, storage model, evaluation plan, and Phase 2 decisions.
