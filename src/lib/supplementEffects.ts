export interface SupplementEffect {
  waterMl?: number;
  vitamins?: {
    vitamin_c_mg?: number;
    vitamin_d_mcg?: number;
    vitamin_b12_mcg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    potassium_mg?: number;
    magnesium_mg?: number;
  };
  note?: string;
  tag?: string;
}

export const SUPPLEMENT_EFFECTS: Record<string, SupplementEffect> = {
  "creatine monohydrate": {
    waterMl: 500,
    note: "Creatine pulls water into muscle cells — drink at least 500ml extra daily for optimal cell saturation and to protect kidneys.",
    tag: "+500ml water/day",
  },
  "whey protein": {
    waterMl: 200,
    vitamins: { vitamin_b12_mcg: 1.5 },
    note: "Protein metabolism requires extra water — add 200ml per serving to support kidney filtration.",
    tag: "+200ml water/day",
  },
  "vitamin d3": {
    vitamins: { vitamin_d_mcg: 50 },
    note: "Your Vitamin D3 supplement fully covers the daily requirement — take with a fat-containing meal for best absorption.",
    tag: "Covers daily Vitamin D",
  },
  "omega-3 fish oil": {
    note: "Omega-3 absorption is 3× higher when taken with a fat-containing meal. Reduces the need for anti-inflammatory foods post-training.",
    tag: "Take with fat",
  },
  "magnesium glycinate": {
    waterMl: 200,
    vitamins: { magnesium_mg: 400 },
    note: "Magnesium covers your daily need and draws water into the GI tract — drink 200ml extra to aid absorption and prevent loose stools.",
    tag: "Covers Magnesium · +200ml water",
  },
  "zinc": {
    note: "High-dose zinc competes with copper absorption — add copper-rich foods (cashews, dark chocolate, shellfish) to your weekly diet.",
    tag: "Add copper-rich foods",
  },
  "vitamin c": {
    vitamins: { vitamin_c_mg: 500 },
    note: "500mg Vitamin C exceeds the daily food requirement and dramatically boosts iron absorption from plant-based meals — time it with iron-rich foods.",
    tag: "Covers daily Vitamin C",
  },
  "caffeine": {
    waterMl: 250,
    note: "Caffeine is a mild diuretic — add 250ml of water per serving to stay optimally hydrated and avoid performance decline.",
    tag: "+250ml water/serving",
  },
  "beta-alanine": {
    waterMl: 150,
    note: "Beta-alanine works best alongside carbohydrates and adequate hydration. The tingling (paresthesia) is harmless and fades with consistent use.",
    tag: "+150ml water/day",
  },
  "ashwagandha": {
    note: "Ashwagandha lowers cortisol — pair with adequate dietary protein and zinc-rich foods to maximize testosterone and recovery support.",
    tag: "↑ Protein + Zinc foods",
  },
  "collagen peptides": {
    waterMl: 200,
    vitamins: { calcium_mg: 50 },
    note: "Collagen synthesis requires Vitamin C — take with a Vitamin C source or supplement. Most effective 30–60 min before training or before bed.",
    tag: "+200ml water · take with Vitamin C",
  },
  "melatonin": {
    note: "Melatonin works best in a dark, cool environment. Avoid caffeine, bright screens, and heavy meals within 3 hours of taking it.",
    tag: "Avoid caffeine 6hrs before",
  },
};

export function getSupplementEffect(name: string): SupplementEffect | null {
  return SUPPLEMENT_EFFECTS[name.toLowerCase()] ?? null;
}
