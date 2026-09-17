# TBD — Implementation TODO

This file tracks remaining implementation work and features intentionally deferred from the first usable version. The current project decisions and reasoning remain in `Certiq-ai-project-status.md`.

## Phase 1 — Core workflow

- [ ] Decide the final product and package name.
- [x] Create the TypeScript package and CLI entry point.
- [ ] Add provider adapters for Anthropic Messages API and OpenAI Responses API.
- [ ] Support non-streaming text requests.
- [ ] Preserve the original provider response and error behavior.
- [ ] Define and validate the normalized request and response schema.
- [ ] Add the single model configuration file with versioned pricing.
- [x] Add environment configuration for database access and payload storage.

## Phase 1 — Provider integrations

- [x] Define the common provider adapter contract.
- [x] Implement Anthropic Messages adapter.

## Telemetry and storage

- [ ] Implement best-effort telemetry writes using Vercel background execution and direct Postgres writes.
- [ ] Implement the serverless database-write timeout.
- [ ] Expose `flush()` for local development, long-running applications, and tests where needed.
- [ ] Define dropped-telemetry logging.
- [ ] Add Postgres migrations for projects, requests, payloads, evaluations, and recommendations.
- [ ] Add TLS database-connection configuration.
- [ ] Verify that API keys never enter telemetry records.
- [ ] Document that Phase 1 payloads remain in the database permanently.

## Analysis and evaluation

- [ ] Implement `TBD analyze`.
- [ ] Implement deterministic sampling.
- [ ] Add sample-size and cost-budget limits.
- [ ] Implement candidate-model selection by tier and capability.
- [ ] Implement batch shadow evaluation.
- [ ] Track evaluation-run request IDs for idempotent retries.
- [ ] Add the response-evaluator interface.
- [ ] Create hand-labeled calibration examples.
- [ ] Verify an SBERT model, its license, and its Node/ONNX compatibility.
- [ ] Verify an ONNX judge model, its inputs, outputs, license, and runtime size.
- [ ] Calibrate the similarity and judge thresholds.
- [ ] Persist report-only recommendations.

## Phase 2 — Retention and cleanup

- [ ] Add `expires_at` and configurable raw-payload retention.
- [ ] Add a cleanup command or maintenance endpoint.
- [ ] Keep metadata, evaluation results, and recommendations after payload deletion.
- [ ] Protect payloads currently being analyzed from cleanup.
- [ ] Define behavior for telemetry that arrives after its payload expiration.
- [ ] Add retention warnings and manual deletion commands.
- [ ] Decide whether scheduled analysis is needed after the core workflow is proven.
- [ ] If scheduled analysis is added, make it opt-in with sample and cost limits.

## Dashboard and documentation

- [ ] Choose the local dashboard server library.
- [ ] Implement `TBD dashboard`.
- [ ] Bind the dashboard to localhost only.
- [ ] Add charts and filters for cost, latency, features, and recommendations.
- [x] Add README installation and usage instructions.
- [ ] Add privacy and data-retention documentation.
- [ ] Add architecture decision records.
- [ ] Add system-design and scaling documentation.

## Deferred features

- [ ] Streaming responses.
- [ ] Tool calls.
- [ ] Structured outputs.
- [ ] Multimodal requests.
- [ ] Automatic runtime model routing.
- [ ] Predictive routing trained or calibrated from evaluation history.
- [ ] Optional BERTopic experiment for automatic prompt categorization.
- [ ] Optional hosted demo with fabricated data.

## Explicitly not in the current implementation

- [ ] Durable telemetry queue or separate telemetry microservice.
- [ ] Automatic scheduled shadow analysis.


# Before lauch of 1st version
-> do it for streaming nd multimeadia messages too(find a way)
-> 
