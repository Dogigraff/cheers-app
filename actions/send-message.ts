"use server";

import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SendMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendMessage(
  beaconId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, error: "Message cannot be empty" };
    }

    const supabase = (await createClient()) as unknown as SupabaseClient<Database>;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to send messages" };
    }

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "User",
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        reputation: 100,
      },
      { onConflict: "id" }
    );

    const { data, error } = await supabase
      .from("messages" as any)
      .insert({
        beacon_id: beaconId,
        user_id: user.id,
        content: trimmed,
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (error) {
      console.error("Send message error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Send message error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}
