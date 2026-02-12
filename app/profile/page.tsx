"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { updateProfile } from "@/actions/update-profile";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  reputation: number | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [displayNameDirty, setDisplayNameDirty] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!mounted || !u) {
        if (!u) router.replace("/login");
        setLoading(false);
        return;
      }
      setUser(u);

      const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
        import("@/types/supabase").Database
      >;
      const { data: prof } = await db.from("profiles").select("id, username, avatar_url, reputation").eq("id", u.id).single();

      if (!mounted) return;

      if (prof) {
        setProfile(prof);
        setDisplayName(prof.username ?? "");
      } else {
        const fallback = (u.user_metadata?.full_name as string) ?? u.email?.split("@")[0] ?? "User";
        setProfile({
          id: u.id,
          username: fallback,
          avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
          reputation: 100,
        });
        setDisplayName(fallback);
      }
      setLoading(false);
    }

    void load();
    return () => { mounted = false; };
  }, [supabase, router]);

  const handleSaveName = async () => {
    if (!displayName.trim() || !displayNameDirty) return;
    setSaving(true);
    const result = await updateProfile(displayName);
    setSaving(false);
    if (result.success) {
      setProfile((p) => (p ? { ...p, username: displayName.trim() } : null));
      setDisplayNameDirty(false);
      toast.success("Имя сохранено");
    } else {
      toast.error(result.error);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const reputationDisplay = profile?.reputation != null
    ? `Level ${Math.min(5, Math.floor(profile.reputation / 100) + 1)} · ${profile.reputation} Points`
    : "Level 1 · 0 Points";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[60vh] px-4 pt-6 pb-20">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-bold mb-6" style={{ color: "#00f3ff", textShadow: "0 0 10px rgba(0,243,255,0.5)" }}>
          Profile
        </h1>

        {/* Cyberpunk Identity Card — dark glass + neon */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(20, 20, 35, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 243, 255, 0.4)",
            boxShadow: "0 0 20px rgba(0, 243, 255, 0.15), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex flex-col items-center">
            {/* Avatar with glowing cyan border */}
            <div className="relative mb-6">
              <div
                className="rounded-full p-1"
                style={{
                  boxShadow: "0 0 24px rgba(0, 243, 255, 0.5), 0 0 48px rgba(0, 243, 255, 0.2)",
                  background: "linear-gradient(135deg, rgba(0,243,255,0.6) 0%, rgba(0,243,255,0.2) 100%)",
                }}
              >
                <Avatar className="w-24 h-24 rounded-full border-2 border-transparent">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback
                    className="rounded-full text-2xl font-bold text-cyan-400"
                    style={{ backgroundColor: "#18181b", color: "#22d3ee" }}
                  >
                    {(profile?.username ?? displayName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0, 243, 255, 0.9)", boxShadow: "0 0 8px rgba(0,243,255,0.8)" }}
              >
                <Sparkles className="w-3 h-3 text-black" />
              </div>
            </div>

            {/* Editable Display Name — Input + Save */}
            <div className="w-full space-y-2 mb-6">
              <label className="text-xs uppercase tracking-wider block" style={{ color: "#71717a" }}>
                Display Name
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setDisplayNameDirty(true);
                  }}
                  placeholder="Your name"
                  className="flex-1 min-w-0 h-11 rounded-lg border-2 px-3 text-foreground focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{
                    backgroundColor: "rgba(24, 24, 27, 0.9)",
                    borderColor: "rgba(255,255,255,0.15)",
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSaveName}
                  disabled={!displayNameDirty || saving || !displayName.trim()}
                  className="h-11 w-11 shrink-0 rounded-lg border"
                  style={{
                    backgroundColor: "rgba(0, 243, 255, 0.2)",
                    borderColor: "rgba(0, 243, 255, 0.5)",
                    color: "#22d3ee",
                  }}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Reputation Score — always visible */}
            <div
              className="w-full py-4 px-4 rounded-xl mb-6"
              style={{
                backgroundColor: "rgba(24, 24, 27, 0.8)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#71717a" }}>
                Reputation Score
              </p>
              <p className="font-semibold text-lg" style={{ color: "#22d3ee" }}>
                {reputationDisplay}
              </p>
            </div>

            {user?.email && (
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Log Out — cyan outline to match cyberpunk theme */}
        <Button
          variant="outline"
          className="w-full h-12 mt-6 text-base font-medium rounded-xl border-2 border-cyan-500/50 text-cyan-400 bg-transparent hover:bg-cyan-500/10 hover:border-cyan-400"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {signingOut ? "Выход…" : "Log Out"}
        </Button>
      </div>
    </div>
  );
}
