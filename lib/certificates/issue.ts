import { query as pgQuery } from "@/lib/supabase/client";
import type { CertificateData } from "./template";

export type CertificateRow = {
  id: number;
  donation_id: number;
  donor_id: number;
  certificate_number: string;
  file_url: string | null;
  file_type: string;
  metadata: CertificateData;
  revoked_at: string | null;
  created_at: string;
};

function formatCertificateNumber(seq: number): string {
  const year = new Date().getUTCFullYear();
  return `TBB-CERT-${year}-${String(seq).padStart(5, "0")}`;
}

/** Atomically allocate the next certificate number via site_settings. */
async function nextCertificateNumberPg(): Promise<string> {
  const { rows } = await pgQuery<{ value: string }>(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ('certificate_seq', '1', NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = (CAST(site_settings.value AS INTEGER) + 1)::TEXT,
           updated_at = NOW()
     RETURNING value`,
  );
  const seq = Number(rows[0]?.value ?? 1);
  return formatCertificateNumber(seq);
}

/**
 * Issue a certificate for a donation. Fetches donation + donor data, snapshots
 * it into metadata (so the certificate is stable even if the donor later
 * renames themselves), and inserts the row. Best-effort — failures are logged
 * and swallowed by the caller so donation creation never breaks.
 */
export async function issueCertificateForDonationPg(
  donationId: number,
  issuedBy?: number,
): Promise<number | null> {
  const { rows } = await pgQuery<{
    id: number;
    donor_id: number;
    blood_group: string;
    units: number;
    hospital_name: string | null;
    donation_date: string;
    donation_type: string;
    full_name: string;
    district: string | null;
  }>(
    `SELECT d.id, d.donor_id, d.blood_group, d.units, d.hospital_name,
            d.donation_date::TEXT AS donation_date, d.donation_type,
            p.full_name, p.district
     FROM donations d
     JOIN profiles p ON p.id = d.donor_id
     WHERE d.id = $1`,
    [donationId],
  );
  if (rows.length === 0) return null;

  const d = rows[0];
  const certificateNumber = await nextCertificateNumberPg();
  const metadata: CertificateData = {
    certificateNumber,
    donorName: d.full_name || "Donor",
    bloodGroup: d.blood_group,
    units: Number(d.units ?? 1),
    donationType: d.donation_type || "whole_blood",
    hospitalName: d.hospital_name,
    donationDate: d.donation_date,
    donorDistrict: d.district,
  };

  const { rows: ins } = await pgQuery<{ id: number }>(
    `INSERT INTO donation_certificates
       (donation_id, donor_id, certificate_number, file_type, metadata, issued_by)
     VALUES ($1, $2, $3, 'png', $4::jsonb, $5)
     RETURNING id`,
    [donationId, d.donor_id, certificateNumber, JSON.stringify(metadata), issuedBy ?? null],
  );
  return ins[0]?.id ?? null;
}

/** Fetch a certificate row by id (for serving/generating the image). */
export async function getCertificatePg(id: number): Promise<CertificateRow | null> {
  const { rows } = await pgQuery<CertificateRow>(
    `SELECT id, donation_id, donor_id, certificate_number, file_url, file_type,
            metadata, revoked_at, created_at
     FROM donation_certificates WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** List a donor's non-revoked certificates (newest first). */
export async function getDonorCertificatesPg(donorId: number): Promise<CertificateRow[]> {
  const { rows } = await pgQuery<CertificateRow>(
    `SELECT id, donation_id, donor_id, certificate_number, file_url, file_type,
            metadata, revoked_at, created_at
     FROM donation_certificates
     WHERE donor_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [donorId],
  );
  return rows;
}

/** Revoke a certificate (e.g. when its donation is reversed). Keeps the row. */
export async function revokeCertificatePg(
  donationId: number,
): Promise<number> {
  const { rowCount } = await pgQuery(
    `UPDATE donation_certificates SET revoked_at = NOW() WHERE donation_id = $1 AND revoked_at IS NULL`,
    [donationId],
  );
  return rowCount ?? 0;
}