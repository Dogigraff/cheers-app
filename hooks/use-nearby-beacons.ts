"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

export interface NearbyBeacon {
  id: string;
  user_id: string;
  location: unknown;
  beacon_lat: number;
  beacon_lng: number;
  mood: string | null;
  assets: {
    type?: string;
    brand?: string;
  } | null;
  expires_at: string;
  is_active: boolean | null;
  created_at: string | null;
  username: string | null;
  avatar_url: string | null;
  reputation: number | null;
}

interface UserLocation {
  lat: number;
  long: number;
}

interface UseNearbyBeaconsReturn {
  beacons: NearbyBeacon[];
  loading: boolean;
  error: string | null;
  userLocation: UserLocation | null;
  refetch: () => Promise<void>;
}

const MOSCOW_CENTER = { lat: 55.763, long: 37.593 }; // Patriarch Ponds

// ✅ Single client instance — reused across all calls (no auth session loss)
const supabase = createClient();

export function useNearbyBeacons(
  radiusMeters: number = 5000
): UseNearbyBeaconsReturn {
  const [beacons, setBeacons] = useState<NearbyBeacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const userLocationRef = useRef<UserLocation | null>(null);

  // ✅ Stable fetchBeacons via useCallback
  const fetchBeacons = useCallback(
    async (lat: number, long: number, fallbackRadius?: number) => {
      try {
        console.log(`[Beacons] Fetching… lat=${lat} long=${long} radius=${fallbackRadius ?? radiusMeters}`);
        setLoading(true);
        setError(null);

        const radius = fallbackRadius ?? radiusMeters;
        const args = { lat, long, radius_meters: Math.round(radius) };
        const { data, error: rpcError } = await (
          supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
            import("@/types/supabase").Database
          >
        ).rpc("get_nearby_beacons", args);

        if (rpcError) {
          console.error("[Beacons] RPC Error:", rpcError);
          throw rpcError;
        }

        const raw = (data ?? []) as Record<string, unknown>[];
        if (raw.length > 0) {
          console.log("🔍 INSPECT FIRST BEACON STRUCTURE:", raw[0]);
        }
        let normalized = raw.map((b) => {
          const lat = b.beacon_lat ?? b.lat ?? b.latitude ?? (b.location as { lat?: number } | undefined)?.lat;
          const lng = b.beacon_lng ?? b.lng ?? b.long ?? b.longitude ?? (b.location as { long?: number } | undefined)?.long;
          return {
            ...b,
            beacon_lat: Number(lat),
            beacon_lng: Number(lng),
          } as NearbyBeacon;
        });

        // If 0 beacons nearby — try with world radius (demo fallback)
        if (normalized.length === 0 && !fallbackRadius) {
          console.log("[Beacons] No nearby results, trying world radius…");
          const WORLD_RADIUS_M = 50_000_000; // ~50 000 km
          const res = await (
            supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
              import("@/types/supabase").Database
            >
          ).rpc("get_nearby_beacons", {
            lat,
            long,
            radius_meters: Math.round(WORLD_RADIUS_M),
          });
          if (!res.error && res.data?.length) {
            console.log("[Beacons] World radius data:", res.data);
            const fallbackRaw = (res.data ?? []) as Record<string, unknown>[];
            normalized = fallbackRaw.map((b) => {
              const fallbackLat = b.beacon_lat ?? b.lat ?? b.latitude ?? (b.location as { lat?: number } | undefined)?.lat;
              const fallbackLng = b.beacon_lng ?? b.lng ?? b.long ?? b.longitude ?? (b.location as { long?: number } | undefined)?.long;
              return {
                ...b,
                beacon_lat: Number(fallbackLat),
                beacon_lng: Number(fallbackLng),
              } as NearbyBeacon;
            });
          } else if (res.error) {
            console.error("[Beacons] World radius RPC Error:", res.error);
          }
        }

        setBeacons(normalized);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch beacons";
        setError(errorMessage);
        console.error("[Beacons] Error fetching beacons:", err);
      } finally {
        setLoading(false);
      }
    },
    [radiusMeters]
  );

  useEffect(() => {
    let mounted = true;

    const getLocation = () => {
      if (!navigator.geolocation) {
        console.warn("[Beacons] Geolocation not supported, using Moscow center");
        if (mounted) {
          setUserLocation(MOSCOW_CENTER);
          userLocationRef.current = MOSCOW_CENTER;
          fetchBeacons(MOSCOW_CENTER.lat, MOSCOW_CENTER.long);
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mounted) return;

          const location = {
            lat: position.coords.latitude,
            long: position.coords.longitude,
          };

          setUserLocation(location);
          userLocationRef.current = location;
          fetchBeacons(location.lat, location.long);
        },
        (err) => {
          console.warn("[Beacons] Geolocation denied:", err);
          if (mounted) {
            setUserLocation(MOSCOW_CENTER);
            userLocationRef.current = MOSCOW_CENTER;
            fetchBeacons(MOSCOW_CENTER.lat, MOSCOW_CENTER.long);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    };

    getLocation();

    return () => {
      mounted = false;
    };
  }, [fetchBeacons]);

  // ✅ Stable refetch — uses ref to avoid stale closure + memoized with useCallback
  const refetch = useCallback(async () => {
    const loc = userLocationRef.current;
    if (loc) {
      await fetchBeacons(loc.lat, loc.long);
    } else {
      console.warn("[Beacons] refetch called but userLocation is still null");
    }
  }, [fetchBeacons]);

  return {
    beacons,
    loading,
    error,
    userLocation,
    refetch,
  };
}
