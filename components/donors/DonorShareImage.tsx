"use client";

import {
  ShieldCheck,
  MapPin,
  Heart,
  Droplet,
  Clock,
  Phone,
  Calendar,
} from "lucide-react";

/**
 * Off-screen 1080×1080 social-media-optimized share template for a donor.
 * Captured with html-to-image's toPng. Pure presentational.
 *
 * Layout: header → hero (blood group + name) → details grid → phone + QR footer
 */

interface DonorShareImageProps {
  fullName: string;
  bloodGroup: string;
  district: string;
  upazila: string;
  totalDonations: number;
  donorSinceYear: number | null;
  isVerified: boolean;
  avgResponseMin: number | null;
  phone?: string | null;
  siteOrigin: string;
  qrDataUrl: string | null;
  labels: {
    verifiedBadge: string;
    donations: string;
    donorSince: string;
    location: string;
    scanToView: string;
    responseTime: string;
    callNow: string;
    donorProfile: string;
  };
}

export default function DonorShareImage({
  fullName,
  bloodGroup,
  district,
  upazila,
  totalDonations,
  donorSinceYear,
  isVerified,
  avgResponseMin,
  phone,
  siteOrigin,
  qrDataUrl,
  labels,
}: DonorShareImageProps) {
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(170deg, #ffffff 0%, #f0fdf4 45%, #dcfce7 100%)",
        fontFamily: 'Arial, "Segoe UI", "Nirmala UI", "Noto Sans Bengali", "Hind Siliguri", sans-serif',
      }}
    >
      {/* Decorative soft blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 520, height: 520, top: -170, right: -150, backgroundColor: "rgba(16,185,129,0.08)" }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 460, height: 460, bottom: -190, left: -160, backgroundColor: "rgba(220,38,38,0.06)" }}
      />

      {/* Watermark */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          bottom: 120,
          right: -60,
          transform: "rotate(-30deg)",
          fontSize: 72,
          fontWeight: 900,
          color: "rgba(16,185,129,0.06)",
          whiteSpace: "nowrap",
          letterSpacing: 2,
        }}
      >
        Trinomul Blood Bank
      </div>

      <div className="relative flex flex-col h-full" style={{ padding: 48 }}>
        {/* Header — brand + verified badge */}
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
          {isVerified && (
            <div
              className="flex items-center shrink-0"
              style={{
                gap: 8,
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 0.5,
                padding: "12px 26px",
                borderRadius: 999,
                boxShadow: "0 6px 18px rgba(5,150,105,0.28)",
              }}
            >
              <ShieldCheck style={{ width: 28, height: 28 }} />
              {labels.verifiedBadge}
            </div>
          )}
        </div>

        {/* Hero — circular blood group + donor name */}
        <div
          className="flex items-center shrink-0"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 26,
            padding: 24,
            gap: 32,
            boxShadow: "0 10px 32px rgba(16,185,129,0.10)",
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
              {fullName}
            </div>
            <div
              className="inline-flex items-center"
              style={{
                backgroundColor: "#f0fdf4",
                borderRadius: 999,
                padding: "8px 22px",
                marginTop: 14,
                gap: 8,
              }}
            >
              <MapPin style={{ width: 24, height: 24, color: "#059669" }} strokeWidth={2.2} />
              <span style={{ fontSize: 26, fontWeight: 700, color: "#059669" }}>
                {upazila}, {district}
              </span>
            </div>
          </div>
        </div>

        {/* Details grid 2×2 with icon containers */}
        <div
          className="grid grid-cols-2 shrink-0"
          style={{ gap: "18px 24px", marginBottom: 20 }}
        >
          {[
            {
              icon: Heart,
              label: labels.donations,
              value: String(totalDonations),
              iconBg: "#ffe4e6",
              iconColor: "#dc2626",
              fill: "#dc2626",
            },
            {
              icon: Calendar,
              label: labels.donorSince,
              value: donorSinceYear ? String(donorSinceYear) : "—",
              iconBg: "#dcfce7",
              iconColor: "#059669",
            },
            {
              icon: Clock,
              label: labels.responseTime,
              value: avgResponseMin !== null ? `~${avgResponseMin}m` : "—",
              iconBg: "#e0f2fe",
              iconColor: "#0ea5e9",
            },
            {
              icon: MapPin,
              label: labels.location,
              value: district,
              iconBg: "#ede9fe",
              iconColor: "#8b5cf6",
            },
          ].map(({ icon: Icon, label, value, iconBg, iconColor, fill }) => (
            <div key={label} className="flex items-center" style={{ gap: 14, minWidth: 0 }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: iconBg }}
              >
                <Icon
                  style={{ width: 26, height: 26, color: iconColor, ...(fill ? { fill } : {}) }}
                  strokeWidth={2.2}
                />
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

        {/* Phone + QR footer — pinned to bottom */}
        <div
          className="flex items-center justify-between"
          style={{ gap: 24, marginTop: "auto" }}
        >
          {phone ? (
            <div
              className="min-w-0"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                borderLeft: "10px solid #059669",
                padding: "20px 28px",
                boxShadow: "0 8px 24px rgba(16,185,129,0.10)",
                maxWidth: 730,
              }}
            >
              <div className="flex items-center" style={{ gap: 18 }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 68, height: 68, borderRadius: "50%", backgroundColor: "#059669" }}
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
                    {phone}
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 700, color: "#059669", marginTop: 2 }}>
                    {labels.callNow}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="min-w-0"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                padding: "20px 28px",
                boxShadow: "0 8px 24px rgba(16,185,129,0.10)",
                maxWidth: 730,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>
                {labels.donorProfile}
              </div>
              <div style={{ fontSize: 22, color: "#64748b", marginTop: 4 }}>
                {siteOrigin}/donors
              </div>
            </div>
          )}

          {/* QR block */}
          <div className="flex flex-col items-center shrink-0" style={{ width: 230 }}>
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 206,
                height: 206,
                backgroundColor: "#ffffff",
                padding: 12,
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-qr-slot
                src={qrDataUrl ?? ""}
                alt="QR"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              <svg
                width="80"
                height="80"
                viewBox="0 0 32 32"
                aria-hidden="true"
                className="absolute"
                style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
              >
                <path
                  d="M16,6 C12.5,10.5 9.5,14 9.5,17.5 C9.5,21.1 12.4,24 16,24 C19.6,24 22.5,21.1 22.5,17.5 C22.5,14 19.5,10.5 16,6Z"
                  fill="#ffffff"
                  stroke="#dc2626"
                  strokeWidth="0.5"
                  opacity="0.95"
                />
                <text
                  x="16"
                  y="19"
                  textAnchor="middle"
                  fontSize={bloodGroup && bloodGroup.length > 2 ? "4.5" : "5.5"}
                  fontWeight="900"
                  fill="#dc2626"
                >
                  {bloodGroup}
                </text>
              </svg>
            </div>
            <div style={{ fontSize: 21, color: "#64748b", marginTop: 10, textAlign: "center" }}>
              {labels.scanToView}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
