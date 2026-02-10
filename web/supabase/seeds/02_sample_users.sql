-- Sample User Data for Testing
-- Note: This requires users to already exist in auth.users
-- For testing, you'll need to create test users through Supabase Auth

-- Sample profile data (these will be auto-created via trigger when users sign up)
-- This file demonstrates what the profiles table will contain

-- Example test user profiles (assuming test users exist with these IDs)
-- In actual testing, replace these UUIDs with real test user IDs from auth.users

-- Sample lesson progress data
-- This demonstrates how user progress through rocket science lessons would be stored

-- Example: User completes lessons in Module 1 (How Rockets Fly)
-- INSERT INTO user_lesson_progress (user_id, lesson_id, module_id, completed, completed_at)
-- VALUES
--   ('test-user-uuid-here'::uuid, 'thrust-basics', 'how-rockets-fly', true, NOW() - INTERVAL '3 days'),
--   ('test-user-uuid-here'::uuid, 'newtons-third', 'how-rockets-fly', true, NOW() - INTERVAL '2 days'),
--   ('test-user-uuid-here'::uuid, 'propulsion-intro', 'how-rockets-fly', true, NOW() - INTERVAL '1 day');

-- Example: User takes Module 1 quiz
-- INSERT INTO user_lesson_progress (user_id, lesson_id, module_id, completed, completed_at, quiz_score, quiz_total)
-- VALUES
--   ('test-user-uuid-here'::uuid, 'quiz-module-1', 'how-rockets-fly', true, NOW(), 3, 4);

-- Example: User starts Module 4 (Orbital Mechanics)
-- INSERT INTO user_lesson_progress (user_id, lesson_id, module_id, completed, completed_at)
-- VALUES
--   ('test-user-uuid-here'::uuid, 'gravity-and-orbits', 'orbital-mechanics', true, NOW());

-- Note: To use this seed file properly:
-- 1. Create test users via Supabase Auth dashboard or API
-- 2. Get their UUIDs from auth.users table
-- 3. Replace 'test-user-uuid-here' with actual UUIDs
-- 4. Run this seed file

SELECT 'User seed file loaded. Replace test-user-uuid-here with actual user IDs to insert data.' as status;
