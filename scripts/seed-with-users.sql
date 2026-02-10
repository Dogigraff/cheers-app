-- Seed Test Data for Cheers App
-- 
-- INSTRUCTIONS:
-- 1. First, create 3 test users in Supabase Dashboard:
--    - Go to Authentication > Users > Add User
--    - Create users with emails: alex@test.com, masha@test.com, party@test.com
--    - Copy their UUIDs from the users table
--
-- 2. Replace the UUIDs below with the actual user IDs you copied
--
-- 3. Run this SQL script in Supabase SQL Editor

-- Step 1: Clean up existing data
TRUNCATE TABLE messages, matches, interactions, beacons, profiles CASCADE;

-- Step 2: Get user IDs (run this first to see available users)
-- SELECT id, email FROM auth.users LIMIT 3;

-- Step 3: Insert Profiles
-- REPLACE THE UUIDs BELOW WITH ACTUAL USER IDs FROM auth.users
INSERT INTO profiles (id, username, avatar_url, reputation) VALUES
('943b7cef-539c-4160-bfd4-7f158e4f0b90', 'Alex_Whiskey', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 150),
('be358a06-fa6c-4cd3-bd29-074493f2d7a2', 'Marie_Wine', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marie', 300),
('f0febd14-a7e2-49a5-ab6b-1b524e1f9e6a', 'Dima_Party', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dima', 50)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  reputation = EXCLUDED.reputation;

-- Step 4: Insert Active Beacons (Moscow Coordinates around Patriarch Ponds)
-- Note: Replace user_id UUIDs with actual profile IDs from step 3
INSERT INTO beacons (user_id, location, mood, assets, expires_at) VALUES
((SELECT id FROM profiles WHERE username = 'Alex_Whiskey' LIMIT 1), 
 ST_GeographyFromText('POINT(37.593 55.763)'), 
 'Chill mood', 
 '{"type": "whiskey", "brand": "Jameson"}', 
 NOW() + interval '4 hours'),
((SELECT id FROM profiles WHERE username = 'Marie_Wine' LIMIT 1), 
 ST_GeographyFromText('POINT(37.595 55.764)'), 
 'Wine time', 
 '{"type": "wine", "brand": "Chianti"}', 
 NOW() + interval '2 hours'),
((SELECT id FROM profiles WHERE username = 'Dima_Party' LIMIT 1), 
 ST_GeographyFromText('POINT(37.591 55.762)'), 
 'Beer & Park', 
 '{"type": "beer", "brand": "Baltika"}', 
 NOW() + interval '1 hour');

-- Verify the data
SELECT 
  p.username, 
  p.reputation,
  b.mood,
  b.assets,
  ST_AsText(b.location::geometry) as location_text,
  b.expires_at
FROM profiles p
JOIN beacons b ON b.user_id = p.id
ORDER BY b.created_at DESC;
