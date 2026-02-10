# 🚑 DEBUG REPORT v2 — Invisible Beacons

**Date:** 2026-02-10
**Status:** CRITICAL — All beacons gone from map after enabling Realtime + RLS

---

## 1. The Diagnosis

**Primary Cause: Infinite Realtime re-subscription loop destroying state.**

The `refetch` function returned by `useNearbyBeacons()` is a plain function declaration — **not memoized**. It gets a new identity on every render. This makes the two `useEffect` hooks in `map-view.tsx` that depend on `refetch` re-run on every single render:

1. **Event listener effect** (line 291–295) — subscribes/unsubscribes from `BEACONS_REFRESH_EVENT` infinitely.
2. **Realtime subscription effect** (line 298–314) — creates a new Supabase channel, subscribes, then immediately tears it down and recreates it on the *next* render. This rapid subscribe/unsubscribe churn means the channel never stabilizes.

**Consequence chain:**

```
refetch changes identity → useEffect re-runs → channel unsubscribes + resubscribes
→ setLoading(true) fires during re-fetch → race conditions → beacons array ends up empty
→ even if data returns, next render overwrites it again
```

**Secondary Causes:**

| # | Issue | Impact |
|---|-------|--------|
| A | `fetchBeacons()` calls `createClient()` internally — creates a **new** Supabase client on every fetch | May lose auth JWT context, causing RPC to execute as anonymous user. If `get_nearby_beacons` is `SECURITY INVOKER` + RLS is on → **empty result**. |
| B | `refetch()` silently does nothing if `userLocation` is still `null` | If Realtime fires before geolocation resolves, `refetch()` is a no-op. |
| C | 🛡️ **RLS on `profiles` table** — the `get_nearby_beacons` function JOINs `profiles`. If `profiles` has RLS enabled but no `SELECT` policy, the join returns **zero rows** even if beacons exist. | **This alone can cause all beacons to vanish.** |

---

## 2. Immediate Fixes

### Fix A: `hooks/use-nearby-beacons.ts` (FULL REPLACEMENT)

```typescript
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

// ✅ Single client instance (module-level) — reused across all calls
const supabase = createClient();

export function useNearbyBeacons(
  radiusMeters: number = 5000
): UseNearbyBeaconsReturn {
  const [beacons, setBeacons] = useState<NearbyBeacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const userLocationRef = useRef<UserLocation | null>(null);

  // ✅ Stable fetchBeacons via useCallback — no new client per call
  const fetchBeacons = useCallback(
    async (lat: number, long: number, fallbackRadius?: number) => {
      try {
        console.log(`[Beacons] Fetching… lat=${lat} long=${long} radius=${fallbackRadius ?? radiusMeters}`);
        setLoading(true);
        setError(null);

        const radius = fallbackRadius ?? radiusMeters;
        const args = { lat, long, radius_meters: radius };
        const { data, error: rpcError } = await (
          supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
            import("@/types/supabase").Database
          >
        ).rpc("get_nearby_beacons", args);

        if (rpcError) {
          console.error("[Beacons] RPC Error:", rpcError);
          throw rpcError;
        }

        const raw = (data ?? []) as NearbyBeacon[];
        console.log("[Beacons] Raw data from DB:", raw);

        let normalized = raw.map((b) => ({
          ...b,
          beacon_lat: Number(b.beacon_lat),
          beacon_lng: Number(b.beacon_lng),
        }));

        // If 0 beacons nearby — try with world radius (demo fallback)
        if (normalized.length === 0 && !fallbackRadius) {
          console.log("[Beacons] No nearby results, trying world radius…");
          const WORLD_RADIUS_M = 50_000_000;
          const res = await (
            supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
              import("@/types/supabase").Database
            >
          ).rpc("get_nearby_beacons", {
            lat,
            long,
            radius_meters: WORLD_RADIUS_M,
          });
          if (!res.error && res.data?.length) {
            console.log("[Beacons] World radius data:", res.data);
            normalized = (res.data as NearbyBeacon[]).map((b) => ({
              ...b,
              beacon_lat: Number(b.beacon_lat),
              beacon_lng: Number(b.beacon_lng),
            }));
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
          maximumAge: 60000,
        }
      );
    };

    getLocation();

    return () => {
      mounted = false;
    };
  }, [fetchBeacons]);

  // ✅ Stable refetch via useCallback + ref (prevents downstream re-subscriptions)
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
```

### Fix B: Add debug logging to Realtime in `map-view.tsx`

In the Realtime `useEffect` (around line 298), change the callback to include logging:

```diff
       .on(
         "postgres_changes",
         { event: "INSERT", schema: "public", table: "beacons" },
-        () => {
+        (payload: unknown) => {
+          console.log("[Beacons] Realtime event received:", payload);
           refetch();
           toast("New party detected nearby! 🍷");
         }
       )
```

### Fix C: SQL — Check & Fix `profiles` RLS

Run these in **Supabase SQL Editor**:

```sql
-- 1. Check if RLS is enabled on profiles
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'profiles';

-- 2. If relrowsecurity = true, add a read policy:
CREATE POLICY "Everyone can see profiles"
  ON profiles FOR SELECT
  USING (true);

-- 3. Check if get_nearby_beacons is SECURITY INVOKER or DEFINER:
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'get_nearby_beacons';
-- prosecdef = true means SECURITY DEFINER (bypasses RLS) ← what we want
-- prosecdef = false means SECURITY INVOKER (RLS applies) ← problem!

-- 4. If SECURITY INVOKER, switch to DEFINER:
ALTER FUNCTION get_nearby_beacons(double precision, double precision, double precision)
  SECURITY DEFINER;
```

---

## 3. Console Logger (Summary)

After applying the fixes above, the following logs will appear in the browser console:

| When | Log | What to check |
|------|-----|---------------|
| Page load | `[Beacons] Fetching… lat=XX long=XX radius=5000` | Confirms fetchBeacons is called |
| After RPC | `[Beacons] Raw data from DB: [...]` | Shows actual DB response. **If empty array → RLS issue** |
| If 0 nearby | `[Beacons] No nearby results, trying world radius…` | Fallback kick-in |
| On new beacon | `[Beacons] Realtime event received: {…}` | Confirms Realtime is working |
| If no location | `[Beacons] refetch called but userLocation is still null` | Explains silent no-op |

---

## Quick Decision Tree

```
Open browser console → reload page
│
├─ See "[Beacons] Fetching…"?
│   ├─ YES → See "[Beacons] Raw data from DB: []" (empty)?
│   │   ├─ YES → 🛡️ RLS problem. Run SQL Fix C above.
│   │   └─ NO (has data) → Beacons should render. If not, check BeaconsSync.
│   └─ NO → fetchBeacons never called. Check geolocation permissions.
│
└─ See errors in console?
    └─ YES → Share the error message for further debugging.
```
