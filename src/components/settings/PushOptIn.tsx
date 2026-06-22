"use client";

import { useEffect, useState } from "react";
import { enablePush, isPushEnabled, pushSupported } from "@/lib/push";
import { ForageSpinner } from "@/components/ui/ForageSpinner";

export function PushOptIn() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { setMounted(true); isPushEnabled().then(setEnabled); }, []);

  const enable = async () => {
    setBusy(true); setMsg("");
    const r = await enablePush();
    if (r.ok) { setEnabled(true); setMsg("Reminders are on. We'll nudge you if you forget to log."); }
    else setMsg(r.error || "Couldn't enable reminders.");
    setBusy(false);
  };

  if (!mounted) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-5">
      <h2 className="font-display font-bold text-text-primary mb-1">Reminders</h2>
      <p className="text-text-secondary text-sm mb-4">Get a daily push notification if you haven&apos;t logged your meals — keeps your streak alive.</p>
      {!pushSupported() ? (
        <p className="text-text-muted text-sm">Push notifications aren&apos;t supported on this browser/device.</p>
      ) : enabled ? (
        <p className="inline-flex items-center gap-2 text-lime text-sm"><span className="w-2 h-2 rounded-full bg-lime" /> Reminders enabled on this device.</p>
      ) : (
        <button onClick={enable} disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-3 bg-lime/15 border border-lime/40 text-lime rounded-xl text-sm font-display font-bold uppercase tracking-wider hover:bg-lime/25 transition-all disabled:opacity-50">
          {busy ? <><ForageSpinner size={16} />Enabling…</> : "Enable reminders"}
        </button>
      )}
      {msg && <p className="text-text-muted text-xs mt-3">{msg}</p>}
    </div>
  );
}
