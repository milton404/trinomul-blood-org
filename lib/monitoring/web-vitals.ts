import { ReportCallback, webVitals } from "next-vitals";
import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("web-vitals");

export function reportWebVitals(metric: {
  id: string;
  name: string;
  startTime: number;
  value: number;
  label: "web-vital" | "custom";
}): void {
  const body = {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    label: metric.label,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  logger.info(`Web Vitals: ${metric.name}`, body);

  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms`);
  }

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon(
      "/api/analytics/web-vitals",
      JSON.stringify(body),
    );
  }
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return;

  webVitals(reportWebVitals as ReportCallback);
}

export function getCLS(): number | null {
  return getMetricValue("CLS");
}

export function getFCP(): number | null {
  return getMetricValue("FCP");
}

export function getFID(): number | null {
  return getMetricValue("FID");
}

export function getLCP(): number | null {
  return getMetricValue("LCP");
}

export function getTTFB(): number | null {
  return getMetricValue("TTFB");
}

export function getINP(): number | null {
  return getMetricValue("INP");
}

const metrics: Map<string, number> = new Map();

function getMetricValue(name: string): number | null {
  return metrics.get(name) ?? null;
}

export function trackMetricValue(name: string, value: number): void {
  metrics.set(name, value);
}