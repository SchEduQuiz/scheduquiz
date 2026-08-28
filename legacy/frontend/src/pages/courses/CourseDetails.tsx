import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Clock, Users, CheckCircle, PlayCircle, ArrowLeft, UserPlus, UserMinus, MessageSquare } from 'lucide-react';

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId, user]);

  async function loadCourseData() {
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!courseData) {
        navigate('/courses');
        return;
      }

      const { data: teacher } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', courseData.teacher_id)
        .maybeSingle();

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      setCourse({ ...courseData, teacherName: teacher?.full_name || teacher?.email });
      setLessons(lessonsData || []);

      if (user) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        setIsEnrolled(!!enrollment);

        if (enrollment) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('student_id', user.id)
            .eq('course_id', courseId);

          setProgress(progressData || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile?.role !== 'student') {
      alert('Only students can enroll in courses');
      return;
    }

    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{ student_id: user.id, course_id: courseId }]);

      if (error) throw error;
      setIsEnrolled(true);
      loadCourseData();
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  }

  async function handleUnenroll() {
    try {
      await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', user?.id)
        .eq('course_id', courseId);

      setIsEnrolled(false);
      setProgress([]);
    } catch (error) {
      console.error('Error unenrolling:', error);
    }
  }

  function isLessonCompleted(lessonId: string) {
    return progress.some(p => p.lesson_id === lessonId && p.completed);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) return null;

  const completedCount = progress.filter(p => p.completed).length;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 mb-6 min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Courses</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 text-white">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{course.title}</h1>
            <p className="text-sm sm:text-base text-blue-100 mb-4">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>{lessons.length} lessons</span>
              </div>
              {course.category && (
                <div className="bg-white/20 px-3 py-1 rounded-full">
                  {course.category}
                </div>
              )}
            </div>
            <p className="text-sm text-blue-100 mt-4">Instructor: {course.teacherName}</p>
          </div>

          <div className="p-4 sm:p-8">
            {user && profile?.role === 'student' && (
              <div className="mb-6">
                {isEnrolled ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 mb-1">Your Progress</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{progressPercentage}%</p>
                        <p className="text-sm text-slate-500">{completedCount} / {lessons.length} lessons completed</p>
                      </div>
                      <button
                        onClick={handleUnenroll}
                        className="flex items-center justify-center space-x-2 border-2 border-red-600 text-red-600 px-6 py-3 min-h-[44px] rounded-lg hover:bg-red-50 transition"
                      >
                        <UserMinus className="h-5 w-5" />
                        <span>Unenroll</span>
                      </button>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    className="w-full bg-blue-600 text-white py-3 min-h-[44px] rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Enroll in this Course</span>
                  </button>
                )}
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">Course Content</h2>
            <div className="space-y-3">
              {lessons.map((lesson, index) => {
                const completed = isLessonCompleted(lesson.id);
                const canAccess = isEnrolled || profile?.role === 'teacher' || profile?.role === 'admin';

                return (
                  <div key={lesson.id} className={`border-2 rounded-lg p-4 ${completed ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center space-x-3 flex-1">
                        <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${completed ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {completed ? <CheckCircle className="h-6 w-6" /> : <span className="font-bold">{index + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-slate-800">{lesson.title}</h3>
                          {lesson.duration_minutes && (
                            <div className="flex items-center space-x-1 text-sm text-slate-500 mt-1">
                              <Clock className="h-4 w-4" />
                              <span>{lesson.duration_minutes} minutes</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canAccess ? (
                          <Link
                            to={`/courses/${courseId}/lessons/${lesson.id}`}
                            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                          >
                            <PlayCircle className="h-5 w-5" />
                            <span>{completed ? 'Review' : 'Start'}</span>
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center space-x-2 bg-slate-300 text-slate-500 px-4 py-2 min-h-[44px] rounded-lg cursor-not-allowed whitespace-nowrap"
                          >
                            <PlayCircle className="h-5 w-5" />
                            <span>Locked</span>
                          </button>
                        )}
                        
                        {/* Discussion Link - only show if enrolled or teacher */}
                        {canAccess && (
                          <Link
                            to={`/courses/${courseId}/lessons/${lesson.id}/discussions`}
                            className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 min-h-[44px] rounded-lg hover:bg-slate-200 transition whitespace-nowrap"
                          >
                            <MessageSquare className="h-5 w-5" />
                            <span>Discuss</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {lessons.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  No lessons available yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
