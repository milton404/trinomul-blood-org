"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { X, ScanLine, Camera, CameraOff, Loader2, RefreshCw, ExternalLink, Image as ImageIcon } from "lucide-react";

export default function QrScannerModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("common");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageScanning, setImageScanning] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"starting" | "scanning" | "error" | "done">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [decoded, setDecoded] = useState<string | null>(null);
  const isBn = useLocaleIsBn();
  // Guards against re-scanning after a code has already been decoded,
  // which previously kept scanning behind the result screen.
  const handledRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      try {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((tr) => tr.stop());
      } catch {}
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecoded = useCallback(
    (text: string) => {
      // Only accept the first successful decode; the live scan loop can
      // keep firing callbacks (or pick up another QR) after we are done.
      if (handledRef.current) return;
      handledRef.current = true;

      const trimmed = text.trim();
      setDecoded(trimmed);
      setStatus("done");
      stopCamera();

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      let path: string | null = null;

      try {
        const url = new URL(trimmed);
        if (origin && url.origin === origin) {
          path = url.pathname + url.search;
        } else if (origin) {
          path = null;
        }
      } catch {
        path = null;
      }

      if (path) {
        const trackMatch = path.match(/\/track\/([^/?#]+)/);
        if (trackMatch) {
          router.push(`/track/${decodeURIComponent(trackMatch[1])}`);
          onClose();
          return;
        }
        const reqMatch = path.match(/\/requests(?:\?req=([^&#]+))?/);
        if (reqMatch) {
          if (reqMatch[1]) {
            router.push(`/requests?req=${reqMatch[1]}`);
          } else {
            router.push(`/requests`);
          }
          onClose();
          return;
        }
      }

      if (/^REQ-[A-Z0-9]{4,}$/i.test(trimmed)) {
        router.push(`/track/${trimmed}`);
        onClose();
        return;
      }
    },
    [router, onClose, stopCamera],
  );

  const startCamera = useCallback(
    async (deviceId?: string) => {
      handledRef.current = false;
      setStatus("starting");
      setErrorMsg("");
      stopCamera();

      const video = videoRef.current;
      if (!video) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: "environment" } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();

        const track = stream.getVideoTracks()[0];
        const usedId = track?.getSettings().deviceId;
        if (usedId) setActiveDeviceId(usedId);

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { DecodeHintType } = await import("@zxing/library");
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, ["QR_CODE"]);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1500,
        });

        const controls = await reader.decodeFromStream(stream, video, (result, err) => {
          if (result) {
            handleDecoded(result.getText());
          }
        });
        controlsRef.current = controls;
        setStatus("scanning");
      } catch (err) {
        setStatus("error");
        const msg = err instanceof Error ? err.message : String(err);
        if (/Permission|NotAllowed|denied/i.test(msg)) {
          setErrorMsg(isBn ? "ক্যামেরা অনুমতি প্রয়োজন। ব্রাউজার সেটিংসে অনুমতি দিন।" : "Camera permission required. Please allow it in browser settings.");
        } else if (/NotFound|NotReadable|Overconstrained/i.test(msg)) {
          setErrorMsg(isBn ? "কোনো ক্যামেরা পাওয়া যায়নি।" : "No camera found on this device.");
        } else {
          setErrorMsg(msg);
        }
      }
    },
    [stopCamera, handleDecoded, isBn],
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === "videoinput"));
      } catch {}
    })();
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopCamera, onClose]);

  const scanFromGallery = async (file: File) => {
    try {
      setImageScanning(true);
      setGalleryError("");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        handleDecoded(result.getText());
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setGalleryError(
        isBn
          ? "এই ছবিতে কোনো QR কোড পাওয়া যায়নি। অন্য ছবি চেষ্টা করুন।"
          : "No QR code found in this image. Try another photo.",
      );
    } finally {
      setImageScanning(false);
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const next = devices.find((d) => d.deviceId !== activeDeviceId);
    startCamera(next?.deviceId);
  };

  const isExternalUrl = (() => {
    if (!decoded) return false;
    try { new URL(decoded); return true; } catch { return false; }
  })();

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-red-600" />
            {isBn ? "QR স্ক্যান" : "Scan QR"}
          </h3>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {status !== "done" && (
          <>
            <div className="relative w-64 h-64 rounded-xl overflow-hidden bg-slate-900 mb-4">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {status === "scanning" && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-8 inset-y-8 border-2 border-white/70 rounded-lg" />
                  <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                </div>
              )}
              {status === "starting" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <CameraOff className="w-10 h-10 text-white/60 mb-2" />
                  <p className="text-xs text-white/80">{errorMsg}</p>
                </div>
              )}
            </div>

            {status === "scanning" && (
              <p className="text-xs text-slate-500 text-center mb-3">
                {isBn ? "QR কোডে ক্যামেরা ধরে রাখুন" : "Point your camera at a QR code"}
              </p>
            )}

            {status === "error" && (
              <button
                onClick={() => startCamera()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors mb-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isBn ? "আবার চেষ্টা করুন" : "Try Again"}
              </button>
            )}

            {devices.length > 1 && status === "scanning" && (
              <button
                onClick={switchCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {isBn ? "ক্যামেরা পরিবর্তন" : "Switch Camera"}
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={imageScanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                {imageScanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                {isBn ? "ছবি থেকে স্ক্যান করুন" : "Scan from Gallery"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) scanFromGallery(f);
                  e.target.value = "";
                }}
              />
            </div>
            {galleryError && (
              <p className="text-xs text-red-500 text-center mt-2">{galleryError}</p>
            )}
          </>
        )}

        {status === "done" && decoded && (
          <div className="w-full text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {isBn ? "QR কোড স্ক্যান হয়েছে" : "QR code scanned"}
            </p>
            <p className="text-xs text-slate-500 font-mono break-all mb-4 max-w-full">
              {decoded}
            </p>
            {isExternalUrl && (
              <a
                href={decoded}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isBn ? "লিংক খুলুন" : "Open Link"}
              </a>
            )}
            <button
              onClick={() => { setDecoded(null); setStatus("starting"); startCamera(activeDeviceId); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isBn ? "আবার স্ক্যান" : "Scan Again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function useLocaleIsBn() {
  const [bn, setBn] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkLocale = () => setBn(window.location.pathname.startsWith("/bn"));
      checkLocale();
      window.addEventListener("popstate", checkLocale);
      return () => window.removeEventListener("popstate", checkLocale);
    }
  }, []);
  return bn;
}