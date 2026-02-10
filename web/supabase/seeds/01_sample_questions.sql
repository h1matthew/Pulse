-- Sample Lesson Progress Data for Rocket Space
-- These are example records showing how lesson progress is tracked
-- Note: Requires test users to exist in auth.users / profiles

-- Example: Insert sample lesson progress for a test user
-- Replace 'TEST_USER_UUID' with an actual user ID from your profiles table

-- INSERT INTO user_lesson_progress (user_id, lesson_id, module_id, completed, completed_at, quiz_score, quiz_total)
-- VALUES
--   ('TEST_USER_UUID'::uuid, 'thrust-basics', 'how-rockets-fly', true, NOW() - INTERVAL '7 days', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'newtons-third', 'how-rockets-fly', true, NOW() - INTERVAL '6 days', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'propulsion-intro', 'how-rockets-fly', true, NOW() - INTERVAL '5 days', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'quiz-module-1', 'how-rockets-fly', true, NOW() - INTERVAL '5 days', 3, 4),
--   ('TEST_USER_UUID'::uuid, 'drag-forces', 'aerodynamics', true, NOW() - INTERVAL '3 days', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'stability-cp-cg', 'aerodynamics', true, NOW() - INTERVAL '2 days', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'fin-design', 'aerodynamics', true, NOW() - INTERVAL '1 day', NULL, NULL),
--   ('TEST_USER_UUID'::uuid, 'quiz-module-2', 'aerodynamics', true, NOW(), 4, 4);

SELECT 'Seed file loaded. Uncomment INSERT statements and replace TEST_USER_UUID to add sample progress data.' as status;
