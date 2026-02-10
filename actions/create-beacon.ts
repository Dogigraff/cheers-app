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
}

export async function createBeacon(params: CreateBeaconParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be logged in to create a beacon");
    }

    // Ensure profile exists (beacons.user_id FK → profiles.id). Create if missing.
    const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient<import("@/types/supabase").Database>;
    await db.from("profiles").upsert(
      {
        id: user.id,
        username: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "User",
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        reputation: 100,
      },
      { onConflict: "id" }
    );

    // PostGIS/ST_Point: longitude first, then latitude (WKT standard)
    const locationWKT = `POINT(${params.location.lng} ${params.location.lat})`;

    // Use RPC function to properly handle GEOGRAPHY type
    const args = {
      p_user_id: user.id,
      p_location_wkt: locationWKT,
      p_mood: params.mood,
      p_assets: params.assets as import("@/types/supabase").Json,
      p_expires_at: params.expiresAt,
    };
    const { data, error } = await db.rpc("create_beacon_with_location", args);

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
