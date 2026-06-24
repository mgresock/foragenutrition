"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

interface ReceiptItem { id: string; name: string; price: number; category: string; healthy: boolean | null; }
interface Receipt { id: string; store: string; receipt_date: string; total: number; ai_insight: string; image_path: string | null; items?: ReceiptItem[]; }

const CATEGORY_COLORS: Record<string, string> = {
  Protein: "text-lime border-lime/30 bg-lime/10", Carbs: "text-amber-app border-amber-app/30 bg-amber-app/10",
  Produce: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", Dairy: "text-cyan-app border-cyan-app/30 bg-cyan-app/10",
  Fats: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", Snacks: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  Processed: "text-red-400 border-red-400/30 bg-red-400/10", Beverages: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

export default function ReceiptsPage() {
  const supabase = createClient();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [scanning, setScanning] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [userEmail, setUserEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadReceipts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? "");
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
    setUserTier((profile?.subscription_tier as "free" | "pro") ?? "free");
    const { data } = await supabase.from("receipts").select("*").eq("user_id", user.id).order("scanned_at", { ascending: false }).limit(100);
    if (data) { setReceipts(data); if (data.length > 0 && !selected) loadReceiptWithItems(data[0]); }
  };

  const loadReceiptWithItems = async (receipt: Receipt) => {
    const { data: items } = await supabase.from("receipt_items").select("*").eq("receipt_id", receipt.id);
    setSelected({ ...receipt, items: items || [] });
  };

  useEffect(() => { loadReceipts(); }, []);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setScanning(false); return; }

    // Upload image to Storage
    const ext = file.name.split(".").pop();
    const imagePath = `${user.id}/${Date.now()}.${ext}`;
    await supabase.storage.from("receipt-images").upload(imagePath, file);

    // Call AI to parse receipt
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/scan-receipt", { method: "POST", body: formData });
    const parsed = await res.json();

    // Save receipt to DB
    const { data: newReceipt, error } = await supabase.from("receipts").insert({
      user_id: user.id,
      store: parsed.store || "Unknown Store",
      receipt_date: new Date().toISOString().split("T")[0],
      total: parsed.total || 0,
      image_path: imagePath,
      ai_insight: parsed.aiInsight || "",
    }).select().single();

    if (!error && newReceipt && parsed.items?.length) {
      await supabase.from("receipt_items").insert(
        parsed.items.map((item: { name: string; price: number; category: string; healthy: boolean | null }) => ({
          receipt_id: newReceipt.id,
          name: item.name,
          price: item.price,
          category: item.category,
          healthy: item.healthy,
        }))
      );
    }

    await loadReceipts();
    if (newReceipt) loadReceiptWithItems({ ...newReceipt, items: parsed.items || [] });
    setScanning(false);
  };

  const monthlyTotal = receipts.reduce((s, r) => s + r.total, 0);
  const allItems = receipts.flatMap((r) => r.items || []);
  const healthyPct = allItems.length ? Math.round((allItems.filter((i) => i.healthy === true).length / allItems.length) * 100) : 0;

  return (
    <div className="px-6 py-8 pb-24 lg:pb-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-text-primary">Receipt Tracker</h1>
        <p className="text-text-secondary mt-1">Scan receipts for spending insights and AI nutrition analysis.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Month Spend", value: `$${monthlyTotal.toFixed(2)}`, color: "text-text-primary" },
          { label: "Receipts", value: receipts.length, color: "text-text-primary" },
          { label: "Healthy Items", value: `${healthyPct}%`, color: "text-lime" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`num font-display font-black text-2xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {userTier !== "pro" ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-lime" fill="none" viewBox="0 0 24 24">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="font-display font-bold text-text-primary text-sm mb-1">Pro Feature</p>
              <p className="text-text-muted text-xs mb-4">Receipt scanning requires Forage Pro.</p>
              <Link href="/dashboard/settings/billing" className="inline-block px-4 py-2 bg-lime text-canvas font-display font-bold rounded-xl hover:bg-lime-glow transition-all text-xs">
                Upgrade to Pro
              </Link>
            </div>
          ) : (
            <>
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-lime/10 border border-lime/30 hover:border-lime/50 rounded-2xl py-4 text-lime font-medium text-sm transition-all hover:bg-lime/15 group">
                {scanning ? (
                  <><ForageSpinner size={16} />Scanning...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" viewBox="0 0 20 20"><path d="M10 4v8M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Scan New Receipt</>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            </>
          )}

          {receipts.length === 0 && !scanning && (
            <div className="text-center py-8 text-text-muted text-sm">No receipts yet. Scan one above.</div>
          )}

          {receipts.map((receipt) => (
            <button key={receipt.id} onClick={() => loadReceiptWithItems(receipt)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === receipt.id ? "bg-lime/10 border-lime/30" : "bg-card border-border hover:border-border-bright"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display font-bold text-text-primary text-sm">{receipt.store}</p>
                  <p className="text-text-muted text-xs mt-0.5">{new Date(receipt.receipt_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <span className="num font-display font-bold text-text-primary text-lg">${receipt.total.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border flex items-start justify-between">
                <div>
                  <h2 className="font-display font-black text-xl text-text-primary">{selected.store}</h2>
                  <p className="text-text-muted text-sm mt-0.5">{new Date(selected.receipt_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <span className="num font-display font-black text-2xl text-lime">${selected.total.toFixed(2)}</span>
              </div>

              {selected.ai_insight && (
                <div className="mx-5 mt-5 p-4 bg-lime/5 border border-lime/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-lime animate-pulse-slow" />
                    <span className="text-lime text-xs font-mono uppercase tracking-wider">AI Analysis</span>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">{selected.ai_insight}</p>
                </div>
              )}

              {selected.items && selected.items.length > 0 && (
                <div className="p-5 space-y-2">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-3">Line Items</p>
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.healthy === true ? "bg-lime" : item.healthy === false ? "bg-red-400" : "bg-text-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm truncate">{item.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${CATEGORY_COLORS[item.category] || "text-text-muted border-border bg-surface"}`}>{item.category}</span>
                      <span className="num text-text-secondary text-sm font-mono flex-shrink-0">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime/10 border border-lime/20 flex items-center justify-center text-lime"><Icon name="receipt" className="w-7 h-7" /></div>
              <p className="text-text-secondary">Scan a receipt to see its analysis here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
