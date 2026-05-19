"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ForageSpinner } from "@/components/ui/ForageSpinner";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string | null;
};

type FriendProgress = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  goals: string[];
  streak: number;
  mealsLogged: number;
  today: { calories: number; protein: number; carbs: number; fat: number; sodium: number };
};

type Group = {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  created_by: string;
};

const CALORIE_GOAL = 2600;
const PROTEIN_GOAL = 180;

function GoalBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-canvas rounded-full overflow-hidden flex-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function FriendCard({ f }: { f: FriendProgress }) {
  const [expanded, setExpanded] = useState(false);
  const calPct = Math.round((f.today.calories / CALORIE_GOAL) * 100);
  const protPct = Math.round((f.today.protein / PROTEIN_GOAL) * 100);
  const hitCals = f.today.calories >= CALORIE_GOAL * 0.85;
  const hitProtein = f.today.protein >= PROTEIN_GOAL * 0.85;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button className="w-full p-4 text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar src={f.avatar_url} size={40} className="ring-2 ring-border flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-primary font-medium text-sm truncate">{f.display_name}</span>
              {f.streak > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded-full text-orange-400 text-[10px]">
                  🔥 {f.streak}d
                </span>
              )}
            </div>
            <div className="text-text-muted text-xs mt-0.5">{f.mealsLogged} meal{f.mealsLogged !== 1 ? "s" : ""} logged today</div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {hitCals && <span className="w-5 h-5 rounded-full bg-lime/20 border border-lime/30 text-lime text-[10px] flex items-center justify-center">✓</span>}
            {hitProtein && <span className="w-5 h-5 rounded-full bg-cyan-app/20 border border-cyan-app/30 text-cyan-app text-[10px] flex items-center justify-center">P</span>}
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[10px] w-12 flex-shrink-0">Calories</span>
            <GoalBar value={f.today.calories} max={CALORIE_GOAL} color="#b6f040" />
            <span className="num text-lime text-[10px] font-mono w-14 text-right flex-shrink-0">
              {f.today.calories}<span className="text-text-muted">/{CALORIE_GOAL}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[10px] w-12 flex-shrink-0">Protein</span>
            <GoalBar value={f.today.protein} max={PROTEIN_GOAL} color="#40c8f0" />
            <span className="num text-cyan-app text-[10px] font-mono w-14 text-right flex-shrink-0">
              {f.today.protein}g<span className="text-text-muted">/{PROTEIN_GOAL}g</span>
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Carbs", value: `${f.today.carbs}g`, color: "text-amber-app" },
              { label: "Fat", value: `${f.today.fat}g`, color: "text-cyan-app" },
              { label: "Sodium", value: `${f.today.sodium}mg`, color: "text-text-secondary" },
            ].map((m) => (
              <div key={m.label} className="bg-surface rounded-xl p-2.5 text-center">
                <p className={`num font-display font-bold text-sm ${m.color}`}>{m.value}</p>
                <p className="text-text-muted text-[10px] mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          {f.goals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.goals.map((g) => (
                <span key={g} className="px-2 py-0.5 bg-lime/5 border border-lime/15 rounded-full text-lime text-[10px]">{g}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SocialPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [friends, setFriends] = useState<FriendProgress[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "circle" | "groups">("profile");

  const [addCode, setAddCode] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addMsg, setAddMsg] = useState("");

  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupStatus, setGroupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [groupMsg, setGroupMsg] = useState("");

  const [copyMsg, setCopyMsg] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const qrRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserId(user.id);

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, friend_code, subscription_tier")
      .eq("id", user.id)
      .single();
    if (prof) {
      setProfile(prof);
      const devEmails = ["mcgresock@gmail.com"];
      const effectiveTier = devEmails.includes(user.email ?? "") ? "pro" : ((prof.subscription_tier as "free" | "pro") ?? "free");
      setTier(effectiveTier);
    }

    // Load friend progress via server API (bypasses RLS to read friends' logs)
    try {
      const res = await fetch("/api/friends/progress");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends ?? []);
      }
    } catch { /* friendships table may not exist yet */ }

    // Load groups
    try {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberRows && memberRows.length > 0) {
        const groupIds = memberRows.map((r) => r.group_id);
        const { data: groupData } = await supabase
          .from("nutrition_groups")
          .select("id, name, invite_code, created_by")
          .in("id", groupIds);

        if (groupData) {
          const groupsWithCount = await Promise.all(
            groupData.map(async (g) => {
              const { count } = await supabase
                .from("group_members")
                .select("*", { count: "exact", head: true })
                .eq("group_id", g.id);
              return { ...g, member_count: count ?? 1 };
            })
          );
          setGroups(groupsWithCount);
        }
      }
    } catch { /* group tables may not exist yet */ }

    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!addCode.trim()) return;
    setAddStatus("loading");
    setAddMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: target } = await supabase.from("profiles").select("id, display_name").eq("friend_code", addCode.trim().toUpperCase()).single();
      if (!target) { setAddStatus("error"); setAddMsg("No user found with that code."); return; }
      if (target.id === user.id) { setAddStatus("error"); setAddMsg("That's your own code!"); return; }
      const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: target.id, status: "accepted" });
      if (error && error.code !== "23505") { setAddStatus("error"); setAddMsg(error.message); return; }
      setAddStatus("success");
      setAddMsg(`Added ${target.display_name}!`);
      setAddCode("");
      load();
    } catch { setAddStatus("error"); setAddMsg("Something went wrong."); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setGroupStatus("loading");
    setGroupMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: group, error } = await supabase.from("nutrition_groups").insert({ name: groupName.trim(), created_by: user.id, invite_code: inviteCode }).select().single();
      if (error) { setGroupStatus("error"); setGroupMsg(error.message); return; }
      await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
      setGroupStatus("success");
      setGroupMsg(`Group "${groupName}" created! Code: ${inviteCode}`);
      setGroupName("");
      load();
    } catch { setGroupStatus("error"); setGroupMsg("Something went wrong."); }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    setGroupStatus("loading");
    setGroupMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: group } = await supabase.from("nutrition_groups").select("id, name").eq("invite_code", joinCode.trim().toUpperCase()).single();
      if (!group) { setGroupStatus("error"); setGroupMsg("No group found with that code."); return; }
      const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
      if (error && error.code !== "23505") { setGroupStatus("error"); setGroupMsg(error.message); return; }
      setGroupStatus("success");
      setGroupMsg(`Joined "${group.name}"!`);
      setJoinCode("");
      load();
    } catch { setGroupStatus("error"); setGroupMsg("Something went wrong."); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      setProfile((p) => p ? { ...p, avatar_url: url } : p);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyCode = async () => {
    if (!profile?.friend_code) return;
    await navigator.clipboard.writeText(profile.friend_code);
    setCopyMsg("Copied!");
    setTimeout(() => setCopyMsg(""), 2000);
  };

  const qrUrl = profile?.friend_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profile.friend_code)}&bgcolor=0c0e09&color=b6f040&margin=2`
    : null;

  if (loading) {
    return (
      <div className="px-6 py-8 flex items-center justify-center min-h-[60vh]">
        <ForageSpinner size={36} />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-28 lg:pb-8 max-w-2xl">
      <h1 className="font-display font-black text-3xl text-text-primary mb-1">Social</h1>
      <p className="text-text-secondary text-sm mb-6">Connect with friends and track goals together.</p>

      <div className="flex bg-surface border border-border rounded-xl p-1 gap-1 mb-6">
        {([
          { id: "profile", label: "Profile" },
          { id: "circle", label: `Circle${friends.length ? ` (${friends.length})` : ""}` },
          { id: "groups", label: `Groups${groups.length ? ` (${groups.length})` : ""}` },
        ] as const).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab.id ? "bg-lime text-canvas font-semibold" : "text-text-secondary hover:text-text-primary"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <UserAvatar src={profile?.avatar_url} size={96} className="ring-4 ring-lime/20" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-lime text-canvas rounded-full flex items-center justify-center shadow-md hover:bg-lime-glow transition-colors disabled:opacity-50"
                aria-label="Change profile photo">
                {avatarUploading ? (
                  <span className="text-[10px] font-bold">…</span>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="text-center">
              <div className="font-display font-bold text-xl text-text-primary">{profile?.display_name || "You"}</div>
              <div className="flex items-center gap-1.5 mt-1">
                {tier === "pro" && (
                  <span className="px-1.5 py-0.5 bg-lime/10 border border-lime/20 rounded-full text-lime text-[10px] font-medium">PRO</span>
                )}
                <span className="text-text-muted text-sm">
                  {tier === "pro" ? "Premium Forage Member" : "Forage Member"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Your Friend Code</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-display text-2xl font-bold text-lime tracking-[0.2em] bg-lime/5 border border-lime/20 rounded-xl px-4 py-3 text-center">
                {profile?.friend_code || "——————"}
              </div>
              <button onClick={copyCode}
                className="px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-border-bright transition-all font-medium">
                {copyMsg || "Copy"}
              </button>
            </div>
            <p className="text-text-muted text-xs mt-2 text-center">Share this code with friends so they can add you</p>
          </div>

          {qrUrl && (
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="text-xs text-text-muted uppercase tracking-wider">QR Code</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={qrRef} src={qrUrl} alt="Friend QR Code" className="w-44 h-44 rounded-xl border border-lime/20" />
              <p className="text-text-muted text-xs text-center">Someone can scan this to get your friend code</p>
            </div>
          )}

          {!profile?.friend_code && (
            <div className="bg-amber-app/5 border border-amber-app/20 rounded-2xl p-4 text-center">
              <p className="text-amber-app text-sm font-medium mb-1">Friend code not set up yet</p>
              <p className="text-text-muted text-xs">Run the database setup SQL to enable friend codes.</p>
            </div>
          )}
        </div>
      )}

      {/* CIRCLE TAB */}
      {activeTab === "circle" && (
        <div className="space-y-4">
          {/* Add friend */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Add to Circle</div>
            <div className="flex gap-2">
              <input
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                placeholder="Enter friend code…"
                maxLength={8}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm font-display tracking-[0.15em] focus:outline-none focus:border-lime/50 uppercase transition-all"
              />
              <button
                onClick={handleAddFriend}
                disabled={!addCode.trim() || addStatus === "loading"}
                className="px-5 py-3 bg-lime text-canvas font-bold rounded-xl text-sm hover:bg-lime-glow transition-all disabled:opacity-40">
                {addStatus === "loading" ? "…" : "Add"}
              </button>
            </div>
            {addMsg && <p className={`text-xs mt-2 ${addStatus === "success" ? "text-lime" : "text-red-400"}`}>{addMsg}</p>}
          </div>

          {friends.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <div className="text-text-primary font-medium mb-1">Your circle is empty</div>
              <div className="text-text-muted text-sm">Add friends with their code to see their daily progress</div>
            </div>
          ) : (
            <>
              <p className="text-text-muted text-xs px-1">Tap a card to see macros · ✓ = near calorie goal · P = near protein goal</p>
              <div className="space-y-3">
                {friends
                  .sort((a, b) => b.today.calories - a.today.calories)
                  .map((f) => <FriendCard key={f.id} f={f} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Create a Group</div>
            <div className="flex gap-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name…"
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-lime/50 transition-all"
              />
              <button onClick={handleCreateGroup} disabled={!groupName.trim() || groupStatus === "loading"}
                className="px-5 py-3 bg-lime text-canvas font-bold rounded-xl text-sm hover:bg-lime-glow transition-all disabled:opacity-40">
                Create
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Join a Group</div>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code…"
                maxLength={8}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm font-display tracking-[0.15em] uppercase focus:outline-none focus:border-lime/50 transition-all"
              />
              <button onClick={handleJoinGroup} disabled={!joinCode.trim() || groupStatus === "loading"}
                className="px-5 py-3 bg-surface border border-border text-text-primary font-bold rounded-xl text-sm hover:border-lime/40 hover:text-lime transition-all disabled:opacity-40">
                Join
              </button>
            </div>
            {groupMsg && <p className={`text-xs mt-2 ${groupStatus === "success" ? "text-lime" : "text-red-400"}`}>{groupMsg}</p>}
          </div>

          {groups.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">💪</div>
              <div className="text-text-primary font-medium mb-1">No groups yet</div>
              <div className="text-text-muted text-sm">Create one or join with an invite code</div>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text-primary font-semibold">{g.name}</div>
                      <div className="text-text-muted text-xs mt-0.5">{g.member_count} {g.member_count === 1 ? "member" : "members"}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-text-muted mb-1">Invite code</div>
                      <div className="font-display text-lime font-bold tracking-[0.15em] text-sm bg-lime/10 border border-lime/20 rounded-lg px-2 py-1">{g.invite_code}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
