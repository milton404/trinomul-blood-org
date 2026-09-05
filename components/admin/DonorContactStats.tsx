"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Phone, MessageCircle, MousePointerClick, Users, Loader2 } from "lucide-react";
import { serverGetDonorContactClickStats } from "@/lib/db-actions";

interface DonorContactStatsProps {
  donorId: number;
}

export default function DonorContactStats({ donorId }: DonorContactStatsProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [stats, setStats] = useState<{
    totalCall: number;
    totalWhatsapp: number;
    totalClicks: number;
    uniqueClickers: number;
    recentClicks: Array<{
      id: number;
      button_type: string;
      clicker_ip: string | null;
      clicker_user_id: number | null;
      clicker_user_name: string | null;
      created_at: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    serverGetDonorContactClickStats(donorId)
      .then((result) => {
        if (active) setStats(result);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [donorId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!stats || stats.totalClicks === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
          <MousePointerClick className="w-5 h-5 text-slate-400" />
          {isBn ? "যোগাযোগের পরিসংখ্যান" : "Contact Click Stats"}
        </h2>
        <p className="text-sm text-slate-500">
          {isBn ? "এখনও কোনো যোগাযোগের ক্লিক নেই" : "No contact clicks yet"}
        </p>
      </div>
    );
  }

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
      return d.toLocaleString(isBn ? "bn-BD" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
        <MousePointerClick className="w-5 h-5 text-emerald-600" />
        {isBn ? "যোগাযোগের পরিসংখ্যান" : "Contact Click Stats"}
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <Phone className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-red-700">{stats.totalCall}</div>
          <div className="text-[10px] text-red-600 font-medium uppercase tracking-wider">
            {isBn ? "কল" : "Calls"}
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <MessageCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-green-700">{stats.totalWhatsapp}</div>
          <div className="text-[10px] text-green-600 font-medium uppercase tracking-wider">
            {isBn ? "হোয়াটসঅ্যাপ" : "WhatsApp"}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <MousePointerClick className="w-5 h-5 text-slate-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-slate-700">{stats.totalClicks}</div>
          <div className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">
            {isBn ? "মোট" : "Total"}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-indigo-700">{stats.uniqueClickers}</div>
          <div className="text-[10px] text-indigo-600 font-medium uppercase tracking-wider">
            {isBn ? "অনন্য" : "Unique"}
          </div>
        </div>
      </div>

      {/* Recent clicks table */}
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        {isBn ? "সাম্প্রতিক ক্লিক" : "Recent Clicks"}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-3 font-medium">{isBn ? "বোতাম" : "Button"}</th>
              <th className="py-2 pr-3 font-medium">{isBn ? "ব্যবহারকারী" : "User"}</th>
              <th className="py-2 pr-3 font-medium">IP</th>
              <th className="py-2 font-medium">{isBn ? "সময়" : "Time"}</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentClicks.map((click) => (
              <tr key={click.id} className="border-b border-slate-50">
                <td className="py-2 pr-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    click.button_type === "call"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {click.button_type === "call" ? <Phone className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                    {click.button_type === "call" ? (isBn ? "কল" : "Call") : "WhatsApp"}
                  </span>
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {click.clicker_user_name ? (
                    <span className="font-medium">{click.clicker_user_name}</span>
                  ) : click.clicker_user_id ? (
                    <span className="text-slate-500">#{click.clicker_user_id}</span>
                  ) : (
                    <span className="text-slate-400 italic">{isBn ? "অতিথি" : "Guest"}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-slate-500 font-mono text-[10px]">
                  {click.clicker_ip || "—"}
                </td>
                <td className="py-2 text-slate-500">{formatTime(click.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}