import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { createLogger } from "@/lib/logging/logger";
import { validateOrigin } from "@/lib/security/csrf";
import { isRedisConnected, checkRedisRateLimit } from "@/lib/redis";

const logger = createLogger("validation");

export function validateBody<T>(
  body: unknown,
  schema: ZodSchema<T>,
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return { success: false, errors };
    }
    return { success: false, errors: ["Validation failed"] };
  }
}

export function withValidation<T>(
  handler: (req: NextRequest, data: T) => Promise<NextResponse> | NextResponse,
  schema: ZodSchema<T>,
  options: {
      allowAnonymous?: boolean;
      validateOrigin?: boolean;
    } = {},
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (options.validateOrigin && !validateOrigin(req)) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 },
      );
    }

    try {
      const body = await req.json();
      const result = validateBody(body, schema);

      if (!result.success) {
        logger.warn("Validation failed", { errors: result.errors });
        return NextResponse.json(
          {
            error: "Validation failed",
            details: result.errors,
          },
          { status: 400 },
        );
      }

      return handler(req, result.data);
    } catch (err) {
      if (err instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 },
        );
      }

      throw err;
    }
  };
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000,
): (req: NextRequest) => Promise<NextResponse> {
  if (isRedisConnected()) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

      const url = new URL(req.url);
      const identifier = `${url.pathname}:${ip}`;

      const result = await checkRedisRateLimit(identifier, {
        maxAttempts,
        windowMs,
      });

      if (!result.allowed) {
        logger.warn("Rate limit exceeded", {
          identifier,
          retryAfterMs: result.retryAfterMs,
        });

        return NextResponse.json(
          {
            error: "Rate limit exceeded. Try again later.",
            retryAfter: Math.ceil((result.retryAfterMs || 0) / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((result.retryAfterMs || 0) / 1000)),
              "X-RateLimit-Limit": String(maxAttempts),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(result.resetTime),
            },
          },
        );
      }

      return handler(req);
    };
  }

  const ipHits = new Map<string, number[]>();

  return (req: NextRequest): Promise<NextResponse> => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const hits = (ipHits.get(ip) || []).filter(
      (ts) => now - ts < windowMs,
    );

    if (hits.length >= maxAttempts) {
      logger.warn("Rate limit exceeded", { ip });
      return Promise.resolve(
        NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          { status: 429 },
        ),
      );
    }

    hits.push(now);
    ipHits.set(ip, hits);

    return Promise.resolve(handler(req));
  };
}

export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  operationName: string,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(req.url);

    try {
      const response = await handler(req);
      logger.info(`${operationName} completed`, {
        method: req.method,
        path: url.pathname,
        status: response.status,
        duration: Date.now() - startTime,
      });
      return response;
    } catch (err) {
      logger.logError(
        err instanceof Error ? err : new Error(String(err)),

        {
          method: req.method,
          path: url.pathname,
          duration: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        {
          error: "Internal server error",
          message: process.env.NODE_ENV === "production" ? "Something went wrong" : err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      );
    }
  };
}

export function validateSearchParams(
  params: URLSearchParams,
  schema: ZodSchema<Record<string, string>>,
): { success: true; data: Record<string, string> } | { success: false; errors: string[] } {
  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    data[key] = value;
  });

  try {
    schema.parse(data);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return { success: false, errors };
    }
    return { success: false, errors: ["Validation failed"] };
  }
}