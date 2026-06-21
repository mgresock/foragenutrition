// Personalized calorie + macro targets — Mifflin-St Jeor TDEE with activity
// multipliers and a protein-first macro split. Pure functions, no I/O, so they
// can run on the server (adaptive recalc) and the client (Macro Calculator).

export type Sex = "male" | "female";
export type ActivityKey = "sedentary" | "light" | "moderate" | "very" | "extra";
export type GoalKey = "cut" | "maintain" | "bulk";

export const ACTIVITY_OPTIONS: { key: ActivityKey; label: string; desc: string; mult: number }[] = [
  { key: "sedentary", label: "Sedentary", desc: "Desk job, little exercise", mult: 1.2 },
  { key: "light", label: "Light", desc: "Exercise 1–3×/week", mult: 1.375 },
  { key: "moderate", label: "Moderate", desc: "Exercise 3–5×/week", mult: 1.55 },
  { key: "very", label: "Very Active", desc: "Hard exercise 6–7×/week", mult: 1.725 },
  { key: "extra", label: "Athlete", desc: "2×/day or physical job", mult: 1.9 },
];

export const GOAL_OPTIONS: { key: GoalKey; label: string; desc: string }[] = [
  { key: "cut", label: "Cut", desc: "Lose fat — moderate deficit" },
  { key: "maintain", label: "Maintain", desc: "Hold weight, recomp" },
  { key: "bulk", label: "Lean Bulk", desc: "Gain muscle — small surplus" },
];

const ACTIVITY_MULT: Record<ActivityKey, number> = Object.fromEntries(
  ACTIVITY_OPTIONS.map((a) => [a.key, a.mult])
) as Record<ActivityKey, number>;

export interface TargetInput {
  sex?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity?: string | null;
  goal?: GoalKey;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: GoalKey;
  estimated: boolean; // true when we fell back to defaults (missing profile data)
}

const DEFAULTS = { sex: "male" as Sex, age: 28, height_cm: 178, weight_kg: 80, activity: "moderate" as ActivityKey };

// Normalize a free-text/array goal (from onboarding.goals) into a GoalKey.
export function goalFromGoals(goals: unknown): GoalKey {
  const text = (Array.isArray(goals) ? goals.join(" ") : String(goals ?? "")).toLowerCase();
  if (/(lose|cut|lean out|shred|fat loss|deficit)/.test(text)) return "cut";
  if (/(gain|bulk|build|muscle|mass|grow|surplus|strength)/.test(text)) return "bulk";
  return "maintain";
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

// Mifflin-St Jeor BMR → TDEE → goal-adjusted calories → protein-first macros.
export function computeTargets(input: TargetInput): Targets {
  const haveCore = input.weight_kg != null && input.height_cm != null && input.age != null;
  const sex: Sex = String(input.sex ?? "").toLowerCase().startsWith("f") ? "female" : "male";
  const age = clampNum(input.age, 13, 100, DEFAULTS.age);
  const height = clampNum(input.height_cm, 120, 230, DEFAULTS.height_cm);
  const weight = clampNum(input.weight_kg, 35, 250, DEFAULTS.weight_kg);
  const actKey = (ACTIVITY_MULT[(input.activity as ActivityKey)] ? input.activity : DEFAULTS.activity) as ActivityKey;
  const goal: GoalKey = input.goal ?? "maintain";

  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + (sex === "female" ? -161 : 5));
  const tdee = Math.round(bmr * ACTIVITY_MULT[actKey]);

  // Goal adjustment: ~15% deficit for cut, +10% (capped) surplus for lean bulk.
  const calories = Math.round(
    goal === "cut" ? tdee * 0.82 : goal === "bulk" ? tdee + Math.min(400, tdee * 0.1) : tdee
  );

  return { bmr, tdee, calories, ...macrosForCalories(calories, weight, goal), goal, estimated: !haveCore };
}

// Protein-first macro split for a given calorie level: protein from bodyweight
// (higher on a cut to preserve muscle), 25% of calories from fat, rest carbs.
export function macrosForCalories(calories: number, weight_kg: number, goal: GoalKey) {
  const proteinPerKg = goal === "cut" ? 2.2 : goal === "bulk" ? 1.9 : 2.0;
  const protein_g = Math.round(weight_kg * proteinPerKg);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { protein_g, carbs_g, fat_g };
}

// Adaptive calorie adjustment from a measured weekly bodyweight trend (kg/week).
// Nudges ±100 kcal toward the goal when the scale isn't moving as intended,
// clamped to a safe band around BMR/TDEE.
export function adaptiveCalories(base: Targets, trendKgPerWeek: number | null): number {
  if (trendKgPerWeek == null) return base.calories;
  let delta = 0;
  if (base.goal === "bulk") {
    if (trendKgPerWeek < 0.1) delta = 100;          // not gaining → eat more
    else if (trendKgPerWeek > 0.5) delta = -100;    // gaining too fast → ease off
  } else if (base.goal === "cut") {
    if (trendKgPerWeek > -0.1) delta = -100;         // not losing → eat less
    else if (trendKgPerWeek < -0.9) delta = 100;     // losing too fast → eat more
  }
  return Math.max(Math.round(base.bmr * 1.1), Math.min(Math.round(base.tdee * 1.3), base.calories + delta));
}
