"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import { Gift, Loader2, LogIn, Sparkles } from "lucide-react";
import {
  serverGetMyPoints,
  serverGetActiveRewards,
  serverRedeemReward,
} from "@/lib/db-actions";
import { tierInfo } from "@/lib/rewards/tiers";

type Points = {
  total_points: number;
  lifetime_points: number;
  tier: string;
} | null;

type Transaction = {
  id: number;
  points: number;
  reason: string;
  note: string | null;
  created_at: string;
};

type Reward = {
  id: number;
  name_bn: string;
  name_en: string;
  desc_bn: string | null;
  desc_en: string | null;
  points_cost: number;
  category: string;
  stock: number;
};

export default function RewardsPage() {
  const locale = useLocale();
  const isBn = locale === "bn";
  const { user } = useAuthStore();
  const router = useRouter();
  const [points, setPoints] = useState<Points>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([serverGetMyPoints(), serverGetActiveRewards()])
      .then(([p, r]) => {
        if (!active) return;
        setPoints(p.points as Points);
        setTxns((p.transactions as Transaction[]) ?? []);
        setRewards(r as Reward[]);
      })
      .catch(() => {
        if (active) {
          setPoints(null);
          setRewards([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleRedeem(rewardId: number) {
    setRedeeming(rewardId);
    setMsg(null);
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(isBn ? "পুরস্কার রিডিম হয়েছে!" : "Reward redeemed!");
        const [p] = await Promise.all([serverGetMyPoints()]);
        setPoints(p.points as Points);
        setTxns((p.transactions as Transaction[]) ?? []);
      } else {
        setMsg(data.error || "Failed");
      }
    } catch {
      setMsg("Failed to redeem");
    } finally {
      setRedeeming(null);
    }
  }

  const tier = points ? tierInfo(points.lifetime_points) : null;
  const balance = points?.total_points ?? 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Gift className="w-7 h-7 text-emerald-600" />
            {isBn ? "পুরস্কার ও পয়েন্ট" : "Rewards & Points"}
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            {isBn
              ? "রক্তদানের পয়েন্ট জমিয়ে পুরস্কার রিডিম করুন"
              : "Earn points for donating and redeem them for rewards"}
          </p>

          {!user?.id ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LogIn className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                {isBn ? "লগইন প্রয়োজন" : "Login required"}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {isBn ? "লগইন করুন" : "Login"}
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {/* Points summary */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-80 mb-1">
                      {isBn ? "বর্তমান পয়েন্ট" : "Current Points"}
                    </div>
                    <div className="text-4xl font-bold">{balance}</div>
                  </div>
                  {tier && (
                    <div className="text-right">
                      <div className="text-sm opacity-80 mb-1">
                        {isBn ? "স্তর" : "Tier"}
                      </div>
                      <div className="text-2xl font-bold flex items-center gap-1.5 justify-end">
                        <Sparkles className="w-5 h-5" />
                        {isBn ? tier.label_bn : tier.label_en}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-sm opacity-80 mt-3">
                  {isBn ? "আজীবন অর্জিত" : "Lifetime earned"}:{" "}
                  {points?.lifetime_points ?? 0}
                </div>
              </div>

              {msg && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm">
                  {msg}
                </div>
              )}

              {/* Rewards catalog */}
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                {isBn ? "পুরস্কার ক্যাটালগ" : "Rewards Catalog"}
              </h2>
              {rewards.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  {isBn
                    ? "এই মুহূর্তে কোনো পুরস্কার নেই"
                    : "No rewards available right now"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {rewards.map((r) => {
                    const canAfford = balance >= r.points_cost;
                    const outOfStock = r.stock !== -1 && r.stock <= 0;
                    return (
                      <div
                        key={r.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-slate-900">
                            {isBn ? r.name_bn : r.name_en}
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                            {r.points_cost} pts
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 mb-4">
                          {isBn ? r.desc_bn : r.desc_en}
                        </div>
                        <button
                          onClick={() => handleRedeem(r.id)}
                          disabled={!canAfford || outOfStock || redeeming === r.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {redeeming === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : null}
                          {outOfStock
                            ? isBn ? "স্টক নেই" : "Out of stock"
                            : canAfford
                              ? isBn ? "রিডিম করুন" : "Redeem"
                              : isBn ? "পয়েন্ট কম" : "Not enough points"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Transaction history */}
              {txns.length > 0 && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">
                    {isBn ? "পয়েন্ট ইতিহাস" : "Points History"}
                  </h2>
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {txns.slice(0, 20).map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="text-sm font-medium text-slate-700 capitalize">
                            {t.reason.replace(/_/g, " ")}
                          </div>
                          {t.note && (
                            <div className="text-xs text-slate-400">{t.note}</div>
                          )}
                        </div>
                        <div
                          className={`text-sm font-bold ${t.points >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {t.points >= 0 ? "+" : ""}
                          {t.points}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}