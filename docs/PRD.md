# Product Requirements Document (PRD)

## 1. Core Concept
A "Tinder for Drinking" but focused on assets and spontaneity. Users find company based on proximity and what alcohol/mood they have.

## 2. User Roles
- **Host (Beacon Owner):** Someone who has alcohol/location and wants company.
- **Seeker:** Someone looking for a party nearby.

## 3. Key Features (MVP)
1. **Auth:** Simple login (Phone/Social) via Supabase Auth.
2. **Map View:**
   - See active Beacons nearby (circles on map).
   - Filter by drink type (Beer, Wine, Whiskey, Vodka).
3. **Create Beacon:**
   - Select drink type.
   - Add description ("Chilling at Patriarch Ponds").
   - Set duration (1h, 2h, 4h).
   - (Optional) Upload photo.
4. **Matching:**
   - User clicks a Beacon -> Swipes Right to request join.
   - Host accepts -> Chat opens.
5. **Chat:**
   - Real-time messages.
   - Share live location.

## 4. Constraints
- **Mobile Only:** Layout must be optimized for mobile screens (PWA).
- **Privacy:** Do not show exact user location until Match is confirmed. Show approximate radius.