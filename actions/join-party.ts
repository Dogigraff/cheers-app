"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JoinPartyResult =
  | { success: true; matchId: string }
  | { success: false; error: string };

export async function joinParty(beaconId: string): Promise<JoinPartyResult> {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient<Database>;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to join a party" };
    }

    // Ensure profile exists (for display in chat)
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "User",
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        reputation: 100,
      },
      { onConflict: "id" }
    );

    // Idempotent: check if user is already in party_members for this beacon (use user_id)
    const { data: existing } = await supabase
      .from("party_members")
      .select("id")
      .eq("beacon_id", beaconId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return { success: true, matchId: beaconId };
    }

    const { error: insertError } = await supabase.from("party_members").insert({
      beacon_id: beaconId,
      user_id: user.id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: true, matchId: beaconId };
      }
      console.error("Join party insert error:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, matchId: beaconId };
  } catch (error) {
    console.error("Join party error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join party",
    };
  }
}
