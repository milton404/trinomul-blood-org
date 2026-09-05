"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverResetPassword } from "@/lib/auth/actions";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {t("reset_password_title")}
        </h2>
        <p className="text-sm text-red-600 mb-6">{t("reset_invalid")}</p>
        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back_to_login")}
        </button>
      </div>
    );
  }

  const getErrorMessage = (error: any): string => {
    if (!error) return "An unexpected error occurred";
    return error.message || "Reset failed. Please try again.";
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await serverResetPassword(token, values.password);
      setDone(true);
      toast.success(t("reset_success"));
      setTimeout(() => router.push("/login"), 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {t("reset_success")}
        </h2>
        <p className="text-sm text-slate-600">{t("back_to_login")}…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
        {t("reset_password_title")}
      </h2>
      <p className="text-sm text-slate-600 mb-6 text-center">
        {t("reset_password_subtitle")}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {t("new_password")}
          </label>
          <div className="relative">
            <input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder={t("new_password_placeholder")}
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {t("confirm_password")}
          </label>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder={t("confirm_password_placeholder")}
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              ...
            </>
          ) : (
            t("reset_button")
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back_to_login")}
        </button>
      </div>
    </div>
  );
}
