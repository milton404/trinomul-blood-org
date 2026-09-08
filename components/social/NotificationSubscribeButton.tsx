"use client";

import { useTranslations, useLocale } from "next-intl";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { serverSavePushSubscription, serverDeletePushSubscription } from "@/lib/db-actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

type SubState = "loading" | "subscribed" | "unsubscribed" | "blocked" | "unsupported";

export default function NotificationSubscribeButton() {
  const t = useTranslations("social");
  const locale = useLocale();
  const [state, setState] = useState<SubState>("loading");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) {
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) {
          if (sub) setState("subscribed");
          else if (Notification.permission === "denied") setState("blocked");
          else setState("unsubscribed");
        }
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unsupported") return null;

  const subscribe = async () => {
    if (state === "blocked") return;
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "unsubscribed");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      const endpoint = json.endpoint;
      if (!p256dh || !auth || !endpoint) {
        setState("unsubscribed");
        return;
      }
      await serverSavePushSubscription({
        endpoint,
        p256dh,
        auth,
      });
      setState("subscribed");
    } catch (e) {
      console.error("push subscribe failed", e);
      setState("unsubscribed");
    }
  };

  const unsubscribe = async () => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await serverDeletePushSubscription(endpoint);
      }
      setState("unsubscribed");
    } catch (e) {
      console.error("push unsubscribe failed", e);
      setState("subscribed");
    }
  };

  const subscribed = state === "subscribed";
  const label =
    state === "loading"
      ? ""
      : subscribed
        ? t("notificationsOn")
        : state === "blocked"
          ? t("notificationsBlocked")
          : t("enableNotifications");

  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={state === "loading" || state === "blocked"}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
      ) : subscribed ? (
        <Bell className="h-3.5 w-3.5 text-red-600" />
      ) : (
        <BellOff className="h-3.5 w-3.5 text-slate-500" />
      )}
      <span className={subscribed ? "text-red-600" : "text-slate-600"}>
        {locale === "bn" && state === "loading" ? "…" : label}
      </span>
    </button>
  );
}