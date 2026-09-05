import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const isBrowser = typeof window !== "undefined";

export function initSentry(): void {
  if (!isProduction) {
    return;
  }

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: isProduction ? "production" : "development",
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      if (event.request) {
        delete event.request.headers;
      }
      return event;
    },
  });
}

export function captureException(
  error: Error,
  context?: {
    userId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): void {
  if (!isProduction) {
    console.error("[Sentry]", error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error);
  });
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>,
): void {
  if (!isProduction) {
    console.log(`[Sentry ${level}]`, message);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureMessage(message, level);
  });
}

export function captureError(
  error: Error,
  context?: string,
  extra?: Record<string, unknown>,
): void {
  captureException(error, {
    tags: context ? { context } : undefined,
    extra,
  });
}

export function logBreadcrumb(
  message: string,
  category: "ui" | "network" | "navigation" = "ui",
  level: "info" | "warning" | "error" = "info",
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}

export function setSentryUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

export type { Sentry };