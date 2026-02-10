# 🔓 MISSION: DISABLE DATA ISOLATION (RLS FIX)

**Role:** Antigravity (Database Security Expert).  
**Status:** BLOCKED. Users can only see their own data. Cross-user visibility is failing.  
**Diagnosis:** The RLS (Row Level Security) policy on `public.beacons` is likely defaulting to `auth.uid() = user_id`.

---

## OBJECTIVE

**Nuclear Option** SQL script that:

1. **WIPE** all existing policies on the `beacons` table (remove restrictive "own data only" rules).
2. **CREATE** a generic "Public Read" policy (`USING (true)`).
3. **FORCE** the `get_nearby_beacons` function to run as `SECURITY DEFINER` (Admin Mode), so it bypasses RLS.

---

## ⚠️ HOW TO APPLY

Run this script in **Supabase Dashboard → SQL Editor**, or via `supabase db execute` / migration.

---

## SQL SCRIPT

```sql
-- 🚨 NUCLEAR VISIBILITY FIX 🚨

BEGIN;

-- 1. Enable RLS (Good practice, but we will make it open)
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
-- We use a pragmatic approach to drop potential conflicting policies by name
DROP POLICY IF EXISTS "Everyone can see beacons" ON public.beacons;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.beacons;
DROP POLICY IF EXISTS "Users can view their own beacons" ON public.beacons;
DROP POLICY IF EXISTS "Individual view" ON public.beacons;

-- 3. CREATE THE "OPEN EYES" POLICY
-- This allows ANY logged-in or anonymous user to SELECT all rows
CREATE POLICY "Public Read Access"
ON public.beacons FOR SELECT
USING (true);

-- 4. GRANT INSERT POLICY (So they can still create)
DROP POLICY IF EXISTS "Users can insert their own beacons" ON public.beacons;
CREATE POLICY "Users can insert their own beacons"
ON public.beacons FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. REINFORCE THE RPC FUNCTION (Admin Mode)
-- We drop old variations to prevent conflicts
DROP FUNCTION IF EXISTS get_nearby_beacons(float, float, float);
DROP FUNCTION IF EXISTS get_nearby_beacons(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION get_nearby_beacons(
  lat double precision,
  long double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  location geometry,
  beacon_lat double precision,
  beacon_lng double precision,
  mood text,
  assets jsonb,
  expires_at timestamptz,
  is_active boolean,
  created_at timestamptz,
  username text,
  avatar_url text,
  reputation int
)
LANGUAGE plpgsql
SECURITY DEFINER -- <--- CRITICAL: Bypasses RLS
SET search_path = public -- <--- CRITICAL: Prevents search_path hijacking
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    b.location,
    ST_Y(b.location::geometry) as beacon_lat,
    ST_X(b.location::geometry) as beacon_lng,
    b.mood,
    b.assets,
    b.expires_at,
    b.is_active,
    b.created_at,
    p.username,
    p.avatar_url,
    p.reputation
  FROM
    public.beacons b
  LEFT JOIN
    public.profiles p ON b.user_id = p.id
  WHERE
    ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(long, lat), 4326),
      radius_meters
    )
    AND b.expires_at > now()
    AND b.is_active = true;
END;
$$;

-- 6. ENSURE PROFILES ARE VISIBLE TOO
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
CREATE POLICY "Public profiles"
ON public.profiles FOR SELECT
USING (true);

COMMIT;
```

---

## NOTES

- **`SECURITY DEFINER`** — function runs with definer rights and ignores RLS on `beacons` / `profiles` when reading.
- **`SET search_path = public`** — avoids search_path hijacking.
- After applying, the client must call `get_nearby_beacons(lat, long, radius_meters)` with **numeric** `radius_meters` (integer or float); the new signature uses `double precision`, so both work.
- **Applied migration:** `nuclear_visibility_fix_rls_and_get_nearby_beacons` — RLS policies and `get_nearby_beacons` have been applied. For `beacons.location` type **geography**, the migration uses `ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography` in `ST_DWithin` and `b.location::geometry` in the SELECT.
