import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingContent } from "./BillingContent";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier, ai_requests_month")
    .eq("id", user.id)
    .single();

  const tier = (data?.subscription_tier as "free" | "pro") ?? "free";
  const aiUsed = data?.ai_requests_month ?? 0;

  return (
    <Suspense>
      <BillingContent tier={tier} aiUsed={aiUsed} />
    </Suspense>
  );
}
