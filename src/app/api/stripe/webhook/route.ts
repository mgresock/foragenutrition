import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { adminSupabase } from "@/lib/supabase/admin";
import Stripe from "stripe";

async function setTier(customerId: string, tier: "free" | "pro") {
  await adminSupabase
    .from("profiles")
    .update({ subscription_tier: tier })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      if (customerId) {
        await adminSupabase
          .from("profiles")
          .update({ subscription_tier: "pro", stripe_subscription_id: session.subscription as string })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tier = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
      await setTier(sub.customer as string, tier);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await adminSupabase
        .from("profiles")
        .update({ subscription_tier: "free", stripe_subscription_id: null })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // Successful renewal — keep tier confirmed as pro
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) await setTier(invoice.customer as string, "pro");
      break;
    }

    // Payment failed — downgrade to free
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) await setTier(invoice.customer as string, "free");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
