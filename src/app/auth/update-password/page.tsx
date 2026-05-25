"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageLogo } from "@/components/brand/ForageLogo";
import { ForageSpinner } from "@/components/ui/ForageSpinner";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <ForageLogo size={26} />
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-lime" fill="none" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">Password updated!</h2>
            <p className="text-text-secondary text-sm">Taking you to your dashboard…</p>
          </div>
        ) : (
          <>
            <h2 className="font-display font-black text-2xl text-text-primary mb-1">Set new password</h2>
            <p className="text-text-secondary text-sm mb-8">Choose a strong password for your Forage account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={`w-full bg-surface border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none transition-all ${
                    confirm && confirm !== password ? "border-red-500/50" : "border-border focus:border-lime/50"
                  }`}
                />
                {confirm && confirm !== password && (
                  <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password || password !== confirm}
                className="w-full bg-lime text-canvas font-display font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><ForageSpinner size={16} onLight />Updating…</> : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
