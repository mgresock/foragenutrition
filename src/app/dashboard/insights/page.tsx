"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { computeTargets, goalFromGoals } from "@/lib/nutrition";

interface DayStat { date: string; cals: number; protein: number; meals: number; }

const ACHIEVEMENTS: { id: string; icon: IconName; label: string; test: (s: Stats) => boolean }[] = [
  { id: "first_log", icon: "meal", label: "First Log", test: (s: Stats) => s.totalMeals >= 1 },
  { id: "streak7", icon: "flame", label: "7-Day Streak", test: (s: Stats) => s.streak >= 7 },
  { id: "streak30", icon: "bolt", label: "30-Day Streak", test: (s: Stats) => s.streak >= 30 },
  { id: "meals100", icon: "trophy", label: "100 Meals", test: (s: Stats) => s.totalMeals >= 100 },
  { id: "protein", icon: "dumbbell", label: "Protein Beast", test: (s: Stats) => s.proteinHitDays >= 7 },
  { id: "consistent", icon: "chart", label: "Consistent", test: (s: Stats) => s.adherence >= 80 },
  { id: "weighin", icon: "scale", label: "Weigh-In", test: (s: Stats) => s.weighIns >= 1 },
  { id: "weighin5", icon: "target", label: "Tracking Trend", test: (s: Stats) => s.weighIns >= 5 },
];

interface Stats {
  streak: number; totalMeals: number; avgProtein: number; avgCals: number;
  adherence: number; proteinHitDays: number; weighIns: number;
  weightFirst: number | null; weightLast: number | null; spend: number;
}

export default function InsightsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayStat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [proteinTarget, setProteinTarget] = useState(160);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date(Date.now() - 84 * 86400000).toISOString();

      const [{ data: logs }, { data: ob }] = await Promise.all([
        supabase.from("meal_logs").select("calories, protein_g, logged_at").eq("user_id", user.id).gte("logged_at", since).order("logged_at", { ascending: true }).limit(3000),
        supabase.from("onboarding").select("*").eq("user_id", user.id).single(),
      ]);

      // graceful optional reads
      let weights: { logged_at: string; weight_kg: number }[] = [];
      try { const { data } = await supabase.from("weight_logs").select("logged_at, weight_kg").eq("user_id", user.id).gte("logged_at", since).order("logged_at", { ascending: true }).limit(200); weights = (data as typeof weights) ?? []; } catch { /* table may not exist */ }
      let spend = 0;
      try { const { data } = await supabase.from("receipts").select("total").eq("user_id", user.id).gte("scanned_at", since).limit(500); spend = (data ?? []).reduce((s: number, r: { total?: number }) => s + (r.total ?? 0), 0); } catch { /* */ }

      const o = ob as Record<string, unknown> | null;
      const target = o ? computeTargets({ sex: o.sex as string, age: o.age as number, height_cm: o.height_cm as number, weight_kg: o.weight_kg as number, activity: o.activity_level as string, goal: goalFromGoals(o.goals) }) : null;
      const pTarget = (o?.protein_target as number) || target?.protein_g || 160;
      setProteinTarget(pTarget);

      // bucket by day
      const byDay = new Map<string, { cals: number; protein: number; meals: number }>();
      for (const l of logs ?? []) {
        const d = l.logged_at.split("T")[0];
        const cur = byDay.get(d) ?? { cals: 0, protein: 0, meals: 0 };
        cur.cals += l.calories ?? 0; cur.protein += l.protein_g ?? 0; cur.meals += 1;
        byDay.set(d, cur);
      }
      const dayArr: DayStat[] = [...byDay.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
      setDays(dayArr);

      const loggedDays = dayArr.length;
      const proteinHitDays = dayArr.filter((d) => d.protein >= pTarget * 0.9).length;
      const avgProtein = loggedDays ? Math.round(dayArr.reduce((s, d) => s + d.protein, 0) / loggedDays) : 0;
      const avgCals = loggedDays ? Math.round(dayArr.reduce((s, d) => s + d.cals, 0) / loggedDays) : 0;

      // streak (consecutive days up to today)
      const dateSet = new Set(dayArr.map((d) => d.date));
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const dd = new Date(); dd.setDate(dd.getDate() - i);
        if (dateSet.has(dd.toISOString().split("T")[0])) streak++; else break;
      }

      setStats({
        streak, totalMeals: (logs ?? []).length, avgProtein, avgCals,
        adherence: loggedDays ? Math.round((proteinHitDays / loggedDays) * 100) : 0,
        proteinHitDays, weighIns: weights.length,
        weightFirst: weights[0]?.weight_kg ?? null, weightLast: weights[weights.length - 1]?.weight_kg ?? null,
        spend: Math.round(spend),
      });
      setLoading(false);
    })();
  }, [supabase]);

  if (loading || !stats) return <div className="flex items-center justify-center py-32"><ForageSpinner size={32} /></div>;

  if (stats.totalMeals === 0) {
    return (
      <div className="px-5 sm:px-8 py-8 pb-24 lg:pb-8 max-w-5xl">
        <p className="text-lime text-xs font-mono uppercase tracking-[0.2em] mb-1.5">12-Week Window</p>
        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-[0.95] text-text-primary">Insights</h1>
        <p className="text-text-secondary mt-2 mb-8">Adherence, body comp, spend, and milestones in one view.</p>
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime/10 border border-lime/20 flex items-center justify-center text-lime animate-pulse-slow"><Icon name="chart" className="w-7 h-7" /></div>
          <p className="font-display font-bold text-text-primary text-lg">No insights yet.</p>
          <p className="text-text-muted text-sm mt-1.5 mb-6 max-w-sm mx-auto">Log meals for a few days and your adherence trend, streak, body comp, and achievements will unlock here.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-7">
            {ACHIEVEMENTS.slice(0, 5).map((a) => (
              <span key={a.id} className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted opacity-50" title={a.label}><Icon name={a.icon} className="w-5 h-5" /></span>
            ))}
          </div>
          <Link href="/dashboard/calories" className="inline-flex items-center gap-2 bg-lime text-canvas font-display font-bold px-6 py-3.5 rounded-xl uppercase tracking-wider text-sm hover:bg-lime-glow transition-all shadow-lime-sm">Log your first meal →</Link>
        </div>
      </div>
    );
  }

  // last 12 weeks adherence (protein-hit % per week)
  const weeks: { label: string; pct: number }[] = [];
  for (let w = 11; w >= 0; w--) {
    const start = new Date(); start.setDate(start.getDate() - (w * 7 + 6)); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setDate(end.getDate() - w * 7); end.setHours(23, 59, 59, 999);
    const wd = days.filter((d) => { const t = new Date(d.date).getTime(); return t >= start.getTime() && t <= end.getTime(); });
    const hit = wd.filter((d) => d.protein >= proteinTarget * 0.9).length;
    weeks.push({ label: `W${12 - w}`, pct: wd.length ? Math.round((hit / wd.length) * 100) : 0 });
  }
  const weightDelta = stats.weightFirst != null && stats.weightLast != null ? Math.round((stats.weightLast - stats.weightFirst) * 10) / 10 : null;

  const topCards = [
    { label: "Day Streak", value: stats.streak, unit: "days", color: "text-lime" },
    { label: "Avg Protein", value: stats.avgProtein, unit: "g/day", color: "text-lime" },
    { label: "Meals Logged", value: stats.totalMeals, unit: "12 wk", color: "text-text-primary" },
    { label: "Adherence", value: `${stats.adherence}%`, unit: "protein goal", color: "text-amber-app" },
  ];

  return (
    <div className="px-5 sm:px-8 py-8 pb-24 lg:pb-8 max-w-5xl">
      <p className="text-lime text-xs font-mono uppercase tracking-[0.2em] mb-1.5">12-Week Window</p>
      <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-[0.95] text-text-primary">Insights</h1>
      <p className="text-text-secondary mt-2 mb-8">Adherence, body comp, spend, and milestones in one view.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {topCards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`num font-display font-black text-3xl leading-none ${c.color}`}>{c.value}</p>
            <p className="text-text-muted text-xs mt-1">{c.unit}</p>
          </div>
        ))}
      </div>

      {/* Adherence trend */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">12-Week Adherence</p>
            <h3 className="font-display font-bold text-text-primary uppercase tracking-tight">Protein Goal Trend</h3>
          </div>
          <span className="num font-display font-black text-2xl text-lime">{stats.adherence}%</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeks.map((w) => (
            <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-canvas rounded-md overflow-hidden flex items-end" style={{ height: "100%" }}>
                <div className="w-full rounded-md transition-all" style={{ height: `${Math.max(4, w.pct)}%`, background: w.pct >= 80 ? "#2f9e44" : w.pct >= 50 ? "#FF9F0A" : "#3a3a3a" }} />
              </div>
              <span className="text-text-muted text-[9px] font-mono">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bodyweight + spend */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Bodyweight</p>
          {stats.weightLast != null ? (
            <>
              <p className="num font-display font-black text-3xl text-text-primary leading-none">{stats.weightLast}<span className="text-base text-text-muted font-normal ml-1">kg</span></p>
              {weightDelta != null && <p className={`text-xs mt-1 ${weightDelta > 0 ? "text-lime" : weightDelta < 0 ? "text-cyan-app" : "text-text-muted"}`}>{weightDelta > 0 ? "+" : ""}{weightDelta} kg over window</p>}
            </>
          ) : <p className="text-text-muted text-sm mt-2">Log your weight in Macro Calc to track trend.</p>}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Grocery Spend</p>
          {stats.spend > 0 ? (
            <p className="num font-display font-black text-3xl text-lime leading-none">${stats.spend}<span className="text-base text-text-muted font-normal ml-1">12 wk</span></p>
          ) : <p className="text-text-muted text-sm mt-2">Scan receipts to track spend.</p>}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-4">Achievements</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const earned = a.test(stats);
            return (
              <div key={a.id} className={`flex flex-col items-center gap-1.5 text-center ${earned ? "" : "opacity-40"}`} title={a.label}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${earned ? "bg-lime/10 border border-lime/30 text-lime" : "bg-surface border border-border text-text-muted"}`}><Icon name={a.icon} className="w-6 h-6" /></div>
                <span className="text-text-muted text-[9px] leading-tight">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
