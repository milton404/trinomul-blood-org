"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverLogin } from "@/lib/auth/actions";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff, User, Lock,
  Droplet, Heart, Hospital, Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { saveSession } from "@/components/providers/AuthProvider";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const REMEMBERED_IDENTIFIER_KEY = "bloodbank_remembered_identifier";

export default function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Pre-fill only the identifier (never the password) when "remember me" was
  // previously checked. The password is never stored client-side.
  useEffect(() => {
    try {
      const savedIdentifier = localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
      if (savedIdentifier) {
        setValue("identifier", savedIdentifier);
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved identifier:", error);
    }
  }, [setValue]);

  const getErrorMessage = (error: any): string => {
    if (!error) return "An unexpected error occurred";
    return error.message || "Login failed. Please try again.";
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      const { user, redirectTo } = await serverLogin(
        values.identifier,
        values.password,
        rememberMe,
      );

      // Persist only the identifier for next time (no password).
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, values.identifier);
      } else {
        localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      }

      setUser(user as any);
      setRole(user.role);
      saveSession(user.email);

      toast.success(t("login_success") || "Login successful!");
      // If a redirect target was passed (e.g. from feed page), return there.
      const redirectParam = searchParams.get("redirect");
      router.push(redirectParam || redirectTo);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
        {t("login_title")}
      </h2>
      <p className="text-sm text-slate-500 text-center mb-4 max-w-sm mx-auto">
        রোগী, রক্তদাতা ও হাসপাতাল — আপনার অ্যাকাউন্টে প্রবেশ করে রক্তের অনুরোধ,
        দান বা পরিচালনার কাজ চালিয়ে যান।
      </p>
      <hr className="border-slate-100 mb-6" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("register_as") || "Register As"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "patient", labelKey: "patient", Icon: User },
              { value: "donor", labelKey: "donor", Icon: Droplet },
              { value: "hospital", labelKey: "hospital", Icon: Hospital },
            ].map(({ value, labelKey, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRole(value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                  selectedRole === value
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">
                  {t(labelKey) || value}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>

          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {t("email")} / {t("phone_number")}
          </label>
          <div className="relative">
            <input
              {...register("identifier")}
              id="identifier"
              type="text"
              autoComplete="username"
              disabled={isLoading}
              className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder={
                t("email_or_phone_placeholder") ||
                "your@email.com or 01XXXXXXXXX"
              }
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          {errors.identifier && (
            <p className="text-red-500 text-xs mt-1">
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {t("password")}
          </label>
          <div className="relative">
            <input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder={t("password_placeholder")}
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-slate-600">
              {t("remember_me") || "Remember me"}
            </span>
          </label>
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium transition-colors"
          >
            {t("forgot_password") || "Forgot Password?"}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            tCommon("login")
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-center text-sm text-slate-600 mb-3 flex items-center justify-center gap-2">
          {t("no_account") || "Don't have an account?"}
          <Link
            href="/register"
            className="inline-block bg-slate-900 text-white py-1.5 px-4 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all"
          >
            রেজিস্টার করুন
          </Link>
        </p>
      </div>

      {/* Demo Accounts — dev testing only */}
      <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
        <div className="flex items-center gap-1.5 mb-3 justify-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Demo Accounts
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
            demo1234
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <DemoAccountButton
            icon={<Droplet className="w-4 h-4 text-red-500" />}
            label="Donor"
            labelBn="রক্তদাতা"
            email="demo.donor@trinomul.com"
            password="demo1234"
            onFill={() => {
              setValue("identifier", "demo.donor@trinomul.com");
              setValue("password", "demo1234");
            }}
          />
          <DemoAccountButton
            icon={<Heart className="w-4 h-4 text-pink-500" />}
            label="Patient"
            labelBn="রোগী"
            email="demo.patient@trinomul.com"
            password="demo1234"
            onFill={() => {
              setValue("identifier", "demo.patient@trinomul.com");
              setValue("password", "demo1234");
            }}
          />
          <DemoAccountButton
            icon={<Hospital className="w-4 h-4 text-blue-500" />}
            label="Hospital"
            labelBn="হাসপাতাল"
            email="demo.hospital@trinomul.com"
            password="demo1234"
            onFill={() => {
              setValue("identifier", "demo.hospital@trinomul.com");
              setValue("password", "demo1234");
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DemoAccountButton({
  icon,
  label,
  labelBn,
  email,
  password,
  onFill,
}: {
  icon: React.ReactNode;
  label: string;
  labelBn: string;
  email: string;
  password: string;
  onFill: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFill}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left group"
    >
      <span className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-slate-700">
          {label}{" "}
          <span className="text-slate-400 font-normal">· {labelBn}</span>
        </span>
        <span className="block text-[10px] text-slate-400 truncate font-mono">
          {email}
        </span>
      </span>
      <span className="shrink-0 text-[10px] text-slate-400 group-hover:text-red-600 font-semibold transition-colors">
        Fill →
      </span>
    </button>
  );
}
