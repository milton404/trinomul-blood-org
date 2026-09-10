"use client";

import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { serverGetMyAdminContext } from "@/lib/db-actions";
import { RANGPUR_DISTRICTS } from "@/lib/constants/rangpur";
import {
  LayoutDashboard,
  Users,
  Hospital,
  HeartPulse,
  Droplets,
  Handshake,
  Mail,
  PenLine,
  Building2,
  BarChart3,
  Sparkles,
  ScrollText,
  ShieldCheck,
  Settings,
  LogOut,
  ExternalLink,
  X,
  Heart,
  UserPlus,
  Trophy,
  DatabaseBackup,
} from "lucide-react";
import { serverLogout } from "@/lib/auth/actions";
import { toast } from "sonner";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Only visible to main admins (super_admin / full admin). */
  fullAdminOnly?: boolean;
}

const navGroups: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "nav_main",
    items: [
      { href: "/admin/dashboard", labelKey: "dashboard_overview", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "nav_management",
    items: [
      { href: "/admin/users", labelKey: "users_management", icon: Users },
      { href: "/admin/donors", labelKey: "donor_management", icon: Droplets },
      { href: "/admin/hospitals", labelKey: "hospitals", icon: Hospital },
      { href: "/admin/blood-requests", labelKey: "requests_management", icon: HeartPulse },
      { href: "/admin/donations", labelKey: "donations_management", icon: Droplets },
      { href: "/admin/donor-matches", labelKey: "nav_donor_matches", icon: Handshake },
      { href: "/admin/email", labelKey: "nav_email_center", icon: Mail },
      { href: "/admin/email/templates", labelKey: "nav_email_templates", icon: PenLine },
      { href: "/admin/verifications", labelKey: "nav_verifications", icon: ShieldCheck },
      { href: "/admin/donor-applications", labelKey: "nav_donor_applications", icon: UserPlus },
      { href: "/admin/top-donors", labelKey: "top_donors", icon: Droplets },
      { href: "/admin/top-referrers", labelKey: "top_referrers", icon: Trophy },
      { href: "/admin/organizations", labelKey: "nav_organizations", icon: Building2 },
      { href: "/admin/saved-patients", labelKey: "saved_patients", icon: Heart },
      { href: "/admin/social", labelKey: "social_management", icon: Users },
      { href: "/admin/contact-messages", labelKey: "nav_contact_messages", icon: Mail },
    ],
  },
  {
    titleKey: "nav_insights",
    items: [
      { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
      { href: "/admin/ai-insights", labelKey: "ai_insights", icon: Sparkles },

      { href: "/admin/activity-log", labelKey: "activity_log", icon: ScrollText, fullAdminOnly: true },
    ],
  },
  {
    titleKey: "nav_system",
    items: [
      { href: "/admin/manage-admins", labelKey: "manage_admins", icon: ShieldCheck, fullAdminOnly: true },
      { href: "/admin/settings", labelKey: "settings", icon: Settings, fullAdminOnly: true },
      { href: "/admin/backup", labelKey: "backup", icon: DatabaseBackup, fullAdminOnly: true },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [ctx, setCtx] = useState<{
    isFullAdmin: boolean;
    isDistrictAdmin: boolean;
    assignedDistrict: string | null;
  } | null>(null);

  useEffect(() => {
    serverGetMyAdminContext()
      .then((c) => setCtx(c))
      .catch(() => setCtx(null));
  }, []);

  const districtEntry = ctx?.assignedDistrict
    ? RANGPUR_DISTRICTS.find(
        (d) =>
          d.id === ctx.assignedDistrict!.toLowerCase() ||
          d.name_en.toLowerCase() === ctx.assignedDistrict!.toLowerCase(),
      )
    : null;
  const districtLabel = districtEntry
    ? locale === "bn"
      ? districtEntry.name_bn
      : districtEntry.name_en
    : ctx?.assignedDistrict;

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.fullAdminOnly || ctx?.isFullAdmin,
      ),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    try {
      await serverLogout();
      toast.success(t("nav_logged_out"));
      router.push("/admin/login");
    } catch {
      toast.error(t("nav_logout_error"));
    }
  };

  const isActive = (href: string) => {
    const cleanPath = pathname.replace(/^\/(en|bn)/, "");
    return cleanPath === href || (href !== "/admin/dashboard" && cleanPath.startsWith(href));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 flex-shrink-0">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {t("nav_admin_panel")}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                Trinomul Blood Bank
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        {/* District admin badge */}
        {ctx?.isDistrictAdmin && districtLabel && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
              {t("nav_district_admin") || "District Admin"}
            </p>
            <p className="text-sm font-bold text-indigo-800">{districtLabel}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.titleKey}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t(group.titleKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-200 flex-shrink-0 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>{t("nav_back_to_site")}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>{t("nav_logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
