"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function WhoopSettingsPage() {
  const supabase = createClient();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("whoop_connections").select("user_id").eq("user_id", user.id).single();
      setConnected(!!data);
    };
    check();
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("whoop_connections").delete().eq("user_id", user.id);
    setConnected(false);
    setDisconnecting(false);
  };

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-lg">
      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors mb-4 inline-block">← Settings</Link>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-black text-3xl text-text-primary">Whoop</h1>
          {connected && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-lime/10 border border-lime/30 rounded-full text-lime text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-lime" />Connected
            </span>
          )}
        </div>
        <p className="text-text-secondary">Sync your recovery, HRV, and sleep data to inform your nutrition.</p>
      </div>

      {connected === null ? (
        <div className="text-text-muted text-sm">Checking connection...</div>
      ) : connected ? (
        <div className="space-y-4">
          <div className="bg-card border border-lime/20 rounded-2xl p-5">
            <p className="text-text-primary font-medium text-sm mb-1">Whoop is connected</p>
            <p className="text-text-muted text-xs">Your recovery score, HRV, sleep performance, and strain data sync automatically to your dashboard.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-text-primary font-medium text-sm">What syncs</h3>
            {[
              { label: "Recovery Score", desc: "Daily 0–100 readiness score" },
              { label: "HRV", desc: "Heart rate variability in ms" },
              { label: "Resting Heart Rate", desc: "BPM from your last sleep" },
              { label: "Sleep Performance", desc: "% of sleep need fulfilled" },
              { label: "Strain", desc: "Cardiovascular load from last workout" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-lime mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-text-primary text-sm font-medium">{item.label}</p>
                  <p className="text-text-muted text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="w-full py-3 rounded-xl border border-red-400/20 text-red-400 text-sm hover:bg-red-400/10 transition-all disabled:opacity-40"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Whoop"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 5v6m0 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-medium">Connect your Whoop band</p>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">Link your Whoop account to see recovery scores, HRV, and sleep data alongside your nutrition — so you know exactly when to push and when to eat more.</p>
              </div>
            </div>
            <a href="/api/whoop/auth"
              className="flex items-center justify-center gap-2 w-full bg-red-500 text-white font-display font-bold py-3.5 rounded-xl hover:bg-red-400 transition-all">
              Connect Whoop
            </a>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-text-primary font-medium text-sm mb-3">Setup required</h3>
            <ol className="space-y-2 text-text-muted text-xs leading-relaxed list-none">
              {[
                "Create a developer app at developer.whoop.com",
                "Add your Client ID and Client Secret to .env.local as WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET",
                `Set WHOOP_REDIRECT_URI to: [your domain]/api/whoop/callback`,
                "Add the same redirect URI in your Whoop developer app settings",
                "Then click Connect Whoop above",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
