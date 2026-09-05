"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverRegister } from "@/lib/auth/actions";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check, X, Droplet, User, Mail, Phone, Shield } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { saveSession } from "@/components/providers/AuthProvider";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  role: z.enum(["donor", "patient", "hospital"], {
    message: "Please select a role",
  }),
  agreeTerms: z.boolean().refine((v) => v === true, {
    message: "You must agree to the terms",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  /** Pre-selected role from the registration entry point (e.g. ?role=donor). */
  defaultRole?: string;
}

export default function RegisterForm({ defaultRole }: RegisterFormProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { setUser, setRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [prefilledData, setPrefilledData] = useState<{ fullName?: string; phone?: string; bloodGroup?: string }>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestData = urlParams.get('requestData');
    if (requestData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(requestData));
        setPrefilledData(parsedData);
      } catch (error) {
        console.error('Error parsing request data:', error);
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: (defaultRole as RegisterFormValues["role"]) || "",
      fullName: prefilledData.fullName || "",
      phone: prefilledData.phone || "",
      agreeTerms: false,
    },
  });

  const password = watch("password", "");

  const passwordStrength = useMemo(() => {
    if (!password)
      return {
        score: 0,
        label: "",
        color: "",
        checks: {
          length: false,
          lowercase: false,
          uppercase: false,
          number: false,
          special: false,
        },
      };

    let score = 0;
    const checks = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 2) {
      return { score, label: t("password_weak"), color: "bg-red-500", checks };
    } else if (score <= 3) {
      return {
        score,
        label: t("password_medium"),
        color: "bg-yellow-500",
        checks,
      };
    } else {
      return {
        score,
        label: t("password_strong"),
        color: "bg-green-500",
        checks,
      };
    }
  }, [password, t]);

  const roleOptions = [
    { value: "patient", labelKey: "patient" },
    { value: "donor", labelKey: "donor" },
    { value: "hospital", labelKey: "hospital" },
  ];

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate phone number format
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!phoneRegex.test(values.phone)) {
        throw new Error("Please enter a valid Bangladesh phone number");
      }

      // Validate password strength
      if (values.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // serverRegister hashes the password with bcrypt and issues a JWT
      // session cookie server-side. No plaintext password is stored.
      const { user: newUser, redirectTo } = await serverRegister({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone,
        role: values.role,
      });

      setUser(newUser as any);
      setRole(newUser.role);
      saveSession(newUser.email);

      toast.success(t("success") || "Registration successful!", {
        description:
          newUser.role === "donor"
            ? "⚠ You must complete your profile (blood group, gender, location) before you appear in the donor list. Redirecting to profile..."
            : newUser.role === "hospital"
              ? "⚠ You must complete your hospital profile (name, location, address) to be verified. Redirecting to profile..."
              : "⚠ You must complete your profile to access all features. Redirecting to profile...",
        action: {
          label: "Complete Profile",
          onClick: () => router.push("/profile"),
        },
      });
      router.push(redirectTo);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-4 py-3 rounded-xl border transition-all outline-none ${
      hasError
        ? "border-red-400 focus:ring-2 focus:ring-red-500"
        : "border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
    }`;

  return (
    <div className="w-full max-w-md mx-auto p-5 sm:p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="flex flex-col items-center mb-5">

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1.5 text-center">
          {t("register_title")}
        </h2>
        <p className="text-sm text-slate-500 text-center max-w-sm mx-auto leading-relaxed">
          রোগী, রক্তদাতা বা হাসপাতাল হিসেবে নিবন্ধন করে রক্তের অনুরোধ, দান ও
          পরিচালনার সেবা ব্যবহার করুন।
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name")} <span className="text-red-500">*</span>
          </label>
          <input
            {...register("fullName")}
            className={inputCls(!!errors.fullName)}
            placeholder={t("name_placeholder")}
          />
          {errors.fullName && (
            <p className="text-red-500 text-xs mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("email")} <span className="text-red-500">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className={inputCls(!!errors.email)}
            placeholder={t("email_placeholder")}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("phone_number")} <span className="text-red-500">*</span>
          </label>
          <input
            {...register("phone")}
            className={inputCls(!!errors.phone)}
            placeholder={t("phone_placeholder")}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("register_as")} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((option) => {
              const isSelected = watch("role") === option.value;
              const icons: Record<string, typeof User> = { patient: User, donor: Droplet, hospital: Shield };
              const Icon = icons[option.value] || User;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue("role", option.value as RegisterFormValues["role"])}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {t(option.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p className="text-red-500 text-xs mt-1">
              {errors.role.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("create_password")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className={`${inputCls(!!errors.password)} pr-12`}
              placeholder={t("password_placeholder")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          {password && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      passwordStrength.score >= i
                        ? passwordStrength.color
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t("password_min_length")}
                </span>
                <span
                  className={`text-xs font-medium ${
                    passwordStrength.score <= 2
                      ? "text-red-500"
                      : passwordStrength.score <= 3
                        ? "text-yellow-500"
                        : "text-green-500"
                  }`}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  {passwordStrength.checks?.length ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <X className="w-3 h-3 text-slate-300" />
                  )}
                  <span>{t("password_check_length")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordStrength.checks?.uppercase ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <X className="w-3 h-3 text-slate-300" />
                  )}
                  <span>{t("password_check_uppercase")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordStrength.checks?.lowercase ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <X className="w-3 h-3 text-slate-300" />
                  )}
                  <span>{t("password_check_lowercase")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordStrength.checks?.number ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <X className="w-3 h-3 text-slate-300" />
                  )}
                  <span>{t("password_check_number")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register("agreeTerms")}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              {t("agree_terms")}{" "}
              <Link href="/terms" className="text-red-600 hover:underline font-medium">
                {t("terms_link")}
              </Link>{" "}
              {t("and_word")}{" "}
              <Link href="/privacy" className="text-red-600 hover:underline font-medium">
                {t("privacy_link")}
              </Link>
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="text-red-500 text-xs mt-1">
              {errors.agreeTerms.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            tCommon("register")
          )}
        </button>
      </form>
    </div>
  );
}
