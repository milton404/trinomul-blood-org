import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const FONT_FAMILY = '"Hind Siliguri", sans-serif';

export type OgCardProps = {
  title: string;
  description?: string;
  badge?: string;
  siteName?: string;
  siteUrl?: string;
};

function loadFont(
  filename: string,
  weight: 400 | 700,
): { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" } | null {
  try {
    const buf = fs.readFileSync(
      path.join(process.cwd(), "lib", "og", "fonts", filename),
    );
    const data = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
    return { name: FONT_FAMILY, data, weight, style: "normal" };
  } catch {
    return null;
  }
}

function getOgfFonts() {
  const regular = loadFont("HindSiliguri-Regular.ttf", 400);
  const bold = loadFont("HindSiliguri-Bold.ttf", 700);
  return [regular, bold].filter(
    (f): f is { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" } =>
      f !== null,
  );
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

function BloodDrop({
  size = 120,
  color = "#ffffff",
  opacity = 1,
}: {
  size?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      style={{ opacity }}
    >
      <path
        d="M50 2 C50 2 92 56 92 82 A42 42 0 1 1 8 82 C8 56 50 2 50 2 Z"
        fill={color}
      />
    </svg>
  );
}

export function OgCard({
  title,
  description,
  badge,
  siteName = "Trinomul Blood Bank Rangpur",
  siteUrl = "www.trinomul.org",
}: OgCardProps) {
  const desc =
    description && description.length > 128
      ? description.slice(0, 125) + "\u2026"
      : description;

  const logoUrl = getLogoDataUrl();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #dc2626 0%, #991b1d 100%)",
        color: "#ffffff",
        padding: "72px",
        position: "relative",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-70px",
          top: "-50px",
          opacity: 0.1,
          display: "flex",
        }}
      >
        <BloodDrop size={540} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} width={56} height={56} alt="logo" style={{ borderRadius: 12 }} />
        ) : (
          <BloodDrop size={40} />
        )}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {siteName}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      {badge ? (
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "rgba(255,255,255,0.16)",
            borderRadius: 999,
            padding: "8px 22px",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 22,
          }}
        >
          {badge}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.08,
          maxWidth: 940,
          marginBottom: 24,
        }}
      >
        {title}
      </div>

      {desc ? (
        <div
          style={{
            display: "flex",
            fontSize: 28,
            lineHeight: 1.35,
            maxWidth: 860,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {desc}
        </div>
      ) : null}

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          color: "rgba(255,255,255,0.8)",
        }}
      >
        <div style={{ display: "flex" }}>{siteUrl}</div>
        <div style={{ display: "flex" }}>Rangpur, Bangladesh</div>
      </div>
    </div>
  );
}

export function renderOgImage(props: OgCardProps): ImageResponse {
  return new ImageResponse(OgCard(props), { ...OG_SIZE, fonts: getOgfFonts() });
}