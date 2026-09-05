import { headers } from "next/headers";

/**
 * Returns the current visitor's IP address and user-agent, read from
 * request headers inside a server action / route handler.
 *
 * IP resolution order: x-forwarded-for (first entry) → x-real-ip →
 * cf-connecting-ip (Cloudflare) → "unknown".
 *
 * User-agent falls back to "unknown" when the header is absent.
 */
export async function getVisitorFingerprint(): Promise<{
  ip: string;
  userAgent: string;
}> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    "unknown";
  const userAgent = h.get("user-agent")?.trim() || "unknown";
  return { ip, userAgent };
}

/**
 * Checks whether the current visitor is allowed to edit a guest blood
 * request. Returns true when the request is a guest post (requester_id
 * IS NULL) and either the IP or the user-agent matches the stored value.
 *
 * Matching on either signal (not both) keeps the flow tolerant of
 * mobile IP changes while still blocking unrelated visitors.
 */
export function matchesVisitor(
  storedIp: string | null | undefined,
  storedUa: string | null | undefined,
  currentIp: string,
  currentUa: string,
): boolean {
  if (!storedIp && !storedUa) return false;
  const ipMatch =
    !!storedIp &&
    storedIp !== "unknown" &&
    storedIp === currentIp;
  const uaMatch =
    !!storedUa &&
    storedUa !== "unknown" &&
    storedUa === currentUa;
  return ipMatch || uaMatch;
}