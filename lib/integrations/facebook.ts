import type { BloodRequestShareData, CrossPostResult } from "./types";

/**
 * Facebook Graph API base URL for publishing feed posts.
 * The Graph API version is pinned to v18.0 for stability.
 */
const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v18.0";

/**
 * Default target: the Bangladesh Blood Donors Facebook group. The group ID
 * can be overridden via the FACEBOOK_GROUP_ID env var if needed.
 */
const DEFAULT_FACEBOOK_GROUP_ID = "bangladesh.blood.donors";

/**
 * Urgency level → human-readable labels in Bengali and English, used to
 * prefix the cross-post so the post stands out in busy feeds.
 */
const URGENCY_LABELS: Record<string, { bn: string; en: string }> = {
  critical: { bn: "জরুরি (সংকটাপন্ন)", en: "CRITICAL" },
  urgent: { bn: "জরুরি", en: "URGENT" },
  normal: { bn: "সাধারণ", en: "Normal" },
};

/**
 * Build the bilingual post body (Bengali + English) for a blood request.
 * Combines patient name, blood group, units, hospital, location and contact
 * so a scrolling Facebook user can act on it immediately.
 *
 * @param request - The blood request data to render into a post.
 * @returns A formatted string ready to be sent to the Facebook Graph API.
 */
export function formatFacebookPost(request: BloodRequestShareData): string {
  const urgency =
    URGENCY_LABELS[request.urgencyLevel] || URGENCY_LABELS.normal;

  const locationParts = [request.upazila, request.district]
    .filter(Boolean)
    .join(", ");
  const location = locationParts || "অজানা / Unknown";

  const trackingLine = request.trackingCode
    ? `Tracking: ${request.trackingCode}`
    : "";

  // Bengali section first (primary audience), then English mirror.
  const bn = [
    `🩸 রক্ত প্রয়োজন — ${urgency.bn}`,
    `রোগী: ${request.patientName}`,
    `রক্তের গ্রুপ: ${request.bloodGroup}`,
    `পরিমাণ: ${request.unitsNeeded} ইউনিট`,
    request.hospitalName ? `হাসপাতাল: ${request.hospitalName}` : "",
    `স্থান: ${location}`,
    `যোগাযোগ: ${request.contactNumber}`,
  ]
    .filter(Boolean)
    .join("\n");

  const en = [
    `🩸 Blood Needed — ${urgency.en}`,
    `Patient: ${request.patientName}`,
    `Blood Group: ${request.bloodGroup}`,
    `Units Needed: ${request.unitsNeeded}`,
    request.hospitalName ? `Hospital: ${request.hospitalName}` : "",
    `Location: ${location}`,
    `Contact: ${request.contactNumber}`,
    trackingLine,
  ]
    .filter(Boolean)
    .join("\n");

  return `${bn}\n\n${en}\n\n#TrinomulBloodBank #BloodDonationBD`;
}

/**
 * Cross-post an urgent blood request to the Bangladesh Blood Donors
 * Facebook group via the Facebook Graph API.
 *
 * This is a placeholder integration — it requires the
 * `FACEBOOK_PAGE_ACCESS_TOKEN` environment variable to be set. When the
 * token is absent the function returns a graceful "not configured" result
 * instead of throwing, so callers can fan out across multiple platforms
 * without one missing platform breaking the whole flow.
 *
 * @param request - The blood request data to cross-post.
 * @returns A {@link CrossPostResult} describing the outcome.
 */
export async function crossPostToFacebook(
  request: BloodRequestShareData,
): Promise<CrossPostResult> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!token) {
    return {
      platform: "facebook",
      success: false,
      message:
        "Facebook integration is not configured (FACEBOOK_PAGE_ACCESS_TOKEN missing).",
    };
  }

  const groupId =
    process.env.FACEBOOK_GROUP_ID || DEFAULT_FACEBOOK_GROUP_ID;
  const url = `${FACEBOOK_GRAPH_BASE}/${groupId}/feed`;

  try {
    const body = formatFacebookPost(request);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: body,
        access_token: token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        platform: "facebook",
        success: false,
        message: `Facebook API returned HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };

    if (data.error) {
      return {
        platform: "facebook",
        success: false,
        message: `Facebook API error: ${data.error.message || "Unknown error"}`,
      };
    }

    const externalId = data.id || undefined;
    // Facebook feed posts return an id of the form "{pageId}_{postId}".
    // Build a public permalink from that when possible.
    let shareUrl: string | undefined;
    if (externalId && externalId.includes("_")) {
      const [pageId, postId] = externalId.split("_");
      shareUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
    }

    return {
      platform: "facebook",
      success: true,
      message: "Blood request cross-posted to Facebook group.",
      externalId,
      shareUrl,
    };
  } catch (error) {
    return {
      platform: "facebook",
      success: false,
      message: `Failed to cross-post to Facebook: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
