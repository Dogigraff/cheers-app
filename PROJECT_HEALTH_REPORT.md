# 🏥 PROJECT HEALTH REPORT: CHEERS

**Audit Date:** 2026-02-09  
**Auditor:** Principal Software Architect  
**Project:** Cheers - Geolocation-based Social Discovery  
**Stack:** Next.js 14 (App Router), Supabase (Auth, DB, Realtime, PostGIS), Yandex Maps

---

## 1. Executive Summary

### 🔴 Status: FRAGILE

The project has a **functional skeleton** but contains **critical bugs that render core features invisible or broken**. The most pressing issues are:

1. **Coordinates are SWAPPED** — markers may appear in wrong locations or not at all
2. **Authentication is completely bypassed** — all users act as "Alex_Whiskey"
3. **No login UI exists** — there's nowhere for users to actually sign in

The project is suitable as a **demo prototype** but **NOT production-ready**.

---

## 2. Critical Bugs (Showstoppers)

### 🐛 BUG #1: Coordinate System Hell (Lat/Lng Swap)

> **Severity:** 🔴 CRITICAL  
> **Impact:** Markers invisible or appear in completely wrong locations

| File | Line | Issue |
|------|------|-------|
| `components/map/map-view.tsx` | 293 | Coordinates passed to Yandex are **swapped** |

**The Problem:**

```typescript
// Line 293 in map-view.tsx
const coordsForYandex: [number, number] = [beacon.beacon_lng, beacon.beacon_lat];
//                                           ^^^^ WRONG ORDER ^^^^
```

**Yandex Maps expects `[latitude, longitude]`** but the code passes `[longitude, latitude]`.

The comment on line 292 even acknowledges the confusion:
```typescript
// Yandex ждёт [широта, долгота]. Если маркеров не видно — возможно API отдаёт (lng, lat), пробуем обратный порядок
```

**The RPC `get_nearby_beacons` returns:**
- `beacon_lat` = latitude (correct naming)
- `beacon_lng` = longitude (correct naming)

**The Fix:**
```typescript
const coordsForYandex: [number, number] = [beacon.beacon_lat, beacon.beacon_lng];
```

---

### 🐛 BUG #2: Hardcoded User ID (The "Alex_Whiskey" Problem)

> **Severity:** 🔴 CRITICAL  
> **Impact:** All users impersonate the same test account; no real multi-user functionality

**Affected Files:**

| File | Line | Constant |
|------|------|----------|
| `actions/create-beacon.ts` | 7 | `TEST_USER_ID` |
| `actions/join-party.ts` | 7 | `TEST_USER_ID` |
| `actions/send-message.ts` | 7 | `TEST_USER_ID` |
| `app/chat/[id]/page.tsx` | 15 | `CURRENT_USER_ID` |

**The Problem:**

All server actions completely bypass Supabase Auth:

```typescript
// actions/create-beacon.ts:7
const TEST_USER_ID = "943b7cef-539c-4160-bfd4-7f158e4f0b90"; // Alex_Whiskey (from seed)
```

Instead of:
```typescript
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) throw new Error("Unauthorized");
const userId = user.id;
```

---

### 🐛 BUG #3: No Login UI Exists

> **Severity:** 🟠 HIGH  
> **Impact:** Users cannot register or log in

**Evidence:**
- Middleware references `/login` and `/auth` routes (line 46-47 in `utils/supabase/middleware.ts`)
- **These routes don't exist** — there is no `app/login/` or `app/auth/` directory
- The middleware currently **bypasses auth for `/` and `/chat` routes** (line 43-53)

**Middleware.ts (lines 43-53):**
```typescript
// Temporarily allow unauthenticated access to home and chat for MVP
// TODO: Add proper auth flow later
if (
  !user &&
  request.nextUrl.pathname !== "/" &&
  !request.nextUrl.pathname.startsWith("/login") &&
  !request.nextUrl.pathname.startsWith("/auth") &&
  !request.nextUrl.pathname.startsWith("/chat")
) {
  // redirect to login...
}
```

---

## 3. Architecture Gaps

### ❌ Missing Components

| Component | Status | Notes |
|-----------|--------|-------|
| Login/Register UI | ❌ Missing | No user registration flow |
| Auth Context/Provider | ❌ Missing | No way to access current user in React |
| Error Boundaries | ❌ Missing | Unhandled errors crash the app |
| Protected Route Wrapper | ⚠️ Partial | Middleware exists but routes don't |
| Profile Page | ❌ Missing | No way to view/edit profile |
| Logout Button | ❌ Missing | No way to sign out |
| Environment Validation | ❌ Missing | No check that `NEXT_PUBLIC_*` vars exist |

### ⚠️ Technical Debt

| Issue | Location | Risk |
|-------|----------|------|
| `as unknown as` type casting | Multiple files | Type safety completely bypassed |
| `window.location.reload()` | `create-beacon-btn.tsx:89` | Poor UX, should refetch data instead |
| Hardcoded Moscow fallback | Multiple files | Demo convenience, will confuse users outside Russia |
| Canvas filter hack for dark mode | `map-view.tsx:176-214` | Fragile, breaks on Yandex API updates |

---

## 4. The Good News ✅

Despite the critical issues, several parts are **correctly implemented**:

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Types | ✅ Correct | `types/supabase.ts` includes `get_nearby_beacons` and `create_beacon_with_location` RPCs |
| Realtime Subscription | ✅ Correct | `app/chat/[id]/page.tsx` lines 84-108 properly subscribe to `postgres_changes` |
| PostGIS WKT Format | ✅ Correct | `actions/create-beacon.ts` line 27 uses `POINT(lng lat)` which is correct for PostGIS |
| Server Client Setup | ✅ Correct | Separate client/server Supabase utilities |
| Dynamic Import for Map | ✅ Correct | SSR disabled to prevent Yandex hydration issues |

---

## 5. Zombie Code & Unused Files

### Files to Review (Potentially Dead)

| File/Directory | Status | Notes |
|----------------|--------|-------|
| `app/api/` | 🧟 Empty | Contains only `.gitkeep` — no API routes implemented |
| `store/` | 🧟 Empty | Zustand/Redux store directory exists but unused |
| `actions/join-party.ts` | ⚠️ Used | Actually called from `map-view.tsx` — NOT zombie |
| `docs/` folder | 📚 Documentation | 7 files of debugging notes (keep for reference) |

### Unused Imports Check

No significant unused imports found. The codebase is relatively lean.

---

## 6. The "Rescue Plan" (Step-by-Step)

### Step 1: Fix Critical Bugs (30 minutes)

#### 1.1 Fix Coordinate Swap

**File:** `components/map/map-view.tsx`  
**Line:** 293

```diff
- const coordsForYandex: [number, number] = [beacon.beacon_lng, beacon.beacon_lat];
+ const coordsForYandex: [number, number] = [beacon.beacon_lat, beacon.beacon_lng];
```

#### 1.2 Implement Proper Auth in Server Actions

**All actions need this pattern:**

```typescript
// actions/create-beacon.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function createBeacon(params: CreateBeaconParams) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized: Please log in to create a beacon");
  }

  // Use actual user ID
  const args = {
    p_user_id: user.id,  // ← NOT hardcoded
    // ... rest of params
  };
  
  // ...
}
```

**Repeat for:**
- `actions/join-party.ts`
- `actions/send-message.ts`
- `app/chat/[id]/page.tsx` (needs auth context)

---

### Step 2: Create Login Flow (1-2 hours)

1. Create `app/login/page.tsx` with email/password or magic link
2. Create `app/auth/callback/route.ts` for OAuth handling
3. Add `AuthProvider` context to access user throughout app
4. Add logout button to header

---

### Step 3: Cleanup (15 minutes)

| Action | Target |
|--------|--------|
| Delete empty directory | `app/api/` (or implement API routes) |
| Delete empty directory | `store/` (or implement state management) |
| Remove debug console.logs | Multiple files |
| Remove hardcoded `TEST_USER_ID` constants | 4 files |

---

### Step 4: Next Features to Implement

**Priority order:**

1. **User Authentication** — Critical for any multi-user functionality
2. **Beacon Expiration Cleanup** — Add CRON job or Supabase function to deactivate expired beacons
3. **Push Notifications** — Alert users when someone joins their beacon
4. **User Profile Page** — View/edit username, avatar
5. **Match History** — List of past matches and chats

---

## 7. Testing Recommendations

Before any production deployment, verify:

| Test | How |
|------|-----|
| Coordinates are correct | Create beacon → check if it appears in correct location on map |
| Auth flow works | Log out → should redirect to login → login → should access app |
| Realtime works | Open 2 browser tabs → send message → should appear in both |
| Beacons expire | Create beacon with 1h expiry → wait (or manually update DB) → should disappear from map |

---

## 8. Security Audit Summary

| Issue | Severity | Status |
|-------|----------|--------|
| No Row Level Security enforcement visible in client code | 🟠 Medium | Depends on DB policies |
| User ID spoofing possible (hardcoded ID) | 🔴 Critical | Fix immediately |
| No CSRF protection | 🟡 Low | Next.js provides some protection |
| No rate limiting | 🟡 Low | Add before production |
| Environment variables exposed in client | 🟢 OK | Only `NEXT_PUBLIC_*` as expected |

---

## 9. Final Verdict

| Aspect | Grade |
|--------|-------|
| Code Structure | B- |
| Type Safety | C |
| Authentication | F |
| Core Feature (Beacons + Map) | D (broken coordinates) |
| Realtime Chat | B+ |
| UI/UX | B |
| Production Readiness | F |

**Recommendation:** Fix Bug #1 (coordinates) and Bug #2 (auth) before any further development or testing. These are foundation-level issues that affect every other feature.

---

*Report generated for Cheers project audit.*
