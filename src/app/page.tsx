"use client";

import { useState } from "react";
import Link from "next/link";
import { ForageLogo } from "@/components/brand/ForageLogo";
import { AuthForm } from "@/components/auth/AuthForm";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden flex flex-col lg:flex-row">

      {/* ─── LEFT PANEL — brand ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden">

        {/* Terrain-style contour lines background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="contour" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <ellipse cx="60" cy="60" rx="55" ry="40" fill="none" stroke="#62e23f" strokeWidth="0.6" />
              <ellipse cx="60" cy="60" rx="42" ry="28" fill="none" stroke="#62e23f" strokeWidth="0.6" />
              <ellipse cx="60" cy="60" rx="29" ry="17" fill="none" stroke="#62e23f" strokeWidth="0.6" />
              <ellipse cx="60" cy="60" rx="16" ry="8" fill="none" stroke="#62e23f" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#contour)" />
        </svg>

        {/* Radial lime bloom */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(98,226,63,0.06) 0%, transparent 65%)" }}
        />

        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <ForageLogo size={28} />
        </div>

        {/* Hero type */}
        <div className="relative z-10">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-lime/40" />
            <span className="text-lime text-xs font-mono uppercase tracking-[0.25em]">
              Gym Nutrition OS
            </span>
          </div>

          {/* Giant display headline */}
          <h1
            className="font-display font-black leading-[0.88] text-text-primary mb-10"
            style={{ fontSize: "clamp(52px, 6vw, 88px)" }}
          >
            EAT TO
            <br />
            <span className="text-lime">BUILD.</span>
            <br />
            SPEND
            <br />
            LESS.
          </h1>

          <p className="text-text-secondary text-lg max-w-sm leading-relaxed mb-12">
            Forage is built for gym-goers who want to hit their macros without blowing the budget.
            AI grocery lists, calorie tracking, and receipt scanning — all in one place.
          </p>

          {/* Proof points */}
          <div className="flex gap-8">
            {[
              { val: "38%", desc: "avg. grocery savings" },
              { val: "180g+", desc: "daily protein hit" },
              { val: "94%", desc: "goal hit rate" },
            ].map((s) => (
              <div key={s.desc}>
                <p className="num font-display font-black text-2xl text-lime leading-none">{s.val}</p>
                <p className="text-text-muted text-xs mt-1.5 uppercase tracking-wider">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar — category pills */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {["Calorie Tracking", "High-Protein Meals", "Macro Planning", "Bulk & Cut Cycles", "AI Grocery Lists", "Pre/Post Workout Fuel", "Budget Optimizer"].map(
            (tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full border border-border text-text-muted text-xs font-mono"
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL — auth ─────────────────────────────────────────── */}
      <div className="flex-1 lg:w-[45%] flex flex-col justify-start lg:justify-center items-center px-6 pt-10 pb-12 sm:px-12 lg:py-12 relative">

        {/* Right panel subtle border on desktop */}
        <div className="hidden lg:block absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

        {/* Mobile hero */}
        <div className="lg:hidden w-full max-w-sm mb-8">
          <div className="mb-6">
            <ForageLogo size={28} />
          </div>
          <h1 className="font-display font-black text-text-primary leading-[0.9] mb-3" style={{ fontSize: "clamp(40px, 11vw, 56px)" }}>
            EAT TO <span className="text-lime">BUILD.</span><br />SPEND LESS.
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-5">
            AI nutrition tracking and grocery savings for gym-goers.
          </p>
          <div className="flex gap-6 mb-2">
            {[
              { val: "38%", desc: "grocery savings" },
              { val: "180g+", desc: "daily protein" },
              { val: "94%", desc: "goal hit rate" },
            ].map((s) => (
              <div key={s.desc}>
                <p className="num font-display font-black text-xl text-lime leading-none">{s.val}</p>
                <p className="text-text-muted text-[10px] mt-1 uppercase tracking-wider">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-border mt-6 mb-6" />
        </div>

        <div className="w-full max-w-sm animate-slide-up">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display font-black text-2xl text-text-primary">
              {mode === "signin" ? "Welcome back." : "Start foraging."}
            </h2>
            <p className="text-text-secondary text-sm mt-1.5">
              {mode === "signin"
                ? "Sign in to your account below."
                : "Create your account — free forever."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-surface border border-border rounded-xl p-1 mb-7">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-lime text-canvas font-semibold shadow-lime-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <AuthForm mode={mode} />

          <p className="mt-6 text-center text-text-muted text-xs leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-lime/70 hover:text-lime transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-lime/70 hover:text-lime transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>

    </div>
  );
}
