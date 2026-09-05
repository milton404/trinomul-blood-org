import type { BloodRequestShareData, CrossPostResult } from "./types";

/**
 * Sandhani API integration module.
 *
 * Sandhani is a Bangladesh-based voluntary organization of medical students
 * that mobilizes blood donors across medical college campuses. This module
 * pushes urgent blood requests to the Sandhani donor network via a REST API
 * so their volunteers can be alerted alongside the Trinomul network.
 *
 * Configuration is provided via environment variables:
 *   - SANDHANI_API_URL  Base URL of the Sandhani REST endpoint.
 *   - SANDHANI_API_KEY  API key sent in the `X-API-Key` header for auth.
 *
 * When either variable is missing, the function returns a graceful
 * "not configured" result instead of throwing, so the calling server action
 * can continue sharing with other platforms.
 */

/**
 * Shape of the JSON payload sent to the Sandhani API. Mirrors the Trinomul
 * blood request fields Sandhani expects in their intake endpoint.
 */
interface SandhaniPayload {
  patient_name: string;
  blood_group: string;
  units_needed: number;
  urgency_level: string;
  hospital_name?: string;
  district?: string;
  upazila?: string;
  contact_number: string;
  tracking_code?: string;
  source: string;
}

/**
 * Share an urgent blood request with the Sandhani medical-student donor
 * network via their REST API.
 *
 * Sends the request data as JSON with an `X-API-Key` auth header. If the
 * `SANDHANI_API_URL` or `SANDHANI_API_KEY` environment variables are not set,
 * returns a graceful "not configured" result instead of throwing.
 *
 * @param request - The blood request data to share.
 * @returns A {@link CrossPostResult} describing the outcome.
 */
export async function shareWithSandhani(
  request: BloodRequestShareData,
): Promise<CrossPostResult> {
  const apiUrl = process.env.SANDHANI_API_URL;
  const apiKey = process.env.SANDHANI_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      platform: "sandhani",
      success: false,
      message:
        "Sandhani integration is not configured (SANDHANI_API_URL / SANDHANI_API_KEY missing).",
    };
  }

  const payload: SandhaniPayload = {
    patient_name: request.patientName,
    blood_group: request.bloodGroup,
    units_needed: request.unitsNeeded,
    urgency_level: request.urgencyLevel,
    hospital_name: request.hospitalName,
    district: request.district,
    upazila: request.upazila,
    contact_number: request.contactNumber,
    tracking_code: request.trackingCode,
    source: "trinomul-blood-bank",
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        platform: "sandhani",
        success: false,
        message: `Sandhani API returned HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      request_id?: string;
      share_url?: string;
      error?: { message?: string } | string;
    };

    // Some error responses come back with HTTP 200 + an error body.
    const errorMessage =
      typeof data.error === "string"
        ? data.error
        : data.error?.message;

    if (errorMessage) {
      return {
        platform: "sandhani",
        success: false,
        message: `Sandhani API error: ${errorMessage}`,
      };
    }

    const externalId = data.id || data.request_id || undefined;

    return {
      platform: "sandhani",
      success: true,
      message: "Blood request shared with Sandhani donor network.",
      externalId,
      shareUrl: data.share_url,
    };
  } catch (error) {
    return {
      platform: "sandhani",
      success: false,
      message: `Failed to share with Sandhani: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
