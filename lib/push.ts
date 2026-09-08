// Server-only Web Push helpers (PWA notifications).
// Gracefully no-ops when VAPID keys are missing or web-push is unavailable.
import { isSupabaseAvailable } from "@/lib/supabase/client";
import {
  getAllPushSubscriptions,
  addPushSubscription,
  deletePushSubscription,
} from "@/lib/db";
import {
  getAllPushSubscriptionsPg,
  addPushSubscriptionPg,
  deletePushSubscriptionPg,
} from "@/lib/pg/queries";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionInput {
  userId?: number | null;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** True when VAPID public + private keys are configured. */
export function webPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Public VAPID key exposed to the browser for subscription. */
export function getPublicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
}

/** Send a push notification to every stored subscription. Best-effort. */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!webPushConfigured()) return;
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:contact@trinomul.org",
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
    const subs = isSupabaseAvailable()
      ? await getAllPushSubscriptionsPg()
      : getAllPushSubscriptions();
    if (!subs.length) return;
    const message = JSON.stringify(payload);
    await Promise.allSettled(
      subs.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: s.keys }, message)
          .catch((err: unknown) => {
            // 410/404 → subscription is gone; leave cleanup to the client.
            console.error("push send failed for", s.endpoint, err);
          }),
      ),
    );
  } catch (e) {
    console.error("sendPushToAll failed:", e);
  }
}

export async function savePushSubscription(
  sub: PushSubscriptionInput,
): Promise<void> {
  if (isSupabaseAvailable()) return addPushSubscriptionPg(sub);
  return addPushSubscription(sub);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  if (isSupabaseAvailable()) return deletePushSubscriptionPg(endpoint);
  return deletePushSubscription(endpoint);
}