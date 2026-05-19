"use client";

import Link from "next/link";

export default function WhoopSettingsPage() {
  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Settings</Link>
      </div>
      <h1 className="font-display font-black text-3xl text-text-primary mb-2">Whoop Integration</h1>
      <p className="text-text-secondary mb-8">Sync your recovery, HRV, and sleep data.</p>
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <span className="text-4xl mb-4 block">⌚</span>
        <h2 className="font-display font-bold text-text-primary text-lg mb-2">Whoop sync coming soon</h2>
        <p className="text-text-muted text-sm">Whoop integration will be available in a future update.</p>
      </div>
    </div>
  );
}
