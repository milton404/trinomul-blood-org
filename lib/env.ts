import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("env");

interface RequiredEnvVar {
  name: string;
  required: boolean;
  pattern?: RegExp;
}

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  { name: "AUTH_SECRET", required: true },
  { name: "NEXT_PUBLIC_SITE_URL", required: false },
];

const OPTIONAL_AI_VARS: RequiredEnvVar[] = [
  { name: "DEEPSEEK_API_KEY", required: false },
  { name: "ZHIPU_API_KEY", required: false },
];

const OPTIONAL_CLOUDINARY_VARS: RequiredEnvVar[] = [
  { name: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", required: false },
  { name: "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET", required: false },
  { name: "CLOUDINARY_API_KEY", required: false },
  { name: "CLOUDINARY_API_SECRET", required: false },
];

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const variable of REQUIRED_ENV_VARS) {
    const value = process.env[variable.name];

    if (variable.required && (!value || value.trim() === "")) {
      missing.push(variable.name);
      logger.error(`Missing required environment variable: ${variable.name}`);
    } else if (value && variable.pattern && !variable.pattern.test(value)) {
      warnings.push(
        `Environment variable ${variable.name} has invalid format`,
      );
      logger.warn(`Invalid format for environment variable: ${variable.name}`);
    } else if (value) {
      logger.info(`Environment variable ${variable.name} is set`);
    }
  }

  const aiKeysPresent = OPTIONAL_AI_VARS.some(
    (v) => process.env[v.name] && process.env[v.name]?.trim() !== "",
  );

  if (!aiKeysPresent) {
    warnings.push(
      "AI API keys not configured. AI features will use rule-based fallback.",
    );
    logger.warn("AI API keys not configured - using rule-based fallback");
  }

  const cloudinaryKeysPresent =
    OPTIONAL_CLOUDINARY_VARS.filter((v) => v.name.startsWith("NEXT_PUBLIC_"))
      .every((v) => process.env[v.name] && process.env[v.name]?.trim() !== "");

  if (!cloudinaryKeysPresent) {
    warnings.push(
      "Cloudinary not fully configured. Photo uploads will be disabled.",
    );
    logger.warn("Cloudinary not fully configured - photo uploads disabled");
  }

  if (process.env.NODE_ENV === "production") {
    const devVars = ["DISABLE_HMR", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
    const inProduction = devVars.filter((v) => process.env[v]);

    if (inProduction.length > 0) {
      warnings.push(
        `Development-only variables detected in production: ${inProduction.join(", ")}`,
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      warnings.push(
        "NEXT_PUBLIC_SITE_URL not set in production. SEO and sitemaps may not work correctly.",
      );
    }
  }

  const valid = missing.length === 0;

  if (!valid) {
    logger.fatal(
      "Environment validation failed - missing required variables",
      { missing },
    );
  } else {
    logger.info("Environment validation passed", {
      warnings: warnings.length,
    });
  }

  return {
    valid,
    missing,
    warnings,
  };
}

export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    throw new Error(
      `Missing required environment variables: ${result.missing.join(", ")}`,
    );
  }

  if (result.warnings.length > 0) {
    logger.warn("Environment validation warnings", {
      warnings: result.warnings,
    });
  }
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  return value;
}

export function getOptionalEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] || defaultValue;
}