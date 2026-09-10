"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ScanLine,
  Camera,
  CameraOff,
  Loader2,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Search,
  Droplet,
  Building2,
  MapPin,
  Calendar,
  User,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import {
  serverGetRequestByQrContent,
  serverRecordDonationByScan,
  serverSearchReferrerCandidates,
  type ScannedRequestInfo,
} from "@/lib/db-actions";

type Phase = "scan" | "looking-up" | "confirm" | "recording" | "success" | "error";
type ScanMode = "camera" | "upload";

export default function DonorQrScanner({ onClose, onRecorded }: { onClose: () => void; onRecorded?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);
  const [cameraStatus, setCameraStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [phase, setPhase] = useState<Phase>("scan");
  const [request, setRequest] = useState<ScannedRequestInfo | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [units, setUnits] = useState(1);
  const [fulfilledNow, setFulfilledNow] = useState(false);

  // Referrer state
  const [referrerQuery, setReferrerQuery] = useState("");
  const [referrerResults, setReferrerResults] = useState<any[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null);
  const [searchingReferrers, setSearchingReferrers] = useState(false);
  const [referrerMode, setReferrerMode] = useState<"search" | "manual">("search");
  const [manualReferrerName, setManualReferrerName] = useState("");
  const [manualReferrerPhone, setManualReferrerPhone] = useState("");

  const isBn = useLocaleIsBn();

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

  const handleScanned = useCallback(
    async (text: string) => {
      stopCamera();
      setPhase("looking-up");
      try {
        const { request: req, error } = await serverGetRequestByQrContent(text);
        if (error || !req) {
          setRecordingError(error || "Request not found");
          setPhase("error");
          return;
        }
        if (req.status === "fulfilled") {
          setRecordingError(isBn ? "এই অনুরোধটি ইতিমধ্যে পূরণ হয়ে গেছে" : "This request is already fulfilled");
          setPhase("error");
          return;
        }
        if (req.status === "expired" || req.status === "cancelled") {
          setRecordingError(isBn ? `এই অনুরোধটি ${req.status === "expired" ? "মেয়াদোত্তীর্ণ" : "বাতিল"} হয়েছে` : `This request is ${req.status}`);
          setPhase("error");
          return;
        }
        setRequest(req);
        setPhase("confirm");
      } catch {
        setRecordingError(isBn ? "অনুরোধ খুঁজে পাওয়া যায়নি" : "Failed to look up request");
        setPhase("error");
      }
    },
    [stopCamera, isBn],
  );

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setCameraStatus("starting");
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

        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result) {
            handleScanned(result.getText());
          }
        });
        controlsRef.current = controls;
        setCameraStatus("scanning");
      } catch (err) {
        setCameraStatus("error");
        const msg = err instanceof Error ? err.message : String(err);
        if (/Permission|NotAllowed|denied/i.test(msg)) {
          setErrorMsg(isBn ? "ক্যামেরা অনুমতি প্রয়োজন।" : "Camera permission required.");
        } else if (/NotFound|NotReadable|Overconstrained/i.test(msg)) {
          setErrorMsg(isBn ? "কোনো ক্যামেরা পাওয়া যায়নি।" : "No camera found.");
        } else {
          setErrorMsg(msg);
        }
      }
    },
    [stopCamera, handleScanned, isBn],
  );

  useEffect(() => {
    if (scanMode === "camera" && phase === "scan") {
      (async () => {
        try {
          const list = await navigator.mediaDevices.enumerateDevices();
          setDevices(list.filter((d) => d.kind === "videoinput"));
        } catch {}
      })();
      startCamera();
    }
    return () => stopCamera();
  }, [startCamera, stopCamera, scanMode, phase]);

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

  const switchCamera = () => {
    if (devices.length < 2) return;
    const next = devices.find((d) => d.deviceId !== activeDeviceId);
    startCamera(next?.deviceId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("looking-up");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { DecodeHintType } = await import("@zxing/library");
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ["QR_CODE"]);
      const reader = new BrowserMultiFormatReader(hints);
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        await handleScanned(result.getText());
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setRecordingError(isBn ? "ছবি থেকে QR কোড পড়া যায়নি। আবার চেষ্টা করুন।" : "Could not read QR from image. Try again.");
      setPhase("error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReferrerSearch = async (val: string) => {
    setReferrerQuery(val);
    if (val.trim().length < 2) {
      setReferrerResults([]);
      return;
    }
    setSearchingReferrers(true);
    try {
      const results = await serverSearchReferrerCandidates(val, 6);
      setReferrerResults(results);
    } catch {
      setReferrerResults([]);
    }
    setSearchingReferrers(false);
  };

  const handleConfirm = async () => {
    if (!request) return;
    setPhase("recording");
    try {
      const result = await serverRecordDonationByScan({
        requestId: request.requestId,
        units,
        referrerProfileId: selectedReferrer?.id ?? null,
        referrerName: referrerMode === "manual" ? manualReferrerName.trim() || null : selectedReferrer?.full_name_en ?? selectedReferrer?.full_name_bn ?? null,
        referrerPhone: referrerMode === "manual" ? manualReferrerPhone.trim() || null : selectedReferrer?.phone ?? null,
      });
      if (result.success) {
        setFulfilledNow(!!result.fulfilled);
        setPhase("success");
        onRecorded?.();
      } else {
        setRecordingError(result.error || "Failed to record donation");
        setPhase("error");
      }
    } catch {
      setRecordingError(isBn ? "ডোনেশন রেকর্ড করতে ব্যর্থ" : "Failed to record donation");
      setPhase("error");
    }
  };

  const resetToScan = () => {
    setPhase("scan");
    setRequest(null);
    setRecordingError("");
    setUnits(1);
    setFulfilledNow(false);
    setReferrerQuery("");
    setReferrerResults([]);
    setSelectedReferrer(null);
    setReferrerMode("search");
    setManualReferrerName("");
    setManualReferrerPhone("");
    if (scanMode === "camera") startCamera(activeDeviceId);
  };

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
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-600" />
            {isBn ? "অনুরোধ QR স্ক্যান" : "Scan Request QR"}
          </h3>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Phase: scan */}
        {phase === "scan" && (
          <div className="flex flex-col items-center">
            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4 w-full">
              <button
                onClick={() => setScanMode("camera")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                  scanMode === "camera" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <Camera className="w-4 h-4" />
                {isBn ? "ক্যামেরা" : "Camera"}
              </button>
              <button
                onClick={() => { stopCamera(); setScanMode("upload"); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                  scanMode === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <Upload className="w-4 h-4" />
                {isBn ? "ছবি" : "Upload"}
              </button>
            </div>

            {/* Camera mode */}
            {scanMode === "camera" && (
              <>
                <div className="relative w-64 h-64 rounded-xl overflow-hidden bg-slate-900 mb-4">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  {cameraStatus === "scanning" && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-x-8 inset-y-8 border-2 border-white/70 rounded-lg" />
                      <div className="absolute inset-x-8 top-1/2 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    </div>
                  )}
                  {cameraStatus === "starting" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {cameraStatus === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <CameraOff className="w-10 h-10 text-white/60 mb-2" />
                      <p className="text-xs text-white/80">{errorMsg}</p>
                    </div>
                  )}
                </div>

                {cameraStatus === "scanning" && (
                  <p className="text-xs text-slate-500 text-center mb-3">
                    {isBn ? "অনুরোধের QR কোডে ক্যামেরা ধরে রাখুন" : "Point camera at the request QR code"}
                  </p>
                )}

                {cameraStatus === "error" && (
                  <button
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors mb-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isBn ? "আবার চেষ্টা করুন" : "Try Again"}
                  </button>
                )}

                {devices.length > 1 && cameraStatus === "scanning" && (
                  <button
                    onClick={switchCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {isBn ? "ক্যামেরা পরিবর্তন" : "Switch Camera"}
                  </button>
                )}
              </>
            )}

            {/* Upload mode */}
            {scanMode === "upload" && (
              <div className="flex flex-col items-center w-full">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors mb-3"
                >
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-600 text-center">
                    {isBn ? "QR কোডের ছবি নির্বাচন করুন" : "Select QR code image"}
                  </p>
                  <p className="text-xs text-slate-400 text-center mt-1">
                    {isBn ? "গ্যালারি বা ছবি থেকে" : "From gallery or photos"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        {/* Phase: looking-up */}
        {phase === "looking-up" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-sm text-slate-500">
              {isBn ? "অনুরোধ খোঁজা হচ্ছে..." : "Looking up request..."}
            </p>
          </div>
        )}

        {/* Phase: confirm */}
        {phase === "confirm" && request && (
          <div className="flex flex-col w-full">
            <div className="bg-emerald-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Droplet className="w-5 h-5 text-red-600" />
                <span className="text-lg font-black text-red-600">{request.bloodGroup}</span>
                <span className="text-xs text-slate-500 ml-auto">
                  {isBn ? `${request.unitsNeeded} ইউনিট প্রয়োজন` : `${request.unitsNeeded} units needed`}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 mb-2">{request.patientName}</div>
              <div className="space-y-1.5">
                {request.hospitalName && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {request.hospitalName}
                  </div>
                )}
                {(request.district || request.upazila) && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {[request.upazila, request.district].filter(Boolean).join(", ")}
                  </div>
                )}
                {request.whenNeeded && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {request.whenNeeded}
                  </div>
                )}
                {request.trackingCode && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    #{request.trackingCode}
                  </div>
                )}
              </div>
            </div>

            {/* Units donated */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                {isBn ? "কত ইউনিট দিয়েছেন?" : "How many units did you donate?"}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUnits((u) => Math.max(1, u - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 text-lg font-bold hover:bg-slate-50 transition-colors"
                  aria-label="Decrease units"
                >
                  −
                </button>
                <div className="flex-1 text-center py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-lg font-black text-slate-900">{units}</span>
                  <span className="text-xs text-slate-400 ml-1">
                    {isBn ? "ইউনিট" : units === 1 ? "unit" : "units"}
                  </span>
                </div>
                <button
                  onClick={() => setUnits((u) => Math.min(request.unitsNeeded || 10, u + 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 text-lg font-bold hover:bg-slate-50 transition-colors"
                  aria-label="Increase units"
                >
                  +
                </button>
              </div>
              {units >= (request.unitsNeeded || 1) && (
                <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isBn ? "সব ইউনিট পূরণ — অনুরোধটি স্বয়ংক্রিয়ভাবে পূর্ণ হবে" : "All units met — request will be marked fulfilled"}
                </p>
              )}
            </div>

            {/* Optional referrer */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isBn ? "রেফারার? (ঐচ্ছিক)" : "Referred by? (optional)"}
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setReferrerMode("search")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                      referrerMode === "search" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isBn ? "খুঁজুন" : "Search"}
                  </button>
                  <button
                    onClick={() => { setReferrerMode("manual"); setSelectedReferrer(null); setReferrerQuery(""); }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                      referrerMode === "manual" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isBn ? "ম্যানুয়াল" : "Manual"}
                  </button>
                </div>
              </div>
              {referrerMode === "manual" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={manualReferrerName}
                    onChange={(e) => setManualReferrerName(e.target.value)}
                    placeholder={isBn ? "রেফারারের নাম" : "Referrer name"}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 outline-none"
                  />
                  <input
                    type="tel"
                    value={manualReferrerPhone}
                    onChange={(e) => setManualReferrerPhone(e.target.value)}
                    placeholder={isBn ? "রেফারারের ফোন (ঐচ্ছিক)" : "Referrer phone (optional)"}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 outline-none"
                  />
                </div>
              ) : selectedReferrer ? (
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{selectedReferrer.full_name_en || selectedReferrer.full_name_bn}</span>
                    {selectedReferrer.phone && (
                      <span className="text-xs text-slate-400">{selectedReferrer.phone}</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedReferrer(null); setReferrerQuery(""); }}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={referrerQuery}
                    onChange={(e) => handleReferrerSearch(e.target.value)}
                    placeholder={isBn ? "নাম বা ফোন দিয়ে খুঁজুন" : "Search by name or phone"}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 outline-none"
                  />
                  {searchingReferrers && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                  {referrerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {referrerResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedReferrer(r); setReferrerResults([]); setReferrerQuery(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700 truncate">{r.name}</span>
                          {r.phone && <span className="text-xs text-slate-400 ml-auto">{r.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Heart className="w-4 h-4" />
              {isBn ? "ডোনেশন নিশ্চিত করুন" : "Confirm Donation"}
            </button>
            <button
              onClick={resetToScan}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {isBn ? "আবার স্ক্যান" : "Scan Again"}
            </button>
          </div>
        )}

        {/* Phase: recording */}
        {phase === "recording" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-sm text-slate-500">
              {isBn ? "ডোনেশন রেকর্ড করা হচ্ছে..." : "Recording donation..."}
            </p>
          </div>
        )}

        {/* Phase: success */}
        {phase === "success" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">
              {isBn ? "ডোনেশন রেকর্ড হয়েছে!" : "Donation Recorded!"}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {fulfilledNow
                ? (isBn
                  ? "সব ইউনিট পূরণ হয়েছে — অনুরোধটি পূর্ণ হিসেবে চিহ্নিত হয়েছে।"
                  : "All units met — the request has been marked fulfilled.")
                : (isBn
                  ? "অনুরোধের ট্র্যাকিং স্ট্যাটাস আপডেট হয়েছে।"
                  : "The request's tracking status has been updated.")}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              {isBn ? "সম্পন্ন" : "Done"}
            </button>
          </div>
        )}

        {/* Phase: error */}
        {phase === "error" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-9 h-9 text-red-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-4">{recordingError}</p>
            <button
              onClick={resetToScan}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
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