"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";

interface AuthFormProps {
  mode: "signin" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    setError("");
    setConfirmPassword("");
    setConfirmationSent(false);
    setShowForgot(false);
    setForgotSent(false);
    setForgotError("");
  }, [mode]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });

    setForgotLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setForgotError(body.error || "Something went wrong. Please try again.");
      return;
    }

    setForgotSent(true);
  };

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitSeconds <= 0) { if (error.startsWith("Too many")) setError(""); return; }
    const t = setTimeout(() => setRateLimitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rateLimitSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const seconds = parseInt(error.message.match(/after (\d+) seconds/)?.[1] ?? "0");
        if (seconds > 0) {
          setRateLimitSeconds(seconds);
          setError(`Too many attempts — please wait ${seconds}s before trying again.`);
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Email confirmation is disabled in Supabase — user is immediately active
        router.push("/onboarding/profile");
      } else {
        // Email confirmation is required — show check-your-email screen
        setConfirmationSent(true);
      }

    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === "Email not confirmed"
            ? "Please confirm your email first. Check your inbox for a confirmation link."
            : error.message
        );
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: onboarding } = await supabase
          .from("onboarding")
          .select("completed_at")
          .eq("user_id", user.id)
          .single();
        router.push(onboarding?.completed_at ? "/dashboard" : "/onboarding/profile");
      }
    }

    setLoading(false);
  };

  // ── Check-your-email screen ──────────────────────────────────────────────
  if (confirmationSent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-lime" fill="none" viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-text-primary text-lg mb-2">Check your inbox</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-1">
          We sent a confirmation link to
        </p>
        <p className="text-lime text-sm font-medium mb-4">{email}</p>
        <p className="text-text-muted text-xs leading-relaxed">
          Click the link in the email to activate your account, then come back here to sign in.
        </p>
        <button
          onClick={() => setConfirmationSent(false)}
          className="mt-6 text-text-muted text-xs hover:text-text-secondary transition-colors"
        >
          ← Use a different email
        </button>
      </div>
    );
  }

  // ── Forgot password screen ───────────────────────────────────────────────
  if (showForgot) {
    return (
      <div>
        {forgotSent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-lime" fill="none" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-text-primary text-lg mb-2">Check your inbox</h3>
            <p className="text-text-secondary text-sm mb-1">We sent a password reset link to</p>
            <p className="text-lime text-sm font-medium mb-4">{forgotEmail}</p>
            <p className="text-text-muted text-xs">Click the link in the email to set a new password.</p>
            <button onClick={() => setShowForgot(false)} className="mt-6 text-text-muted text-xs hover:text-text-secondary transition-colors">← Back to sign in</button>
          </div>
        ) : (
          <>
            <h3 className="font-display font-bold text-text-primary text-lg mb-1">Reset your password</h3>
            <p className="text-text-secondary text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email" required value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                  placeholder="you@example.com"
                  className={`w-full bg-surface border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none transition-all ${
                    forgotError ? "border-red-500/50 focus:border-red-500" : "border-border focus:border-lime/50"
                  }`}
                />
              </div>
              {forgotError && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                  {forgotError}
                </p>
              )}
              <button type="submit" disabled={forgotLoading}
                className="w-full bg-lime text-canvas font-display font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {forgotLoading ? <><ForageSpinner size={16} onLight />Sending…</> : "Send Reset Link"}
              </button>
            </form>
            <button onClick={() => setShowForgot(false)} className="mt-4 w-full text-center text-text-muted text-xs hover:text-text-secondary transition-colors">← Back to sign in</button>
          </>
        )}
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="space-y-3 mb-6">
        <SocialButton provider="google" />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-text-muted text-xs uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 focus:shadow-lime-sm transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-text-secondary uppercase tracking-wider">Password</label>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                className="text-xs text-text-muted hover:text-lime transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 focus:shadow-lime-sm transition-all"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className={`w-full bg-surface border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none transition-all ${
                confirmPassword && confirmPassword !== password
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-border focus:border-lime/50 focus:shadow-lime-sm"
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || rateLimitSeconds > 0 || (mode === "signup" && !!confirmPassword && confirmPassword !== password)}
          className="w-full bg-lime text-canvas font-display font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider hover:bg-lime-glow transition-all shadow-lime-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ForageSpinner size={16} onLight />
              {mode === "signin" ? "Signing in..." : "Creating account..."}
            </>
          ) : rateLimitSeconds > 0 ? (
            `Try again in ${rateLimitSeconds}s`
          ) : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

function SocialButton({ provider }: { provider: "google" }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-surface border border-border hover:border-border-bright rounded-xl py-3 text-sm text-text-primary font-medium transition-all hover:bg-card disabled:opacity-50"
    >
      {loading ? <ForageSpinner size={16} /> : <GoogleIcon />}
      Continue with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
