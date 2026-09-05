"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverRequestPasswordReset } from "@/lib/auth/actions";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, User, Copy, ArrowLeft } from "lucide-react";

const schema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const getErrorMessage = (error: any): string => {
    if (!error) return "An unexpected error occurred";
    return error.message || "Reset request failed. Please try again.";
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setIssuedToken(null);
    try {
      const token = await serverRequestPasswordReset(values.identifier);
      // Always show the generic success message to avoid user enumeration.
      // In development, surface the token so the flow can be tested end-to-end.
      if (token) {
        setIssuedToken(token);
        toast.success(t("reset_requested"));
      } else {
        // Account not found — still show the same message to avoid leaking
        // which identifiers have accounts.
        toast.success(t("reset_requested"));
      }
    } catch (error: any) {
      console.error("Password reset request error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToken = async () => {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken);
      toast.success(t("reset_token_copied"));
    } catch {
      // Clipboard may be blocked; ignore silently.
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
        {t("forgot_password_title")}
      </h2>
      <p className="text-sm text-slate-600 mb-6 text-center">
        {t("forgot_password_subtitle")}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {t("identifier_label")}
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
            t("request_reset_button")
          )}
        </button>
      </form>

      {issuedToken && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-900 mb-2">
            {t("reset_token_label")}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-amber-900 bg-white border border-amber-200 rounded-lg px-3 py-2 break-all">
              {issuedToken}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="p-2 bg-white border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
              aria-label="Copy reset token"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(`/reset-password?token=${issuedToken}`)
            }
            className="mt-3 w-full text-sm text-amber-900 underline hover:text-amber-700"
          >
            {t("reset_password_title")} →
          </button>
        </div>
      )}

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
