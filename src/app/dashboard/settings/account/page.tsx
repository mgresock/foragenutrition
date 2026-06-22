"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not delete account."); setDeleting(false); return;
    }
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="px-5 sm:px-8 py-8 pb-24 lg:pb-8 max-w-2xl">
      <p className="text-lime text-xs font-mono uppercase tracking-[0.2em] mb-1.5">Settings</p>
      <h1 className="font-display font-black text-4xl uppercase tracking-tight leading-[0.95] text-text-primary">Data &amp; Privacy</h1>
      <p className="text-text-secondary mt-2 mb-8">Export everything we hold about you, or permanently delete your account.</p>

      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="font-display font-bold text-text-primary mb-1">Export your data</h2>
        <p className="text-text-secondary text-sm mb-4">Download a JSON file with your profile, meal logs, water, supplements, weight, and receipts.</p>
        <a href="/api/account/export" download
          className="inline-flex items-center gap-2 px-5 py-3 bg-surface border border-border rounded-xl text-text-primary text-sm font-medium hover:border-lime/40 transition-all">
          <svg className="w-4 h-4 text-lime" fill="none" viewBox="0 0 20 20"><path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Download my data
        </a>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <h2 className="font-display font-bold text-red-400 mb-1">Delete account</h2>
        <p className="text-text-secondary text-sm mb-4">This permanently erases your account and all associated data. This cannot be undone. Type <span className="font-mono text-text-primary">DELETE</span> to confirm.</p>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE"
          aria-label="confirm-delete"
          className="w-full sm:w-64 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-red-500/50 mb-4" />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div>
          <button onClick={handleDelete} disabled={confirm !== "DELETE" || deleting}
            className="inline-flex items-center gap-2 px-5 py-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm font-display font-bold uppercase tracking-wider hover:bg-red-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {deleting ? <><ForageSpinner size={16} />Deleting…</> : "Permanently delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
