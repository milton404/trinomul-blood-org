import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const CERT_SIZE = { width: 1200, height: 850 } as const;
export const CERT_CONTENT_TYPE = "image/png";

const FONT_FAMILY = '"Hind Siliguri", sans-serif';
const FONT_NAME = "Hind Siliguri";

function getCertFonts() {
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  try {
    const buf = fs.readFileSync(
      path.join(process.cwd(), "lib", "og", "fonts", "HindSiliguri-Regular.ttf"),
    );
    fonts.push({
      name: FONT_NAME,
      data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      weight: 400,
      style: "normal",
    });
  } catch {}
  try {
    const buf = fs.readFileSync(
      path.join(process.cwd(), "lib", "og", "fonts", "HindSiliguri-Bold.ttf"),
    );
    fonts.push({
      name: FONT_NAME,
      data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      weight: 700,
      style: "normal",
    });
  } catch {}
  return fonts;
}

function getLogoDataUrl(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "android-chrome-512x512.png");
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export type CertificateData = {
  certificateNumber: string;
  donorName: string;
  bloodGroup: string;
  units: number;
  donationType: string;
  hospitalName: string | null;
  donationDate: string;
  donorDistrict?: string | null;
};

function BloodDrop({ size = 80, color = "#dc2626" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      <path d="M50 2 C50 2 92 56 92 82 A42 42 0 1 1 8 82 C8 56 50 2 50 2 Z" fill={color} />
    </svg>
  );
}

const TYPE_LABEL: Record<string, { en: string; bn: string }> = {
  whole_blood: { en: "Whole Blood", bn: "সম্পূর্ণ রক্ত" },
  platelets: { en: "Platelets", bn: "প্লাটিলেট" },
  plasma: { en: "Plasma", bn: "প্লাজমা" },
};

export function CertificateCard(data: CertificateData) {
  const logoUrl = getLogoDataUrl();
  const typeLabel = TYPE_LABEL[data.donationType] ?? TYPE_LABEL.whole_blood;
  const dateLabel = data.donationDate?.slice(0, 10) ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#fffdf7",
        color: "#1f2937",
        padding: "64px",
        position: "relative",
        fontFamily: FONT_FAMILY,
        border: "8px solid #dc2626",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-40px",
          top: "-30px",
          opacity: 0.06,
          display: "flex",
        }}
      >
        <BloodDrop size={420} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} width={64} height={64} alt="logo" style={{ borderRadius: 14 }} />
        ) : (
          <BloodDrop size={48} />
        )}
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#dc2626" }}>
          Trinomul Blood Bank Rangpur
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 52,
          fontWeight: 700,
          color: "#991b1d",
          marginTop: 28,
        }}
      >
        Donation Certificate
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 30,
          color: "#6b7280",
          marginTop: 4,
        }}
      >
        রক্তদান সনদপত্র
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 44,
          fontWeight: 700,
          marginTop: 36,
        }}
      >
        {data.donorName}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 24,
          color: "#6b7280",
          marginTop: 6,
        }}
      >
        has donated {data.units} unit(s) of {typeLabel.en} ({typeLabel.bn})
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 48,
          marginTop: 40,
          fontSize: 26,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ color: "#9ca3af", fontSize: 20 }}>Blood Group</div>
          <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 34 }}>{data.bloodGroup}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ color: "#9ca3af", fontSize: 20 }}>Date</div>
          <div style={{ fontWeight: 700, fontSize: 28 }}>{dateLabel}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ color: "#9ca3af", fontSize: 20 }}>Hospital</div>
          <div style={{ fontWeight: 700, fontSize: 24, maxWidth: 320 }}>
            {data.hospitalName || "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 22,
          color: "#6b7280",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 16, color: "#9ca3af" }}>Certificate No.</div>
          <div style={{ fontWeight: 700, color: "#1f2937" }}>{data.certificateNumber}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 180,
              borderTop: "2px solid #9ca3af",
              marginTop: 40,
              paddingTop: 8,
              textAlign: "center",
            }}
          >
            Authorized Signature
          </div>
        </div>
        <div style={{ display: "flex" }}>Rangpur, Bangladesh</div>
      </div>
    </div>
  );
}

export function renderCertificateImage(data: CertificateData): ImageResponse {
  return new ImageResponse(CertificateCard(data), { ...CERT_SIZE, fonts: getCertFonts() });
}