import AdminLoginForm from "@/components/auth/AdminLoginForm";

export const metadata = {
  title: "Admin Login — Trinomul Blood Bank",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <AdminLoginForm />
      </div>
    </div>
  );
}
