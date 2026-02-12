"use server";

import { createClient } from "@/utils/supabase/server";

interface CreateBeaconParams {
  mood: string;
  assets: {
    type: string;
    brand?: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  expiresAt: string;
  locationName?: string;
}

export async function createBeacon(params: CreateBeaconParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be logged in to create a beacon");
    }

    // Ensure profile exists (beacons.user_id FK → profiles.id). Create only if missing — do NOT overwrite avatar.
    const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient<import("@/types/supabase").Database>;
    await db.from("profiles").upsert(
      {
        id: user.id,
        username: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "User",
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        reputation: 100,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // PostGIS/ST_Point: longitude first, then latitude (WKT standard)
    const locationWKT = `POINT(${params.location.lng} ${params.location.lat})`;

    const expiresAt = params.expiresAt;

    // Direct insert — bypass strict types with `as any` for the new location_name column
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.from("beacons") as any)
      .insert({
        user_id: user.id,
        location: locationWKT,
        mood: params.mood,
        assets: params.assets,
        expires_at: expiresAt,
        location_name: params.locationName || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating beacon:", error);
      throw new Error(`Failed to create beacon: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in createBeacon:", error);
    throw error;
  }
}
