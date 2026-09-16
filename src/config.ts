import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const providerNames = ["anthropic", "openai", "gemini"] as const;

/**
 * description: Identifies the providers supported by the Phase 1 configuration.
 * return: A readonly list of provider identifiers.
 */
type ProviderName = (typeof providerNames)[number];

/**
 * description: Represents validated runtime configuration for Certiq AI.
 * return: A complete application configuration value.
 */
export interface AppConfig {
  databaseUrl: string;
  databaseSsl: boolean;
  databasePoolMax: number;
  providerKeys: Partial<Record<ProviderName, string>>;
  payloadStorage: "database";
  payloadRetention: "permanent" | "ttl";
  payloadTtlDays?: number;
  runtimeEnvironment: "development" | "test" | "production";
  telemetryTimeoutMs: number;
}

/**
 * description: Controls environment sources used by the configuration loader.
 * return: Optional environment variables and dotenv file path.
 */
export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
  dotenvPath?: string;
}

/**
 * description: Reports one or more configuration validation failures without exposing secret values.
 * arg1: issues - Validation messages safe to display to the user.
 * return: A configuration error instance.
 */
export class ConfigurationError extends Error {
  readonly issues: readonly string[];

  /**
   * description: Creates a configuration error containing all validation issues.
   * arg1: issues - Validation messages safe to display to the user.
   * return: A configured ConfigurationError instance.
   */
  constructor(issues: string[]) {
    super(`Invalid Certiq AI configuration:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "ConfigurationError";
    this.issues = issues;
  }
}

/**
 * description: Reads simple KEY=VALUE entries from a dotenv file.
 * arg1: path - Filesystem path to the dotenv file.
 * return: Parsed environment values, or an empty object when the file is unavailable.
 */
function readDotenv(path: string): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (!key || rawValue === undefined) continue;
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

/**
 * description: Reads a required configuration value and records a missing-value issue.
 * arg1: values - Merged configuration values.
 * arg2: key - Required environment variable name.
 * arg3: issues - Mutable validation issue list.
 * return: The trimmed value, or an empty string when missing.
 */
function readRequired(values: Record<string, string>, key: string, issues: string[]): string {
  const value = values[key]?.trim();
  if (!value) issues.push(`${key} is required.`);
  return value ?? "";
}

/**
 * description: Reads and validates a boolean configuration value.
 * arg1: values - Merged configuration values.
 * arg2: key - Environment variable name.
 * arg3: fallback - Value used when the variable is absent or invalid.
 * arg4: issues - Mutable validation issue list.
 * return: The parsed boolean or fallback value.
 */
function readBoolean(
  values: Record<string, string>,
  key: string,
  fallback: boolean,
  issues: string[],
): boolean {
  const value = values[key]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  issues.push(`${key} must be true or false.`);
  return fallback;
}

/**
 * description: Reads and validates an integer configuration value within a range.
 * arg1: values - Merged configuration values.
 * arg2: key - Environment variable name.
 * arg3: fallback - Value used when the variable is absent or invalid.
 * arg4: range - Inclusive minimum and maximum values.
 * arg5: issues - Mutable validation issue list.
 * return: The parsed integer or fallback value.
 */
function readInteger(
  values: Record<string, string>,
  key: string,
  fallback: number,
  range: { min: number; max: number },
  issues: string[],
): number {
  const rawValue = values[key]?.trim();
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    issues.push(`${key} must be an integer from ${range.min} to ${range.max}.`);
    return fallback;
  }
  return value;
}

/**
 * description: Reads a configuration value constrained to an allowed set of strings.
 * arg1: values - Merged configuration values.
 * arg2: key - Environment variable name.
 * arg3: fallback - Value used when the variable is absent or invalid.
 * arg4: choices - Allowed configuration values.
 * arg5: issues - Mutable validation issue list.
 * return: The selected allowed value or fallback value.
 */
function readChoice<T extends string>(
  values: Record<string, string>,
  key: string,
  fallback: T,
  choices: readonly T[],
  issues: string[],
): T {
  const value = values[key]?.trim() as T | undefined;
  if (!value) return fallback;
  if (!choices.includes(value)) {
    issues.push(`${key} must be one of: ${choices.join(", ")}.`);
    return fallback;
  }
  return value;
}

/**
 * description: Validates that a database URL uses a supported Postgres scheme.
 * arg1: value - Database connection URL.
 * arg2: issues - Mutable validation issue list.
 * return: Nothing; validation failures are appended to issues.
 */
function validateDatabaseUrl(value: string, issues: string[]): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      issues.push("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
    }
  } catch {
    issues.push("DATABASE_URL must be a valid Postgres connection URL.");
  }
}

/**
 * description: Loads, merges, and validates Certiq AI application configuration.
 * arg1: options - Optional environment source overrides and dotenv path.
 * return: Validated application configuration.
 */
export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const dotenvValues = readDotenv(resolve(options.dotenvPath ?? ".env"));
  const values = { ...dotenvValues };
  for (const [key, value] of Object.entries(options.env ?? process.env)) {
    if (value !== undefined) values[key] = value;
  }

  const issues: string[] = [];
  const databaseUrl = readRequired(values, "DATABASE_URL", issues);
  if (databaseUrl) validateDatabaseUrl(databaseUrl, issues);

  const providerKeys: Partial<Record<ProviderName, string>> = {};
  for (const provider of providerNames) {
    const value = values[`${provider.toUpperCase()}_API_KEY`]?.trim();
    if (value) providerKeys[provider] = value;
  }
  if (Object.keys(providerKeys).length === 0) {
    issues.push("At least one provider API key is required: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.");
  }

  const payloadRetention = readChoice(values, "PAYLOAD_RETENTION", "permanent", ["permanent", "ttl"], issues);
  const payloadTtlDays = readInteger(values, "PAYLOAD_TTL_DAYS", 0, { min: 1, max: 3650 }, issues);
  if (payloadRetention === "ttl" && !values.PAYLOAD_TTL_DAYS?.trim()) {
    issues.push("PAYLOAD_TTL_DAYS is required when PAYLOAD_RETENTION=ttl.");
  }

  const config: AppConfig = {
    databaseUrl,
    databaseSsl: readBoolean(values, "DATABASE_SSL", true, issues),
    databasePoolMax: readInteger(values, "DATABASE_POOL_MAX", 10, { min: 1, max: 100 }, issues),
    providerKeys,
    payloadStorage: readChoice(values, "PAYLOAD_STORAGE", "database", ["database"], issues),
    payloadRetention,
    ...(payloadRetention === "ttl" ? { payloadTtlDays } : {}),
    runtimeEnvironment: readChoice(
      values,
      "RUNTIME_ENVIRONMENT",
      "development",
      ["development", "test", "production"],
      issues,
    ),
    telemetryTimeoutMs: readInteger(values, "TELEMETRY_TIMEOUT_MS", 1000, { min: 1, max: 60000 }, issues),
  };

  if (issues.length > 0) throw new ConfigurationError(issues);
  return config;
}
