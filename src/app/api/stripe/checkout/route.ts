import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DEV_EMAILS } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Developer accounts don't need Stripe
  if (DEV_EMAILS.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Developer account — already has full access." }, { status: 400 });
  }

  const { plan, trial } = await req.json(); // plan: "monthly" | "yearly", trial?: boolean
  const priceId = plan === "yearly" ? STRIPE_PRICES.yearly : STRIPE_PRICES.monthly;
  if (!priceId) return NextResponse.json({ error: "Stripe not configured yet." }, { status: 500 });

  // Reuse existing Stripe customer if present
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await adminSupabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    client_reference_id: user.id,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/settings/billing?success=true`,
    cancel_url: `${origin}/dashboard/settings/billing?canceled=true`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
      ...(trial ? { trial_period_days: 7 } : {}),
    },
  });

  return NextResponse.json({ url: session.url });
}
