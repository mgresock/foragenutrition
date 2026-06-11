import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GroceryForm } from "./GroceryForm";

export default async function EditGroceryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("onboarding")
    .select("zip_code, weekly_budget")
    .eq("user_id", user.id)
    .single();

  return (
    <GroceryForm
      userId={user.id}
      initialZip={data?.zip_code ?? ""}
      initialBudget={data?.weekly_budget ?? null}
    />
  );
}
