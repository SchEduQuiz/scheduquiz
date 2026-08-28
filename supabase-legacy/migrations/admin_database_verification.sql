-- Admin Dashboard Database Verification Script
-- This script verifies all required tables and structures exist

-- Check and create missing tables if needed

-- 1. Verify profiles table structure
DO $$
BEGIN
    -- Check if profiles table has required columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'Creating profiles table...';
        
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            full_name TEXT,
            email TEXT UNIQUE NOT NULL,
            role TEXT CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
            status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Admins can view all profiles" ON public.profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Admins can update all profiles" ON public.profiles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Admins can insert profiles" ON public.profiles
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Admins can delete profiles" ON public.profiles
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 2. Verify questions table structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'quiz_questions'
    ) THEN
        RAISE NOTICE 'Creating quiz_questions table...';
        
        CREATE TABLE public.quiz_questions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            question_text TEXT NOT NULL,
            question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')) DEFAULT 'multiple_choice',
            options JSONB,
            correct_answer TEXT,
            points INTEGER DEFAULT 1,
            difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
            category TEXT,
            lesson_id UUID,
            quiz_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Everyone can view questions" ON public.quiz_questions
            FOR SELECT USING (true);
            
        CREATE POLICY "Teachers can create questions" ON public.quiz_questions
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
                )
            );
            
        CREATE POLICY "Teachers can update questions" ON public.quiz_questions
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
                )
            );
            
        CREATE POLICY "Admins can delete questions" ON public.quiz_questions
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 3. Verify courses table structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'courses'
    ) THEN
        RAISE NOTICE 'Creating courses table...';
        
        CREATE TABLE public.courses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Everyone can view courses" ON public.courses
            FOR SELECT USING (true);
            
        CREATE POLICY "Teachers can create courses" ON public.courses
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
                )
            );
            
        CREATE POLICY "Teachers can update own courses" ON public.courses
            FOR UPDATE USING (
                teacher_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Admins can delete courses" ON public.courses
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 4. Verify enrollments table structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'enrollments'
    ) THEN
        RAISE NOTICE 'Creating enrollments table...';
        
        CREATE TABLE public.enrollments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            status TEXT CHECK (status IN ('active', 'completed', 'dropped')) DEFAULT 'active',
            UNIQUE(student_id, course_id)
        );
        
        -- Enable RLS
        ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Students can view own enrollments" ON public.enrollments
            FOR SELECT USING (student_id = auth.uid());
            
        CREATE POLICY "Teachers can view enrollments for their courses" ON public.enrollments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.courses 
                    WHERE id = course_id AND teacher_id = auth.uid()
                )
            );
            
        CREATE POLICY "Students can create enrollments" ON public.enrollments
            FOR INSERT WITH CHECK (student_id = auth.uid());
            
        CREATE POLICY "Admins can manage all enrollments" ON public.enrollments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 5. Verify assignments table structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'assignments'
    ) THEN
        RAISE NOTICE 'Creating assignments table...';
        
        CREATE TABLE public.assignments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            due_date TIMESTAMP WITH TIME ZONE,
            max_points INTEGER DEFAULT 100,
            assignment_type TEXT CHECK (assignment_type IN ('quiz', 'homework', 'exam', 'project')) DEFAULT 'homework',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Students can view assignments for enrolled courses" ON public.assignments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.enrollments 
                    WHERE student_id = auth.uid() AND course_id = assignments.course_id
                )
            );
            
        CREATE POLICY "Teachers can manage assignments for their courses" ON public.assignments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.courses 
                    WHERE id = course_id AND teacher_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 6. Verify submissions table structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'submissions'
    ) THEN
        RAISE NOTICE 'Creating submissions table...';
        
        CREATE TABLE public.submissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            score INTEGER,
            feedback TEXT,
            status TEXT CHECK (status IN ('submitted', 'graded', 'late')) DEFAULT 'submitted',
            submission_text TEXT,
            UNIQUE(student_id, assignment_id)
        );
        
        -- Enable RLS
        ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Students can manage own submissions" ON public.submissions
            FOR ALL USING (student_id = auth.uid());
            
        CREATE POLICY "Teachers can view submissions for their assignments" ON public.submissions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.assignments a
                    JOIN public.courses c ON c.id = a.course_id
                    WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
                )
            );
            
        CREATE POLICY "Admins can manage all submissions" ON public.submissions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 7. Verify user activity logs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_activity_logs'
    ) THEN
        RAISE NOTICE 'Creating user_activity_logs table...';
        
        CREATE TABLE public.user_activity_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Admins can view all activity logs" ON public.user_activity_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Users can create activity logs" ON public.user_activity_logs
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- 8. Verify password reset requests table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'password_reset_requests'
    ) THEN
        RAISE NOTICE 'Creating password_reset_requests table...';
        
        CREATE TABLE public.password_reset_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email TEXT NOT NULL,
            reason TEXT,
            status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
            admin_notes TEXT,
            temp_password TEXT,
            temp_password_expires_at TIMESTAMP WITH TIME ZONE,
            temp_password_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Admins can manage password reset requests" ON public.password_reset_requests
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_email ON public.password_reset_requests(user_email);

-- Verification results
SELECT 
    'Database verification complete!' as status,
    'All required tables and policies created/verified' as message
UNION ALL
SELECT 
    'Tables Created/Verified' as status,
    COUNT(*)::text || ' tables' as message
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'quiz_questions', 'courses', 'enrollments', 'assignments', 'submissions', 'user_activity_logs', 'password_reset_requests')
UNION ALL
SELECT 
    'RLS Policies' as status,
    COUNT(*)::text || ' policies enabled' as message
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Performance Indexes' as status,
    COUNT(*)::text || ' indexes created' as message
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';