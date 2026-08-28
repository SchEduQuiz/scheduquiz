-- Admin Dashboard Test Setup with Emma's Credentials
-- Complete test environment for admin dashboard functionality

-- Create admin user with Emma's credentials
DO $$
DECLARE
  emma_user_id UUID;
  student_user_id UUID;
  teacher_user_id UUID;
  course1_id UUID;
  course2_id UUID;
  assignment1_id UUID;
  assignment2_id UUID;
BEGIN
  -- Create Emma as admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'emma@gmail.com',
    crypt('Atta2017', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated'
  ) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('Atta2017', gen_salt('bf')),
    updated_at = now()
  RETURNING id INTO emma_user_id;

  -- Create additional test users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role
  ) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'prince@gmail.com',
    crypt('Atta2017', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated'
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'teacher1@test.com',
    crypt('Teacher123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated'
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'teacher2@test.com',
    crypt('Teacher123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated'
  ) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now()
  RETURNING id INTO student_user_id;

  -- Get user IDs for profiles
  SELECT id INTO student_user_id FROM auth.users WHERE email = 'prince@gmail.com' LIMIT 1;
  SELECT id INTO teacher_user_id FROM auth.users WHERE email = 'teacher1@test.com' LIMIT 1;

  -- Create Emma's admin profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    emma_user_id,
    'Emma Thompson',
    'emma@gmail.com',
    'admin',
    null,
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = 'Emma Thompson',
    email = 'emma@gmail.com',
    role = 'admin',
    updated_at = now();

  -- Create test student profile
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    student_user_id,
    'Prince Williams',
    'prince@gmail.com',
    'student',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = 'Prince Williams',
    email = 'prince@gmail.com',
    role = 'student',
    updated_at = now();

  -- Create test teacher profiles
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES 
  (
    teacher_user_id,
    'Dr. Sarah Johnson',
    'teacher1@test.com',
    'teacher',
    now(),
    now()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'teacher2@test.com' LIMIT 1),
    'Prof. Michael Davis',
    'teacher2@test.com',
    'teacher',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'teacher',
    updated_at = now();

  -- Create test courses
  INSERT INTO public.courses (id, title, description, teacher_id, difficulty_level, category, created_at, updated_at)
  VALUES 
  (
    gen_random_uuid(),
    'Advanced Mathematics',
    'Comprehensive mathematics course covering calculus, linear algebra, and statistics',
    teacher_user_id,
    'advanced',
    'Mathematics',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Introduction to Programming',
    'Learn programming fundamentals with Python and JavaScript',
    teacher_user_id,
    'beginner',
    'Computer Science',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'World History',
    'Explore major historical events from ancient civilizations to modern times',
    (SELECT id FROM auth.users WHERE email = 'teacher2@test.com'),
    'intermediate',
    'History',
    now(),
    now()
  )
  RETURNING id INTO course1_id;

  -- Get the second course ID
  SELECT id INTO course2_id FROM public.courses WHERE title = 'Introduction to Programming' LIMIT 1;

  -- Create enrollments
  INSERT INTO public.enrollments (id, student_id, course_id, enrolled_at, status)
  VALUES 
  (
    gen_random_uuid(),
    student_user_id,
    course1_id,
    now() - interval '5 days',
    'active'
  ),
  (
    gen_random_uuid(),
    student_user_id,
    course2_id,
    now() - interval '3 days',
    'active'
  ),
  (
    gen_random_uuid(),
    student_user_id,
    (SELECT id FROM public.courses WHERE title = 'World History' LIMIT 1),
    now() - interval '1 day',
    'active'
  )
  ON CONFLICT DO NOTHING;

  -- Create assignments
  INSERT INTO public.assignments (id, course_id, title, description, due_date, max_points, assignment_type, created_at, updated_at)
  VALUES 
  (
    gen_random_uuid(),
    course1_id,
    'Calculus Quiz 1',
    'Test your knowledge of derivatives and integrals',
    now() + interval '7 days',
    100,
    'quiz',
    now() - interval '2 days',
    now()
  ),
  (
    gen_random_uuid(),
    course1_id,
    'Linear Algebra Problem Set',
    'Solve systems of equations and matrix operations',
    now() + interval '10 days',
    150,
    'problem_set',
    now() - interval '1 day',
    now()
  ),
  (
    gen_random_uuid(),
    course2_id,
    'Python Basics Quiz',
    'Test your understanding of Python programming fundamentals',
    now() + interval '5 days',
    100,
    'quiz',
    now() - interval '1 day',
    now()
  )
  RETURNING id INTO assignment1_id;

  -- Get second assignment ID
  SELECT id INTO assignment2_id FROM public.assignments WHERE title = 'Linear Algebra Problem Set' LIMIT 1;

  -- Create quiz questions
  INSERT INTO public.quiz_questions (id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, points, created_at, updated_at)
  VALUES 
  (
    gen_random_uuid(),
    'What is the derivative of x²?',
    '2x',
    'x',
    '2',
    'x²',
    '2x',
    'medium',
    'Mathematics',
    20,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'What is the capital of France?',
    'London',
    'Paris',
    'Berlin',
    'Madrid',
    'Paris',
    'easy',
    'Geography',
    10,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Which year did World War II end?',
    '1944',
    '1945',
    '1946',
    '1947',
    '1945',
    'medium',
    'History',
    15,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'What does "print()" do in Python?',
    'Deletes output',
    'Displays text',
    'Creates variables',
    'Ends the program',
    'Displays text',
    'easy',
    'Programming',
    10,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'What is the most abundant gas in Earth''s atmosphere?',
    'Oxygen',
    'Nitrogen',
    'Carbon Dioxide',
    'Argon',
    'Nitrogen',
    'medium',
    'Science',
    15,
    now(),
    now()
  );

  -- Create student submissions
  INSERT INTO public.submissions (id, student_id, assignment_id, submitted_at, score, feedback, status, submission_text)
  SELECT 
    gen_random_uuid(),
    student_user_id,
    a.id,
    now() - interval '1 day',
    (75 + random() * 20)::int, -- Score between 75-95
    CASE 
      WHEN random() > 0.5 THEN 'Good work! Keep practicing.'
      WHEN random() > 0.3 THEN 'Excellent understanding of the material.'
      ELSE 'Nice effort. Review the concepts you missed.'
    END,
    'graded',
    'This is a test submission with sample answers.'
  FROM public.assignments a
  WHERE a.course_id = course1_id
  LIMIT 1;

  -- Create activity logs for admin testing
  INSERT INTO public.user_activity_logs (id, user_id, action, details, created_at)
  VALUES 
  (
    gen_random_uuid(),
    student_user_id,
    'quiz_completed',
    'Completed Calculus Quiz 1 with score 87',
    now() - interval '2 hours'
  ),
  (
    gen_random_uuid(),
    student_user_id,
    'assignment_submitted',
    'Submitted Linear Algebra Problem Set',
    now() - interval '1 day'
  ),
  (
    gen_random_uuid(),
    teacher_user_id,
    'assignment_created',
    'Created new assignment: Statistics Quiz',
    now() - interval '3 days'
  ),
  (
    gen_random_uuid(),
    emma_user_id,
    'user_role_updated',
    'Updated user role for testing purposes',
    now() - interval '5 days'
  ),
  (
    gen_random_uuid(),
    student_user_id,
    'course_enrolled',
    'Enrolled in Advanced Mathematics course',
    now() - interval '5 days'
  );

  -- Create password reset requests for testing
  INSERT INTO public.password_reset_requests (id, user_email, reason, status, created_at, admin_notes)
  VALUES 
  (
    gen_random_uuid(),
    'prince@gmail.com',
    'I forgot my password and need to access my coursework',
    'pending',
    now() - interval '2 hours',
    null
  ),
  (
    gen_random_uuid(),
    'prince@gmail.com',
    'Account security - want to change password regularly',
    'approved',
    now() - interval '2 days',
    'User requested regular password change for security'
  ),
  (
    gen_random_uuid(),
    'student2@test.com',
    'Cannot remember my login credentials',
    'rejected',
    now() - interval '1 day',
    'Insufficient verification provided'
  );

  -- Create additional test data for comprehensive testing
  INSERT INTO public.discussion_forums (id, course_id, title, description, created_at, updated_at)
  VALUES 
  (
    gen_random_uuid(),
    course1_id,
    'Math Help Forum',
    'Ask questions and get help with mathematics problems',
    now() - interval '3 days',
    now()
  );

  -- Create notifications
  INSERT INTO public.notifications (id, user_id, title, message, type, is_read, created_at)
  VALUES 
  (
    gen_random_uuid(),
    student_user_id,
    'Assignment Due Soon',
    'Your Linear Algebra Problem Set is due in 3 days',
    'assignment_reminder',
    false,
    now() - interval '1 hour'
  ),
  (
    gen_random_uuid(),
    teacher_user_id,
    'New Student Enrollment',
    'A new student has enrolled in your Advanced Mathematics course',
    'enrollment',
    false,
    now() - interval '2 hours'
  ),
  (
    gen_random_uuid(),
    emma_user_id,
    'System Maintenance',
    'Scheduled system maintenance will occur this weekend',
    'system',
    true,
    now() - interval '1 day'
  );

END $$;

-- Display setup summary
SELECT 
  'Setup Complete!' as status,
  'Admin Dashboard Test Environment' as description
UNION ALL
SELECT 
  'Emma Admin Account' as status,
  email as description
FROM auth.users 
WHERE email = 'emma@gmail.com'
UNION ALL
SELECT 
  'Test Students' as status,
  COUNT(*)::text || ' created' as description
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.role = 'student'
UNION ALL
SELECT 
  'Test Teachers' as status,
  COUNT(*)::text || ' created' as description
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.role = 'teacher'
UNION ALL
SELECT 
  'Courses' as status,
  COUNT(*)::text || ' available' as description
FROM public.courses
UNION ALL
SELECT 
  'Enrollments' as status,
  COUNT(*)::text || ' active' as description
FROM public.enrollments
UNION ALL
SELECT 
  'Assignments' as status,
  COUNT(*)::text || ' created' as description
FROM public.assignments
UNION ALL
SELECT 
  'Questions' as status,
  COUNT(*)::text || ' in database' as description
FROM public.quiz_questions
UNION ALL
SELECT 
  'Password Reset Requests' as status,
  COUNT(*)::text || ' pending testing' as description
FROM public.password_reset_requests;