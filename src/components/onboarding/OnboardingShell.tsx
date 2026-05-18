"use client";

import { ForageLogo } from "@/components/brand/ForageLogo";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const STEPS = ["Profile", "Location", "Budget", "Goals"];

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <ForageLogo size={24} />

        {/* Step pills */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                  i + 1 < step
                    ? "bg-lime/20 text-lime border border-lime/30"
                    : i + 1 === step
                    ? "bg-lime text-canvas font-semibold"
                    : "bg-surface text-text-muted border border-border"
                }`}
              >
                {i + 1 < step ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="num font-mono text-xs">{i + 1}</span>
                )}
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-4 h-px ${i + 1 < step ? "bg-lime/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-lime transition-all duration-500 ease-out shadow-lime-sm"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="mb-8">
            <span className="text-lime text-xs font-mono uppercase tracking-widest">
              Step {step} of {totalSteps}
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-text-primary mt-2 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-text-secondary mt-3 text-base leading-relaxed">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
