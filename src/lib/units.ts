// Unit conversions for body stats. Storage + all computation stays metric
// (kg/cm — see src/lib/nutrition.ts); these helpers convert only for display
// and input. `unit_pref` on `onboarding` persists the user's choice.

export type UnitSystem = "imperial" | "metric";

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function normalizeUnit(v: unknown): UnitSystem {
  return String(v ?? "").toLowerCase() === "metric" ? "metric" : "imperial";
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}
export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function ftInToCm(ft: number, inch: number): number {
  return (ft * 12 + inch) * CM_PER_IN;
}

// cm → { ft, in } with inches rounded; carries a rounded-up 12 into feet.
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return { ft, in: inch };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Given the metric source of truth, produce the input strings for a unit system.
export function metricToInputs(weight_kg: number | null, height_cm: number | null, unit: UnitSystem) {
  if (unit === "metric") {
    return {
      weight: weight_kg != null ? String(round1(weight_kg)) : "",
      heightCm: height_cm != null ? String(Math.round(height_cm)) : "",
      heightFt: "",
      heightIn: "",
    };
  }
  const ftIn = height_cm != null ? cmToFtIn(height_cm) : null;
  return {
    weight: weight_kg != null ? String(Math.round(kgToLb(weight_kg))) : "",
    heightCm: "",
    heightFt: ftIn ? String(ftIn.ft) : "",
    heightIn: ftIn ? String(ftIn.in) : "",
  };
}
