export const dynamic = "force-dynamic";

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
      <Sidebar initialProfile={initialProfile} />
      <main className="flex-1 lg:ml-64 min-h-screen overflow-x-hidden pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
