import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BookOpen, Clock, Users, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CourseCatalog() {
  const [courses, setCourses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (courses) {
        const coursesWithDetails = await Promise.all(
          courses.map(async (course) => {
            const { data: teacher } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', course.teacher_id)
              .maybeSingle();

            const { data: lessons } = await supabase
              .from('lessons')
              .select('id, duration_minutes')
              .eq('course_id', course.id);

            const { data: enrollments } = await supabase
              .from('enrollments')
              .select('id')
              .eq('course_id', course.id);

            const totalDuration = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

            return {
              ...course,
              teacherName: teacher?.full_name || 'Unknown',
              lessonsCount: lessons?.length || 0,
              studentsCount: enrollments?.length || 0,
              totalDuration
            };
          })
        );
        setCourses(coursesWithDetails);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Course Catalog</h1>
          <p className="text-slate-600">Explore our comprehensive collection of courses</p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <BookOpen className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Ready to start learning?</h3>
                <p className="text-sm sm:text-base text-blue-800 mb-3">Create an account to enroll in courses and track your progress</p>
                <Link
                  to="/register"
                  className="inline-block bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition"
                >
                  Sign Up Now
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
            >
              <div className="h-48 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <BookOpen className="h-20 w-20 text-white" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  {course.category && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {course.category}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {course.description || 'No description available'}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-4">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.lessonsCount} lessons</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{course.studentsCount} students</span>
                  </div>
                  {course.totalDuration > 0 && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.totalDuration}m</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3">Taught by {course.teacherName}</p>
              </div>
            </Link>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">
              {searchTerm ? 'No courses found matching your search' : 'No courses available yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
