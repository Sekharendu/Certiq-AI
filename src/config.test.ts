import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConfigurationError, loadConfig } from "./config.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * description: Creates the minimum valid environment used by configuration tests.
 * return: Environment variables containing a database URL and provider key.
 */
function validEnvironment(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: "postgresql://user:password@localhost:5432/certiq",
    OPENAI_API_KEY: "test-openai-key",
  };
}

describe("loadConfig", () => {
  it("loads required values and applies safe defaults", () => {
    const config = loadConfig({ env: validEnvironment(), dotenvPath: "missing.env" });

    assert.equal(config.databaseUrl, "postgresql://user:password@localhost:5432/certiq");
    assert.equal(config.databaseSsl, true);
    assert.equal(config.databasePoolMax, 10);
    assert.equal(config.payloadStorage, "database");
    assert.equal(config.payloadRetention, "permanent");
    assert.equal(config.telemetryTimeoutMs, 1000);
    assert.deepEqual(config.providerKeys, { openai: "test-openai-key" });
  });

  it("loads .env values while allowing process values to override them", () => {
    const directory = mkdtempSync(join(tmpdir(), "certiq-config-"));
    temporaryDirectories.push(directory);
    const dotenvPath = join(directory, ".env");
    writeFileSync(dotenvPath, "DATABASE_URL=postgres://dotenv/db\nOPENAI_API_KEY=dotenv-key\n");

    const config = loadConfig({
      dotenvPath,
      env: { ...validEnvironment(), DATABASE_URL: "postgres://environment/db" },
    });

    assert.equal(config.databaseUrl, "postgres://environment/db");
    assert.equal(config.providerKeys.openai, "test-openai-key");
  });

  it("reports all missing and invalid settings without exposing secrets", () => {
    assert.throws(
      () => loadConfig({ env: { DATABASE_URL: "not-a-url" }, dotenvPath: "missing.env" }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigurationError);
        assert.match(error.message, /DATABASE_URL must be a valid Postgres connection URL/);
        assert.match(error.message, /At least one provider API key is required/);
        assert.doesNotMatch(error.message, /secret|password|token/i);
        return true;
      },
    );
  });

  it("requires a TTL when payload retention is configured for TTL", () => {
    assert.throws(
      () => loadConfig({ env: { ...validEnvironment(), PAYLOAD_RETENTION: "ttl" }, dotenvPath: "missing.env" }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigurationError);
        assert.match(error.message, /PAYLOAD_TTL_DAYS is required/);
        return true;
      },
    );
  });
});
