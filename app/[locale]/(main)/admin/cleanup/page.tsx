"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Database,
  Users,
  FileText,
  HeartPulse,
  Building2,
  Camera,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  serverGetDeactivatedProfiles,
  serverGetDeletedPosts,
  serverGetArchivedRequests,
  serverGetDeactivatedOrganizations,
  serverGetExpiredStories,
  serverPurgeProfiles,
  serverPurgePosts,
  serverPurgeRequests,
  serverPurgeOrganizations,
  serverPurgeStories,
  type DeactivatedProfile,
  type DeletedPost,
  type ArchivedRequest,
  type DeactivatedOrg,
  type ExpiredStory,
  type PurgeResult,
} from "@/lib/db-actions";

type Tab = "profiles" | "posts" | "requests" | "orgs" | "stories";

export default function AdminCleanupPage() {
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState<Tab>("profiles");
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [profiles, setProfiles] = useState<DeactivatedProfile[]>([]);
  const [posts, setPosts] = useState<DeletedPost[]>([]);
  const [requests, setRequests] = useState<ArchivedRequest[]>([]);
  const [orgs, setOrgs] = useState<DeactivatedOrg[]>([]);
  const [stories, setStories] = useState<ExpiredStory[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, ps, r, o, s] = await Promise.allSettled([
        serverGetDeactivatedProfiles(),
        serverGetDeletedPosts(),
        serverGetArchivedRequests(),
        serverGetDeactivatedOrganizations(),
        serverGetExpiredStories(),
      ]);
      if (p.status === "fulfilled") setProfiles(p.value);
      if (ps.status === "fulfilled") setPosts(ps.value);
      if (r.status === "fulfilled") setRequests(r.value);
      if (o.status === "fulfilled") setOrgs(o.value);
      if (s.status === "fulfilled") setStories(s.value);
    } catch (err) {
      console.error("Cleanup load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSelected(new Set());
  }, [activeTab]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const items = getCurrentItems();
    setSelected(new Set(items.map((i) => i.id)));
  };

  const selectNone = () => setSelected(new Set());

  const getCurrentItems = () => {
    switch (activeTab) {
      case "profiles": return profiles;
      case "posts": return posts;
      case "requests": return requests;
      case "orgs": return orgs;
      case "stories": return stories;
    }
  };

  const handlePurge = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setPurging(true);
    try {
      let result: PurgeResult;
      switch (activeTab) {
        case "profiles":
          result = await serverPurgeProfiles(ids);
          break;
        case "posts":
          result = await serverPurgePosts(ids);
          break;
        case "requests":
          result = await serverPurgeRequests(ids);
          break;
        case "orgs":
          result = await serverPurgeOrganizations(ids);
          break;
        case "stories":
          result = await serverPurgeStories(ids);
          break;
      }
      if (result.errors.length > 0) {
        result.errors.forEach((e) => toast.error(e));
      }
      toast.success(t("cleanup_purged_count", { purged: result.purged, skipped: result.skipped }));
      setSelected(new Set());
      await loadData();
    } catch (err: any) {
      console.error("Purge failed:", err);
      toast.error(err?.message || t("cleanup_purge_error"));
    } finally {
      setPurging(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: "profiles", label: t("cleanup_tab_profiles"), icon: Users, count: profiles.length },
    { key: "posts", label: t("cleanup_tab_posts"), icon: FileText, count: posts.length },
    { key: "requests", label: t("cleanup_tab_requests"), icon: HeartPulse, count: requests.length },
    { key: "orgs", label: t("cleanup_tab_orgs"), icon: Building2, count: orgs.length },
    { key: "stories", label: t("cleanup_tab_stories"), icon: Camera, count: stories.length },
  ];

  const currentItems = getCurrentItems();
  const totalCount = profiles.length + posts.length + requests.length + orgs.length + stories.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("cleanup_title")}</h1>
          <p className="text-sm text-slate-500">{t("cleanup_desc")}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">{t("cleanup_warning_title")}</p>
          <p>{t("cleanup_warning_body")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p>{t("cleanup_donation_protection")}</p>
        </div>
      </div>

      {totalCount === 0 && !loading && (
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-700">{t("cleanup_nothing_to_clean")}</p>
        </div>
      )}

      {totalCount > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key ? "bg-white/20" : "bg-red-100 text-red-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={selected.size === currentItems.length ? selectNone : selectAll}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
                >
                  {selected.size === currentItems.length && currentItems.length > 0
                    ? t("cleanup_deselect_all")
                    : t("cleanup_select_all")}
                </button>
                {selected.size > 0 && (
                  <span className="text-sm text-slate-500">
                    {selected.size} {t("cleanup_selected")}
                  </span>
                )}
              </div>
              {selected.size > 0 && (
                <button
                  onClick={handlePurge}
                  disabled={purging}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t("cleanup_purge_selected")}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
                <p className="text-sm text-slate-400">{t("cleanup_tab_empty")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left w-10"></th>
                      {activeTab === "profiles" && (
                        <>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Role</th>
                          <th className="px-4 py-3 text-left">Blood</th>
                          <th className="px-4 py-3 text-left">Location</th>
                          <th className="px-4 py-3 text-center">Donations</th>
                          <th className="px-4 py-3 text-left">Updated</th>
                        </>
                      )}
                      {activeTab === "posts" && (
                        <>
                          <th className="px-4 py-3 text-left">Author</th>
                          <th className="px-4 py-3 text-left">Content</th>
                          <th className="px-4 py-3 text-center">Images</th>
                          <th className="px-4 py-3 text-left">Created</th>
                        </>
                      )}
                      {activeTab === "requests" && (
                        <>
                          <th className="px-4 py-3 text-left">Tracking</th>
                          <th className="px-4 py-3 text-left">Patient</th>
                          <th className="px-4 py-3 text-left">Blood</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Reason</th>
                          <th className="px-4 py-3 text-center">Units</th>
                          <th className="px-4 py-3 text-left">Archived</th>
                        </>
                      )}
                      {activeTab === "orgs" && (
                        <>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Created</th>
                        </>
                      )}
                      {activeTab === "stories" && (
                        <>
                          <th className="px-4 py-3 text-left">Author</th>
                          <th className="px-4 py-3 text-left">Created</th>
                          <th className="px-4 py-3 text-left">Expired</th>
                          <th className="px-4 py-3 text-center">Views</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTab === "profiles" && profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.full_name_en || p.full_name_bn || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.email}</td>
                        <td className="px-4 py-3 text-slate-600">{p.role}</td>
                        <td className="px-4 py-3 text-slate-600">{p.blood_group || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{[p.district, p.upazila].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {p.donation_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {p.donation_count}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{p.updated_at?.slice(0, 10) || "—"}</td>
                      </tr>
                    ))}
                    {activeTab === "posts" && posts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.author_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{p.content_preview || "(blanked)"}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{p.images_count}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{p.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {activeTab === "requests" && requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.tracking_code}</td>
                        <td className="px-4 py-3 text-slate-600">{r.patient_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{r.blood_group}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{r.archive_reason || "—"}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{r.units_needed}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{r.archived_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {activeTab === "orgs" && orgs.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggleSelect(o.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{o.name_en || o.name_bn || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{o.email || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{o.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {activeTab === "stories" && stories.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.author_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{s.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{s.expires_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{s.views_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {activeTab === "profiles" && profiles.some((p) => p.donation_count > 0) && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">{t("cleanup_donation_warning_title")}</p>
                <p>{t("cleanup_donation_warning_body")}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}