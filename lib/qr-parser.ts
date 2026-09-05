/**
 * Parse scanned QR content to extract a blood-request tracking code or ID.
 *
 * Request QR codes encode URLs like:
 *   https://site/bn/requests?req=REQ-AB12CD   (share mode)
 *   https://site/bn/track/REQ-AB12CD           (track mode)
 * Or raw tracking codes: REQ-AB12CD
 */

export interface ParsedRequestQr {
  trackingCode: string | null;
  requestId: number | null;
}

const TRACKING_CODE_RE = /^REQ-[A-Z0-9]{4,}$/i;

/**
 * Extract tracking code or numeric request ID from a scanned QR string.
 * Returns `{ trackingCode: null, requestId: null }` if unrecognised.
 */
export function parseRequestQr(raw: string): ParsedRequestQr {
  const trimmed = raw.trim();
  if (!trimmed) return { trackingCode: null, requestId: null };

  // 1. Try raw tracking code (e.g. "REQ-AB12CD")
  if (TRACKING_CODE_RE.test(trimmed)) {
    return { trackingCode: trimmed.toUpperCase(), requestId: null };
  }

  // 2. Try URL parse
  try {
    const url = new URL(trimmed);
    const path = url.pathname + url.search;

    // /track/{code}
    const trackMatch = path.match(/\/track\/([^/?#]+)/);
    if (trackMatch) {
      const code = decodeURIComponent(trackMatch[1]);
      if (/^\d+$/.test(code)) {
        return { trackingCode: null, requestId: parseInt(code, 10) };
      }
      if (TRACKING_CODE_RE.test(code)) {
        return { trackingCode: code.toUpperCase(), requestId: null };
      }
    }

    // /requests?req={code}
    const reqParam = url.searchParams.get("req");
    if (reqParam) {
      if (/^\d+$/.test(reqParam)) {
        return { trackingCode: null, requestId: parseInt(reqParam, 10) };
      }
      if (TRACKING_CODE_RE.test(reqParam)) {
        return { trackingCode: reqParam.toUpperCase(), requestId: null };
      }
    }
  } catch {
    // not a URL — fall through
  }

  return { trackingCode: null, requestId: null };
}