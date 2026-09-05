const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
  "`": "&#96;",
  "=": "&#61;",
};

export function escapeHtml(input: string): string {
  return String(input).replace(/[&<>"'`/=]/g, (char) => HTML_ENTITY_MAP[char] || char);
}

export function stripHtml(input: string): string {
  return String(input)
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-zA-Z]+;/g, " ")
    .trim();
}

const DANGEROUS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object[^>]*>[\s\S]*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

export function containsXss(input: string): boolean {
  const str = String(input).toLowerCase();
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(str));
}

export function sanitizeText(
  input: string,
  maxLength: number = 1000,
): string {
  if (typeof input !== "string") return "";
  let cleaned = input.trim();
  cleaned = stripHtml(cleaned);
  cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

export function sanitizeHtml(
  input: string,
  maxLength: number = 10000,
): string {
  if (typeof input !== "string") return "";
  let cleaned = input.trim();
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = escapeHtml(cleaned);
  cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

const PHONE_REGEX_BD = /^(\+?880|0)?1[3-9]\d{8}$/;

export function sanitizePhone(input: string): string {
  if (typeof input !== "string") return "";
  const cleaned = input.replace(/[\s\-()]/g, "");
  if (!PHONE_REGEX_BD.test(cleaned)) return "";
  return cleaned.startsWith("+") ? cleaned : cleaned.startsWith("880") ? `+${cleaned}` : cleaned.startsWith("0") ? `+880${cleaned.slice(1)}` : `+880${cleaned}`;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function sanitizeEmail(input: string): string {
  if (typeof input !== "string") return "";
  const cleaned = input.trim().toLowerCase().slice(0, 254);
  if (!EMAIL_REGEX.test(cleaned)) return "";
  return cleaned;
}

export function sanitizeUrl(input: string, allowedProtocols: string[] = ["https:"]): string {
  if (typeof input !== "string") return "";
  const cleaned = input.trim().slice(0, 2048);
  try {
    const url = new URL(cleaned);
    if (!allowedProtocols.includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function sanitizeNumber(
  input: unknown,
  min: number = -Infinity,
  max: number = Infinity,
): number | null {
  const num = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(num)) return null;
  return Math.min(Math.max(num, min), max);
}

export function sanitizeInteger(
  input: unknown,
  min: number = -Infinity,
  max: number = Infinity,
): number | null {
  const num = sanitizeNumber(input, min, max);
  if (num === null) return null;
  return Math.floor(num);
}

export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    return input.toLowerCase() === "true" || input === "1" || input === "yes";
  }
  if (typeof input === "number") return input === 1;
  return false;
}

const BLOOD_GROUP_REGEX = /^(A|B|AB|O)[+-]$/;

export function sanitizeBloodGroup(input: string): string {
  if (typeof input !== "string") return "";
  const cleaned = input.trim().toUpperCase();
  if (!BLOOD_GROUP_REGEX.test(cleaned)) return "";
  return cleaned;
}

const SQL_INJECTION_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
];

export function containsSqlInjection(input: string): boolean {
  if (typeof input !== "string") return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeSearchQuery(input: string, maxLength: number = 200): string {
  if (typeof input !== "string") return "";
  let cleaned = input.trim().slice(0, maxLength);
  cleaned = cleaned.replace(/[<>]/g, "");
  return cleaned;
}

export function sanitizeFilename(input: string, maxLength: number = 255): string {
  if (typeof input !== "string") return "";
  let cleaned = input.trim().slice(0, maxLength);
  cleaned = cleaned.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  cleaned = cleaned.replace(/^\.+/, "");
  return cleaned || "unnamed";
}