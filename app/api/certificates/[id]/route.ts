import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCertificatePg } from "@/lib/certificates/issue";
import { renderCertificateImage, type CertificateData } from "@/lib/certificates/template";

export const dynamic = "force-dynamic";

/** GET /api/certificates/[id] — serve the certificate PNG (generated on-demand). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid certificate id" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cert = await getCertificatePg(id);
  if (!cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }
  if (cert.revoked_at) {
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
  }

  const isOwner = Number(cert.donor_id) === Number(session.userId);
  const isAdmin = session.role === "admin" || session.role === "super_admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cert.file_url) {
    return NextResponse.redirect(cert.file_url, { status: 302 });
  }

  const metadata =
    typeof cert.metadata === "string"
      ? (JSON.parse(cert.metadata) as CertificateData)
      : (cert.metadata as CertificateData);

  if (!metadata?.certificateNumber) {
    return NextResponse.json({ error: "Certificate data missing" }, { status: 500 });
  }

  return renderCertificateImage(metadata);
}