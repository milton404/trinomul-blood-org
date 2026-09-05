/**
 * Client-side image upload to Cloudinary using a SERVER-SIGNED upload.
 *
 * Flow:
 *   1. Browser POSTs to /api/cloudinary/sign with useCase + file metadata
 *      → server returns signature + api_key + timestamp (never exposes secret)
 *   2. Browser uploads the file directly to Cloudinary using XHR so we can
 *      report upload progress.
 *   3. Returns the secure CDN URL and public_id.
 *
 * Why signed?
 *   - Folders/enforcements are guaranteed server-side (can't be tampered with)
 *   - Works even if the ml_default preset is set to "signed" in the dashboard
 *   - No API secret in the browser bundle
 *
 * Required env (public, safe to expose):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  e.g. "dxxxyyyy"
 *
 * Required server-only (loaded by /api/cloudinary/sign, NOT exposed):
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

type UseCase = "avatar" | "social_post" | "nid";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function isCloudinaryConfigured(): boolean {
  // Signed flow only requires the cloud name to be public; the server-side
  // /api/cloudinary/sign route fills in the rest. If CLOUD_NAME is missing
  // we bail early so the UI can disable the upload button.
  return Boolean(CLOUD_NAME);
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

interface SignResponse {
  cloudName: string;
  apiKey: string;
  folder: string;
  tags: string;
  signature: string;
  timestamp: number;
  paramsToSign: Record<string, string | number | boolean>;
  uploadUrl: string;
}

async function requestSignature(
  useCase: UseCase,
  file: File,
): Promise<SignResponse> {
  const res = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      useCase,
      fileSizeBytes: file.size,
      contentType: file.type,
    }),
  });
  if (!res.ok) {
    let msg = `Signature request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as SignResponse;
}

/**
 * Upload a single image file to Cloudinary using a server-signed request,
 * and return its secure URL and public_id.
 *
 * @param useCase - "avatar" → trinomul/avatars (public);
 *                  "social_post" → trinomul/social (public);
 *                  "nid" → trinomul/nid (authenticated — signed URL required
 *                          to view; store the returned `publicId` in the DB,
 *                          not `url`, since the URL is not publicly readable).
 *                  Must match the server allow-list.
 */
export async function uploadImageToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
  useCase: UseCase = "social_post",
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.",
    );
  }

  // ── Step 1: Get a signed upload payload from our server ─────────────────
  const signed = await requestSignature(useCase, file);

  // ── Step 2: Assemble the multipart form for Cloudinary ──────────────────
  //
  // For signed uploads, Cloudinary requires:
  //   - file           (the actual binary)
  //   - api_key        (your public API key)
  //   - signature      (sha1 hex of signed params + API secret)
  //   - timestamp      (used to compute & verify signature)
  //   - every param that was included in paramsToSign, verbatim
  //     (folder, tags, overwrite, type in our case)
  //
  // Order does not matter; multipart keys are read by name.
  // If any signed param is missing / altered, Cloudinary will return 401
  // "Invalid Signature".
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("signature", signed.signature);
  formData.append("timestamp", String(signed.timestamp));

  // Mirror every param the server signed. If server later adds eager
  // transforms, moderation flags, etc. to paramsToSign, those auto-flow here.
  for (const [k, v] of Object.entries(signed.paramsToSign)) {
    formData.append(k, String(v));
  }

  // ── Step 3: Upload directly to Cloudinary via XHR for progress ──────────
  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.secure_url, publicId: data.public_id });
        } catch {
          reject(new Error("Invalid response from Cloudinary."));
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error?.message) msg = data.error.message;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });

  return result;
}

/** Upload several files, reporting overall progress via onProgress(0–100). */
export async function uploadImagesToCloudinary(
  files: File[],
  onProgress?: (percent: number) => void,
  useCase: UseCase = "social_post",
): Promise<string[]> {
  const urls: string[] = [];
  let done = 0;
  for (const file of files) {
    const res = await uploadImageToCloudinary(file, (p) => {
      // approximate overall progress across the batch
      const overall = Math.round(((done + p / 100) / files.length) * 100);
      onProgress?.(overall);
    }, useCase);
    urls.push(res.url);
    done += 1;
  }
  onProgress?.(100);
  return urls;
}
