"use client";

import {
  Phone,
  MapPin,
  Clock,
  Hospital,
  Calendar,
  Droplet,
  MessageCircle,
} from "lucide-react";

/**
 * Off-screen 1080×1080 Facebook-optimized share template for a blood request.
 * Rendered by RequestCard inside a hidden absolute container and captured with
 * html-to-image. Pure presentational: all strings arrive pre-computed so the
 * exported image can never disagree with the card.
 *
 * Layout budget (content box 984×984 after 48px padding):
 *   header 84 + 24 | hero 268 + 20 | grid 176 + 20 | reason ≤112 + 16 | footer ≤250
 *   → worst case 948 ≤ 984 (fits; no clipping of phone/QR)
 *
 * System font stack only — the capture runs with skipFonts so embedded
 * webfonts can never corrupt the text.
 */

export interface ShareImageLabels {
  urgentBadge: string;
  bagsNeeded: string;
  hospital: string;
  location: string;
  neededBy: string;
  urgency: string;
  callNow: string;
  alternative: string;
  whatsapp: string;
  scanToView: string;
}

interface RequestShareImageProps {
  patientName: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalName: string;
  locationText: string;
  whenNeededText: string;
  urgencyLabel: string;
  reason?: string;
  primaryPhone?: string | null;
  altPhone?: string | null;
  whatsappNumber?: string | null;
  trackingCode?: string | null;
  siteOrigin: string;
  qrDataUrl?: string | null;
  labels: ShareImageLabels;
  patientHbLevel?: number | null;
}

export default function RequestShareImage({
  patientName,
  bloodGroup,
  unitsNeeded,
  hospitalName,
  locationText,
  whenNeededText,
  urgencyLabel,
  reason,
  primaryPhone,
  altPhone,
  whatsappNumber,
  trackingCode,
  siteOrigin,
  qrDataUrl,
  labels,
  patientHbLevel,
}: RequestShareImageProps) {
  const hasContact = !!(primaryPhone || altPhone || whatsappNumber);

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(170deg, #ffffff 0%, #fff5f6 45%, #ffe9ec 100%)",
        fontFamily: 'Arial, "Segoe UI", "Nirmala UI", "Noto Sans Bengali", "Hind Siliguri", sans-serif',
      }}
    >
      {/* Decorative soft blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 520, height: 520, top: -170, right: -150, backgroundColor: "rgba(220,38,38,0.07)" }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 460, height: 460, bottom: -190, left: -160, backgroundColor: "rgba(220,38,38,0.06)" }}
      />

      {/* Watermark — diagonal, low opacity */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          bottom: 120,
          right: -60,
          transform: "rotate(-30deg)",
          fontSize: 72,
          fontWeight: 900,
          color: "rgba(220,38,38,0.06)",
          whiteSpace: "nowrap",
          letterSpacing: 2,
        }}
      >
        Trinomul Blood Bank
      </div>

      <div className="relative flex flex-col h-full" style={{ padding: 48 }}>
        {/* Header — brand + urgent badge */}
        <div className="flex items-center justify-between shrink-0" style={{ marginBottom: 24 }}>
          <div className="flex items-center" style={{ gap: 18 }}>
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 80, height: 80, backgroundColor: "#dc2626", borderRadius: 22 }}
            >
              <svg width="46" height="46" viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M16,6 C12.5,10.5 9.5,14 9.5,17.5 C9.5,21.1 12.4,24 16,24 C19.6,24 22.5,21.1 22.5,17.5 C22.5,14 19.5,10.5 16,6Z"
                  fill="#ffffff"
                  opacity="0.95"
                />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", lineHeight: 1.15 }}>
                Trinomul Blood Bank
              </div>
              <div style={{ fontSize: 22, color: "#64748b", marginTop: 3 }}>{siteOrigin}</div>
            </div>
          </div>
          <div
            className="uppercase shrink-0"
            style={{
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 1,
              padding: "12px 26px",
              borderRadius: 999,
              boxShadow: "0 6px 18px rgba(220,38,38,0.28)",
            }}
          >
            {labels.urgentBadge}
          </div>
        </div>

        {/* Hero — blood group + patient */}
        <div
          className="flex items-center shrink-0"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 26,
            padding: 24,
            gap: 32,
            boxShadow: "0 10px 32px rgba(190,18,60,0.10)",
            marginBottom: 20,
          }}
        >
          <div
            className="flex flex-col items-center justify-center shrink-0"
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              backgroundColor: "#fef2f3",
              border: "5px solid #fecdd3",
            }}
          >
            <Droplet style={{ width: 38, height: 38, color: "#ef4444", marginBottom: 2 }} strokeWidth={2.5} />
            <span style={{ fontSize: 86, fontWeight: 900, color: "#dc2626", lineHeight: 1.05 }}>{bloodGroup}</span>
          </div>
          <div className="min-w-0" style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 46,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
                wordBreak: "break-word",
                maxHeight: 112,
                overflow: "hidden",
              }}
            >
              {patientName}
            </div>
            <div
              className="inline-flex items-center"
              style={{
                backgroundColor: "#fef2f2",
                borderRadius: 999,
                padding: "8px 22px",
                marginTop: 14,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: "#dc2626" }}>
                {unitsNeeded} {labels.bagsNeeded}
              </span>
            </div>
          </div>
        </div>

        {/* Info grid 2×2 */}
        <div
          className="grid grid-cols-2 shrink-0"
          style={{ gap: "18px 24px", marginBottom: reason ? 16 : 20 }}
        >
          {[
            { icon: Hospital, label: labels.hospital, value: hospitalName },
            { icon: MapPin, label: labels.location, value: locationText },
            { icon: Calendar, label: labels.neededBy, value: whenNeededText },
            { icon: Clock, label: labels.urgency, value: urgencyLabel },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center" style={{ gap: 14, minWidth: 0 }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "#ffe4e6" }}
              >
                <Icon style={{ width: 26, height: 26, color: "#dc2626" }} strokeWidth={2.2} />
              </div>
              <div className="min-w-0" style={{ minWidth: 0 }}>
                <div
                  className="uppercase"
                  style={{ fontSize: 19, fontWeight: 700, color: "#64748b", letterSpacing: 0.5 }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 27,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                    maxHeight: 68,
                    overflow: "hidden",
                  }}
                >
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reason — optional quote block */}
        {patientHbLevel != null && (
          <div
            className="shrink-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.75)",
              borderLeft: "6px solid #e11d48",
              borderRadius: 14,
              padding: "14px 20px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 24,
                color: "#334155",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              Hb: {patientHbLevel} g/dL
            </p>
          </div>
        )}
        {reason && (
          <div
            className="shrink-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.75)",
              borderLeft: "6px solid #fda4af",
              borderRadius: 14,
              padding: "14px 20px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 24,
                color: "#334155",
                fontStyle: "italic",
                lineHeight: 1.4,
                margin: 0,
                maxHeight: 68,
                overflow: "hidden",
              }}
            >
              {reason}
            </p>
          </div>
        )}

        {/* Contact + QR footer — pinned to the bottom */}
        <div
          className="flex items-center justify-between"
          style={{ gap: 24, marginTop: "auto" }}
        >
          {hasContact ? (
            <div
              className="min-w-0"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                borderLeft: "10px solid #dc2626",
                padding: "20px 28px",
                boxShadow: "0 8px 24px rgba(190,18,60,0.10)",
                maxWidth: 730,
              }}
            >
              {primaryPhone && (
                <div className="flex items-center" style={{ gap: 18 }}>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 68, height: 68, borderRadius: "50%", backgroundColor: "#dc2626" }}
                  >
                    <Phone style={{ width: 32, height: 32, color: "#ffffff" }} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0" style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 44,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1.15,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {primaryPhone}
                    </div>
                    <div style={{ fontSize: 21, fontWeight: 700, color: "#dc2626", marginTop: 2 }}>
                      {labels.callNow}
                    </div>
                  </div>
                </div>
              )}
              {(altPhone || whatsappNumber) && (
                <div
                  className="flex items-center"
                  style={{ gap: 28, marginTop: primaryPhone ? 14 : 0 }}
                >
                  {altPhone && (
                    <div className="flex items-center" style={{ gap: 9 }}>
                      <Phone style={{ width: 24, height: 24, color: "#64748b" }} strokeWidth={2.2} />
                      <span style={{ fontSize: 27, fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>
                        {altPhone}
                      </span>
                    </div>
                  )}
                  {whatsappNumber && (
                    <div className="flex items-center" style={{ gap: 9 }}>
                      <MessageCircle style={{ width: 24, height: 24, color: "#059669" }} strokeWidth={2.2} />
                      <span style={{ fontSize: 27, fontWeight: 600, color: "#059669", whiteSpace: "nowrap" }}>
                        {whatsappNumber}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* QR block — fixed footprint, never overflows */}
          <div className="flex flex-col items-center shrink-0" style={{ width: 230 }}>
            {qrDataUrl && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: 12,
                  borderRadius: 16,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                }}
              >
                <img src={qrDataUrl} alt="" width={206} height={206} style={{ display: "block" }} />
              </div>
            )}
            {trackingCode && (
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 700,
                  color: "#475569",
                  fontFamily: 'Consolas, "Courier New", monospace',
                  marginTop: 10,
                }}
              >
                #{trackingCode}
              </div>
            )}
            <div style={{ fontSize: 21, color: "#64748b", marginTop: 4, textAlign: "center" }}>
              {labels.scanToView}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
