"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(username: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const trimmed = username.trim();
    if (!trimmed) {
      return { success: false, error: "Имя не может быть пустым" };
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const { error } = existing
      ? await supabase.from("profiles").update({ username: trimmed }).eq("id", user.id)
      : await supabase.from("profiles").insert({
          id: user.id,
          username: trimmed,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          reputation: 100,
        });

    if (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error("Error in updateProfile:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось обновить профиль",
    };
  }
}

export async function updateAvatar(avatarUrl: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const { error } = existing
      ? await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id)
      : await supabase.from("profiles").insert({
          id: user.id,
          avatar_url: avatarUrl,
          username: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
          reputation: 100,
        });

    if (error) {
      console.error("Error updating avatar:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error("Error in updateAvatar:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось обновить аватар",
    };
  }
}
