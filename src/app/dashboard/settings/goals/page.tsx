import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoalsForm } from "./GoalsForm";

export default async function EditGoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("onboarding")
    .select("goals, meals_per_week")
    .eq("user_id", user.id)
    .single();

  return (
    <GoalsForm
      userId={user.id}
      initialGoals={data?.goals ?? []}
      initialMealsPerWeek={data?.meals_per_week ?? null}
    />
  );
}
