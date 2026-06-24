export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProfile: { display_name: string; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();
    initialProfile = data;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar initialProfile={initialProfile} />
      <main id="main-content" tabIndex={-1} className="flex-1 lg:ml-64 min-h-screen overflow-x-hidden pt-14 lg:pt-0">{children}</main>

      {/* Persistent quick-log FAB */}
      <Link href="/dashboard/calories" aria-label="Log a meal"
        className="fixed z-40 right-5 bottom-20 lg:bottom-6 w-14 h-14 rounded-full bg-lime text-canvas shadow-lime-glow flex items-center justify-center hover:bg-lime-glow transition-all active:scale-95">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
      </Link>
    </div>
  );
}
