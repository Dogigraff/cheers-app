-- Seed Test Data for Cheers App
-- IMPORTANT: You need to create users in Supabase Auth first (via Auth UI or API)
-- Then replace the UUIDs below with actual user IDs from auth.users

-- Step 1: Clean up existing data
TRUNCATE TABLE messages, matches, interactions, beacons, profiles CASCADE;

-- Step 2: Get or create test user IDs
-- Option A: If you have existing users, get their IDs:
-- SELECT id FROM auth.users LIMIT 3;

-- Option B: Create users via Supabase Dashboard > Authentication > Add User
-- Then update the UUIDs below with the actual user IDs

-- Step 3: Insert Profiles (replace UUIDs with actual user IDs from auth.users)
INSERT INTO profiles (id, username, avatar_url, reputation) VALUES
('00000000-0000-0000-0000-000000000001', 'Alex_Whiskey', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 150),
('00000000-0000-0000-0000-000000000002', 'Marie_Wine', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marie', 300),
('00000000-0000-0000-0000-000000000003', 'Dima_Party', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dima', 50)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Insert Active Beacons (Moscow Coordinates)
-- Coordinates are around Patriarch Ponds area in Moscow
INSERT INTO beacons (user_id, location, mood, assets, expires_at) VALUES
('00000000-0000-0000-0000-000000000001', ST_GeographyFromText('POINT(37.593 55.763)'), 'Chill mood', '{"type": "whiskey", "brand": "Jameson"}', NOW() + interval '4 hours'),
('00000000-0000-0000-0000-000000000002', ST_GeographyFromText('POINT(37.595 55.764)'), 'Wine time', '{"type": "wine", "brand": "Chianti"}', NOW() + interval '2 hours'),
('00000000-0000-0000-0000-000000000003', ST_GeographyFromText('POINT(37.591 55.762)'), 'Beer & Park', '{"type": "beer", "brand": "Baltika"}', NOW() + interval '1 hour');
