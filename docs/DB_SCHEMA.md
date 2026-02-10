-- SUPABASE / POSTGRES SCHEMA

-- 1. Enable PostGIS for location
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Profiles (Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  reputation INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Beacons (The "Signal")
CREATE TABLE beacons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  mood TEXT,
  assets JSONB, -- e.g. {"type": "whiskey", "brand": "Jameson"}
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Interactions (Swipes)
CREATE TABLE interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  target_beacon_id UUID REFERENCES beacons(id),
  type TEXT CHECK (type IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(actor_id, target_beacon_id)
);

-- 5. Matches (Successful connection)
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beacon_id UUID REFERENCES beacons(id),
  host_id UUID REFERENCES profiles(id),
  seeker_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);