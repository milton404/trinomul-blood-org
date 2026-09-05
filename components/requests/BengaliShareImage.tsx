"use client";

interface BengaliShareImageProps {
  bnText: string;
  trackingCode?: string | null;
  qrDataUrl?: string | null;
}

export default function BengaliShareImage({
  bnText,
  trackingCode,
  qrDataUrl,
}: BengaliShareImageProps) {
  const lines = bnText.split("\n");

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(170deg, #ffffff 0%, #fff5f6 45%, #ffe9ec 100%)",
        fontFamily: '"Noto Sans Bengali", "Hind Siliguri", "Nirmala UI", Arial, sans-serif',
      }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 520, height: 520, top: -170, right: -150, backgroundColor: "rgba(220,38,38,0.07)" }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 460, height: 460, bottom: -190, left: -160, backgroundColor: "rgba(220,38,38,0.06)" }}
      />

      <div className="relative flex flex-col h-full" style={{ padding: 48 }}>
        <div className="flex items-center justify-between shrink-0" style={{ marginBottom: 20 }}>
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
                ট্রিনমুল ব্লাড ব্যাংক
              </div>
              <div style={{ fontSize: 22, color: "#64748b", marginTop: 3 }}>রংপুর</div>
            </div>
          </div>
        </div>

        <div
          className="shrink-0"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 26,
            padding: "36px 40px",
            boxShadow: "0 10px 32px rgba(190,18,60,0.10)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 14,
          }}
        >
          {lines.map((line, i) => {
            const isHeader = line.startsWith("🚨") || line.startsWith("আসসালামু");
            const isLink = line.startsWith("🔗");
            const isEmpty = line.trim() === "";

            if (isEmpty) return <div key={i} style={{ height: 8 }} />;

            return (
              <div
                key={i}
                style={{
                  fontSize: isHeader ? 38 : isLink ? 24 : 30,
                  fontWeight: isHeader ? 800 : 600,
                  color: isHeader ? "#dc2626" : isLink ? "#2563eb" : "#1e293b",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  fontFamily: isLink
                    ? 'Consolas, "Courier New", monospace'
                    : 'inherit',
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between shrink-0"
          style={{ gap: 24, marginTop: 20 }}
        >
          <div style={{ fontSize: 23, fontWeight: 700, color: "#475569", fontFamily: 'Consolas, "Courier New", monospace' }}>
            {trackingCode ? `#${trackingCode}` : ""}
          </div>

          {qrDataUrl && (
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: 12,
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              }}
            >
              <img src={qrDataUrl} alt="" width={180} height={180} style={{ display: "block" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}