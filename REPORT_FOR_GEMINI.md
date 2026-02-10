# Reality Check — Project Audit Report for Architect

**Project:** Cheers (Social Discovery PWA)  
**Date:** 2026-02-09  
**Purpose:** Sync with architect; distinguish what exists from what is assumed or incomplete.

---

## 1. File Structure Audit

### app/
| File | Exists | Notes |
|------|--------|-------|
| `app/globals.css` | ✅ | Tailwind + dark theme + Yandex map CSS |
| `app/layout.tsx` | ✅ | Root layout, Inter font, Toaster, no Leaflet CSS |
| `app/page.tsx` | ✅ | Client page; dynamic MapView (ssr: false) + CreateBeaconBtn |
| `app/api/` | ✅ | Directory exists (only `.gitkeep`) — no API routes implemented |

### components/
| File | Exists | Notes |
|------|--------|-------|
| `components/map/map-view.tsx` | ✅ | Main map; Yandex only |
| `components/beacon/create-beacon-btn.tsx` | ✅ | FAB + Sheet form; calls Server Action |
| `components/ui/avatar.tsx` | ✅ | Shadcn |
| `components/ui/button.tsx` | ✅ | Shadcn |
| `components/ui/input.tsx` | ✅ | Shadcn |
| `components/ui/label.tsx` | ✅ | Shadcn |
| `components/ui/sheet.tsx` | ✅ | Shadcn |
| `components/ui/slider.tsx` | ✅ | Shadcn |

### actions/
| File | Exists | Notes |
|------|--------|-------|
| `actions/create-beacon.ts` | ✅ | Server Action; uses RPC `create_beacon_with_location` |

### hooks/
| File | Exists | Notes |
|------|--------|-------|
| `hooks/use-nearby-beacons.ts` | ✅ | Geolocation + Supabase RPC `get_nearby_beacons` |

**Verdict:** All referenced key files exist. No missing app/components/actions/hooks entries.

---

## 2. Tech Stack Verification

### Maps: Yandex only?
- **Runtime dependencies (`package.json`):**  
  - `@pbe/react-yandex-maps`: ✅ present  
  - `react-leaflet` / `leaflet`: ❌ not in `dependencies`
- **DevDependencies:**  
  - `@types/leaflet`: ⚠️ **still present** — leftover; no runtime Leaflet code.
- **Code:**
  - `components/map/map-view.tsx` imports: `YMaps`, `Map`, `Placemark` from `@pbe/react-yandex-maps` — ✅ only Yandex.
  - No `leaflet` or `react-leaflet` imports anywhere in source.
  - `app/layout.tsx`: no Leaflet CSS import.

**Verdict:** App is fully on Yandex Maps in code. Leaflet removed except for unused `@types/leaflet` in devDependencies (safe to remove).

---

## 3. Logic Connectivity

### Create Beacon flow
- **Button:** `components/beacon/create-beacon-btn.tsx` — FAB opens Sheet with form (mood, drink type, duration).
- **Submit:** `handleSubmit` calls `createBeacon(...)` imported from `@/actions/create-beacon`.
- **Server Action:** `actions/create-beacon.ts` — `"use server"`, uses `createClient()` from `@/utils/supabase/server`, calls `supabase.rpc("create_beacon_with_location", { p_user_id, p_location_wkt, p_mood, p_assets, p_expires_at })`.
- **User identity:** Uses hardcoded `TEST_USER_ID` (Alex_Whiskey); no real auth yet.

**Verdict:** Create Beacon **does** call a real Server Action; flow is connected end-to-end (with test user).

### Join Party action
- **UI:** In `map-view.tsx`, clicking a Placemark opens `BeaconDetailsSheet` with a "Join Party 🎉" button.
- **Handler:** `onClick` only does `console.log("Join party:", beacon.id)` and a `// TODO: Implement join party logic`.
- **Backend:** No Server Action or API route for "join party"; no insert into `interactions` or `matches`.

**Verdict:** Join Party is **not** implemented — UI only; no logic, no DB writes.

### types/supabase.ts vs DB schema
- **Docs schema (`docs/DB_SCHEMA.md`):** `profiles`, `beacons`, `interactions`, `matches`, `messages`; PostGIS for `beacons.location`.
- **types/supabase.ts:** Defines `Database['public']['Tables']` for:
  - `beacons`, `interactions`, `matches`, `messages`, `profiles` ✅  
  - Also `spatial_ref_sys` (PostGIS), plus many PostGIS `Functions` (e.g. `_st_*`).
- **RPCs used in app:**  
  - `get_nearby_beacons(lat, long, radius_meters)`  
  - `create_beacon_with_location(p_user_id, p_location_wkt, p_mood, p_assets, p_expires_at)`  
- **types/supabase.ts:** Does **not** define these two RPCs in `Database['public']['Functions']`. Code uses `as any` for both RPC calls to bypass typing.

**Verdict:** Table types align with discussed schema. RPC types are missing; types file is out of sync with actual DB functions.

---

## 4. Error Scan

### Imports vs installed components
- **UI imports:**  
  - `sheet`, `button`, `avatar`, `input`, `label`, `slider` — all exist under `components/ui/`. ✅  
- **Shadcn/Radix:**  
  - `package.json` has `@radix-ui/react-avatar`, `-dialog`, `-label`, `-slider`, `-slot`; `class-variance-authority`, `clsx`, `tailwind-merge`. ✅  
- **Unused import:**  
  - `create-beacon-btn.tsx` imports `Plus` from `lucide-react` but does not use it (only `Flame` is used). Minor; no runtime error.

### Map component
- `map-view.tsx` uses `<Map ... onError={...} />`.  
- `@pbe/react-yandex-maps` `Map` may not document or support `onError`; if not, this is a no-op or could be removed to avoid confusion.

### Build
- `npm run build` completes successfully (per prior runs). No missing-module errors reported for current code.

**Verdict:** No missing UI or Shadcn components. One unused import (`Plus`); optional cleanup. RPC calls rely on `as any` due to missing RPC types.

---

## 5. Current Status Summary

### Working 100%
- **File structure:** All key files in app/, components/, actions/, hooks/ exist.
- **Map stack:** Yandex Maps only in code; map loads, center/zoom, Placemarks with emoji.
- **Create Beacon:** Button → Sheet form → Server Action → Supabase RPC `create_beacon_with_location`; new beacon is written to DB (with test user).
- **Nearby beacons:** Hook calls `get_nearby_beacons` RPC; beacons (with profiles) returned and shown on map when data exists and not expired.
- **Beacon details:** Clicking a Placemark opens Sheet with avatar, username, distance, mood, assets, "Join Party" button.
- **UI/theme:** Dark layout, Sonner toasts, Shadcn components present and used.
- **Supabase client:** Browser and server clients use `Database` from `types/supabase.ts` for table typing.

### Half-baked / not implemented
- **Join Party:** Button exists; no action, no interaction/match creation, no navigation.
- **Auth:** No sign-in/sign-up; Create Beacon uses hardcoded test user.
- **RPC types:** `get_nearby_beacons` and `create_beacon_with_location` not in `types/supabase.ts`; RPC calls use `as any`.
- **Dark map theme:** Implemented via CSS + JS (filter on canvas); may be fragile across Yandex API versions; user previously reported white/black issues.
- **Refetch after Create Beacon:** Page uses `window.location.reload()` instead of refetching beacons in state.

### Leftover / cleanup
- **DevDependencies:** `@types/leaflet` still in package.json; no Leaflet code left.
- **Unused import:** `Plus` in `create-beacon-btn.tsx`.

---

## 6. Recommendations for Architect

1. **Remove** `@types/leaflet` from `devDependencies` to reflect Yandex-only stack.
2. **Regenerate** `types/supabase.ts` (e.g. `supabase gen types typescript`) and add or generate types for `get_nearby_beacons` and `create_beacon_with_location` so RPC calls can be typed.
3. **Define** "Join Party" behavior (e.g. insert into `interactions` and optionally create `matches`) and add a Server Action or API route; then wire the button in `map-view.tsx`.
4. **Plan** auth: replace `TEST_USER_ID` with real session user for Create Beacon and future Join Party.
5. **Optional:** Replace `window.location.reload()` after Create Beacon with a refetch (e.g. from `useNearbyBeacons`) or shared state for better UX.

---

*End of report.*
