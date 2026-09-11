"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverLogin } from "@/lib/auth/actions";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  MapPin,
  UserCog,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { saveSession } from "@/components/providers/AuthProvider";

const adminLoginSchema = z.object({
  identifier: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

const REMEMBERED_ADMIN_KEY = "bloodbank_remembered_admin";

type LoginScope = "" | "full" | "district";

export default function AdminLoginForm() {
  const t = useTranslations("auth");
  const tAdmin = useTranslations("admin_login");
  const router = useRouter();
  const { setUser, setRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginScope, setLoginScope] = useState<LoginScope>("");

  // Safe translation helper — next-intl returns "namespace.key" when missing
  const st = (key: string, fallback: string): string => {
    const val = tAdmin(key);
    // If next-intl returns the full key path, the translation is missing
    if (!val || val === `admin_login.${key}`) return fallback;
    return val;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_ADMIN_KEY);
      if (saved) {
        setValue("identifier", saved);
        setRememberMe(true);
      }
    } catch (e) {
      // ignore
    }
  }, [setValue]);

  const onSubmit = async (values: AdminLoginFormValues) => {
    setIsLoading(true);
    try {
      // "" (empty) means "auto" — intended for super-admin who should not
      // need to select anything. On the server, super_admin is accepted by
      // every scope path, so we just map "" -> "any" and let the server
      // handle the actual validation.
      const expectedAdminScope: "any" | "full" | "district" =
        loginScope === "" ? "any" : loginScope;

      const { user, redirectTo } = await serverLogin(
        values.identifier,
        values.password,
        rememberMe,
        expectedAdminScope,
      );

      // Reject non-admin roles on the admin login page (belt-and-braces:
      // serverLogin with expectedAdminScope !== 'any' already enforces this).
      if (user.role !== "admin" && user.role !== "super_admin") {
        toast.error(st("not_authorized", "Access denied. This login is for administrators only."));
        setIsLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_ADMIN_KEY, values.identifier);
      } else {
        localStorage.removeItem(REMEMBERED_ADMIN_KEY);
      }

      setUser(user as any);
      setRole(user.role);
      saveSession(user.email);

      toast.success(t("login_success") || "Login successful!");
      router.refresh();
      router.push(redirectTo);
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error(
        error?.message || "Login failed. Check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          {st("title", "Admin Panel")}
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          {st("subtitle", "Secure access for administrators only")}
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="admin-identifier"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {st("admin_email", "Admin Email")}
            </label>
            <input
              {...register("identifier")}
              id="admin-identifier"
              type="text"
              autoComplete="username"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900"
              placeholder="admin@trinomul.com"
            />
            {errors.identifier && (
              <p className="text-red-500 text-xs mt-1">
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* ── Login scope / role picker ── */}
          <div>
            <label
              htmlFor="admin-login-scope"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {st("login_as", "Login As")}
              <span className="text-slate-400 font-normal ml-1 text-xs">
                ({st("login_scope_optional", "Optional — leave empty for Super Admin")})
              </span>
            </label>
            <div className="relative">
              <select
                id="admin-login-scope"
                value={loginScope}
                onChange={(e) => setLoginScope(e.target.value as LoginScope)}
                disabled={isLoading}
                className="w-full appearance-none px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 bg-white"
              >
                <option value="">
                  🔓 {st("scope_auto", "Auto / Super Admin (no selection needed)")}
                </option>
                <option value="full">
                  🌐 {st("scope_full", "Full Admin")}
                </option>
                <option value="district">
                  📍 {st("scope_district", "Zila Admin (District)")}
                </option>
              </select>
              <UserCog className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {loginScope === "district" && (
              <p className="text-indigo-600 text-[11px] mt-1 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  {st("district_hint",
                    "After login you will only see donors, patients and requests for your assigned district.")}
                </span>
              </p>
            )}
            {loginScope === "full" && (
              <p className="text-indigo-600 text-[11px] mt-1 flex items-start gap-1">
                <ShieldCheck className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  {st("full_hint",
                    "Full access to all districts and features.")}
                </span>
              </p>
            )}
            {loginScope === "" && (
              <p className="text-purple-600 text-[11px] mt-1 flex items-start gap-1">
                <UserCog className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  {st("auto_hint",
                    "Use this if you are a Super Admin. Works without any selection.")}
                </span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {t("password")}
            </label>
            <div className="relative">
              <input
                {...register("password")}
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900"
                placeholder={t("password_placeholder")}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
              />
              <span className="text-sm text-slate-600">
                {t("remember_me") || "Remember me"}
              </span>
            </label>
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline font-medium transition-colors"
            >
              {t("forgot_password") || "Forgot Password?"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {st("signing_in", "Signing in...")}
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                {st("signin_button", "Sign In to Admin Panel")}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Dev test credentials — remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-xs">
          <p className="font-semibold text-slate-700 mb-1">
            🔧 Dev Test Credentials
          </p>
          <p className="text-slate-600">
            Email: <code className="text-slate-900">admin@trinomul.com</code>
          </p>
          <p className="text-slate-600">
            Password: <code className="text-slate-900">demo_hash</code>
          </p>
        </div>
      )}

      {/* Security note */}
      <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
        {st("security_note", "Unauthorized access is prohibited and logged. All actions are audited.")}
      </p>

      {/* Back to site */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-slate-500 hover:text-slate-900 hover:underline transition-colors"
        >
          ← {st("back_to_site", "Back to Website")}
        </button>
      </div>
    </div>
  );
}
