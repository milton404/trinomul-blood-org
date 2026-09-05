import type { BloodRequestShareData, CrossPostResult } from "./types";

/**
 * Bangladesh Red Crescent Society (BDRC) integration module.
 *
 * Shares urgent blood request data with the Bangladesh Red Crescent Society
 * so their volunteer network and disaster-response teams can coordinate
 * additional donor outreach during critical shortages.
 *
 * Configuration is provided via environment variables:
 *   - RED_CRESCENT_API_URL  Base URL of the BDRC data-sharing endpoint.
 *   - RED_CRESCENT_API_KEY  API key sent in the `Authorization` header.
 *
 * When either variable is missing, the function returns a graceful
 * "not configured" result instead of throwing, so the calling server action
 * can continue sharing with other platforms.
 */

/**
 * Shape of the JSON payload sent to the BDRC API. Follows a snake_case
 * convention to match the BDRC data-sharing schema.
 */
interface RedCrescentPayload {
  patient_name: string;
  blood_group: string;
  units_needed: number;
  urgency_level: string;
  hospital_name?: string;
  district?: string;
  upazila?: string;
  contact_number: string;
  tracking_code?: string;
  source_organization: string;
  shared_at: string;
}

/**
 * Share an urgent blood request with the Bangladesh Red Crescent Society
 * via their REST data-sharing API.
 *
 * Sends the request data as JSON with a Bearer token in the
 * `Authorization` header. If the `RED_CRESCENT_API_URL` or
 * `RED_CRESCENT_API_KEY` environment variables are not set, returns a
 * graceful "not configured" result instead of throwing.
 *
 * @param request - The blood request data to share.
 * @returns A {@link CrossPostResult} describing the outcome.
 */
export async function shareWithRedCrescent(
  request: BloodRequestShareData,
): Promise<CrossPostResult> {
  const apiUrl = process.env.RED_CRESCENT_API_URL;
  const apiKey = process.env.RED_CRESCENT_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      platform: "red-crescent",
      success: false,
      message:
        "Red Crescent integration is not configured (RED_CRESCENT_API_URL / RED_CRESCENT_API_KEY missing).",
    };
  }

  const payload: RedCrescentPayload = {
    patient_name: request.patientName,
    blood_group: request.bloodGroup,
    units_needed: request.unitsNeeded,
    urgency_level: request.urgencyLevel,
    hospital_name: request.hospitalName,
    district: request.district,
    upazila: request.upazila,
    contact_number: request.contactNumber,
    tracking_code: request.trackingCode,
    source_organization: "trinomul-blood-bank",
    shared_at: new Date().toISOString(),
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        platform: "red-crescent",
        success: false,
        message: `Red Crescent API returned HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      request_id?: string;
      share_url?: string;
      error?: { message?: string } | string;
    };

    const errorMessage =
      typeof data.error === "string"
        ? data.error
        : data.error?.message;

    if (errorMessage) {
      return {
        platform: "red-crescent",
        success: false,
        message: `Red Crescent API error: ${errorMessage}`,
      };
    }

    const externalId = data.id || data.request_id || undefined;

    return {
      platform: "red-crescent",
      success: true,
      message: "Blood request shared with Bangladesh Red Crescent Society.",
      externalId,
      shareUrl: data.share_url,
    };
  } catch (error) {
    return {
      platform: "red-crescent",
      success: false,
      message: `Failed to share with Red Crescent: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
