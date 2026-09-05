export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;

const isProduction = process.env.NODE_ENV === "production";

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({
      name: value.name,
      message: value.message,
      stack: isProduction ? undefined : value.stack,
    });
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

interface LogMeta {
  [key: string]: unknown;
  userId?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  path?: string;
  method?: string;
}

function formatLog(
  level: LogLevel,
  message: string,
  meta?: LogMeta,
): string {
  const entry = {
    timestamp: formatTimestamp(new Date()),
    level: LOG_LEVEL_NAMES[level],
    message,
    ...meta,
  };
  return JSON.stringify(entry);
}

function shouldLog(level: LogLevel): boolean {
  return level >= MIN_LEVEL;
}

function output(logLine: string, level: LogLevel): void {
  if (level >= LogLevel.ERROR) {
    console.error(logLine);
  } else if (level >= LogLevel.WARN) {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
}

export function logger(
  level: LogLevel,
  message: string,
  meta?: LogMeta,
): void {
  if (!shouldLog(level)) return;
  output(formatLog(level, message, meta), level);
}

export function debug(message: string, meta?: LogMeta): void {
  logger(LogLevel.DEBUG, message, meta);
}

export function info(message: string, meta?: LogMeta): void {
  logger(LogLevel.INFO, message, meta);
}

export function warn(message: string, meta?: LogMeta): void {
  logger(LogLevel.WARN, message, meta);
}

export function error(message: string, meta?: LogMeta): void {
  logger(LogLevel.ERROR, message, meta);
}

export function fatal(message: string, meta?: LogMeta): void {
  logger(LogLevel.FATAL, message, meta);
}

export function logError(
  error: Error,
  context?: string,
  meta?: LogMeta,
): void {
  logger(
    LogLevel.ERROR,
    context ? `${context}: ${error.message}` : error.message,
    {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: isProduction ? undefined : error.stack,
      },
    },
  );
}

export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  meta?: LogMeta,
): void {
  const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
  logger(level, `${method} ${path} ${statusCode}`, {
    method,
    path,
    statusCode,
    duration,
    ...meta,
  });
}

export function createLogger(context: string) {
  return {
    debug: (message: string, meta?: LogMeta) =>
      debug(`[${context}] ${message}`, meta),
    info: (message: string, meta?: LogMeta) =>
      info(`[${context}] ${message}`, meta),
    warn: (message: string, meta?: LogMeta) =>
      warn(`[${context}] ${message}`, meta),
    error: (message: string, meta?: LogMeta) =>
      error(`[${context}] ${message}`, meta),
    fatal: (message: string, meta?: LogMeta) =>
      fatal(`[${context}] ${message}`, meta),
    logError: (err: Error, meta?: LogMeta) =>
      logError(err, context, meta),
  };
}

export function withRequestLogging(
  handler: (req: Request, meta: LogMeta) => Promise<Response> | Response,
  name: string,
) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const meta: LogMeta = {
      path: url.pathname,
      method: req.method,
      requestId: crypto.randomUUID(),
    };

    info(`[${name}] ${req.method} ${url.pathname}`, meta);

    try {
      const response = await handler(req, meta);
      const duration = Date.now() - startTime;

      logRequest(req.method, url.pathname, response.status, duration, {
        ...meta,
        duration,
      });

      return response;
    } catch (err) {
      const duration = Date.now() - startTime;
      logError(
        err instanceof Error ? err : new Error(String(err)),
        name,
        {
          ...meta,
          duration,
        },
      );

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          requestId: meta.requestId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
}