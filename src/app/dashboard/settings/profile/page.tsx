import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: prof }, { data: ob }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("onboarding").select("age, sex, height_cm, weight_kg, unit_pref").eq("user_id", user.id).single(),
  ]);

  return (
    <ProfileForm
      userId={user.id}
      initialProfile={{
        display_name: prof?.display_name ?? "",
        avatar_url: prof?.avatar_url ?? null,
      }}
      initialOnboarding={{
        age: ob?.age ?? null,
        sex: ob?.sex ?? "",
        height_cm: ob?.height_cm ?? null,
        weight_kg: ob?.weight_kg ?? null,
        unit_pref: (ob?.unit_pref as "imperial" | "metric") ?? "imperial",
      }}
    />
  );
}
