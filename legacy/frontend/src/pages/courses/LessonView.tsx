import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Award, RotateCcw, Clock, MessageSquare } from 'lucide-react';
import LessonQuizGenerator from '../../components/LessonQuizGenerator';
import { LessonQuizSettings, QuizAttempt, LessonProgressWithQuiz } from '../../types/lessonQuiz';

export default function LessonView() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Quiz-related state
  const [lessonQuiz, setLessonQuiz] = useState<any>(null);
  const [quizProgress, setQuizProgress] = useState<LessonProgressWithQuiz | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [activeQuizAttempt, setActiveQuizAttempt] = useState<QuizAttempt | null>(null);
  const [canTakeQuiz, setCanTakeQuiz] = useState(false);

  useEffect(() => {
    loadLessonData();
  }, [lessonId]);

  async function loadLessonData() {
    try {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lessonData) {
        navigate('/courses');
        return;
      }

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', lessonData.course_id)
        .maybeSingle();

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', lessonData.course_id)
        .order('order_index', { ascending: true });

      setLesson(lessonData);
      setCourse(courseData);
      setAllLessons(lessonsData || []);

      if (user) {
        // Load lesson progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('student_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        setIsCompleted(progressData?.completed || false);
        
        // Load lesson quiz if it exists
        const { data: quizData } = await supabase
          .from('lesson_quizzes')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('is_active', true)
          .maybeSingle();

        if (quizData) {
          setLessonQuiz(quizData);
          
          // Load quiz attempts for this student
          const { data: attemptsData } = await supabase
            .from('lesson_quiz_attempts')
            .select('*')
            .eq('quiz_id', quizData.id)
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });

          setQuizAttempts(attemptsData || []);
          
          // Calculate quiz progress
          const bestAttempt = attemptsData?.[0];
          const hasPassed = bestAttempt?.passed || false;
          const maxAttempts = quizData.quiz_settings?.max_retries || 3;
          const attemptsLeft = maxAttempts - (attemptsData?.length || 0);
          
          setQuizProgress({
            ...progressData,
            quizAttempts: attemptsData || [],
            currentQuizStatus: {
              hasAttempted: (attemptsData?.length || 0) > 0,
              passed: hasPassed,
              bestScore: bestAttempt?.score_percentage || 0,
              attemptsLeft: Math.max(0, attemptsLeft),
              lastAttemptAt: bestAttempt?.created_at
            }
          });
          
          // Determine if student can take quiz
          setCanTakeQuiz(
            isCompleted && 
            (!quizData.is_required || !hasPassed) && 
            attemptsLeft > 0
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete() {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('lesson_progress')
          .update({
            completed: !isCompleted,
            completed_at: !isCompleted ? new Date().toISOString() : null,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('lesson_progress')
          .insert([{
            student_id: user.id,
            lesson_id: lessonId,
            course_id: courseId,
            completed: true,
            completed_at: new Date().toISOString()
          }]);
      }

      setIsCompleted(!isCompleted);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  function navigateLesson(direction: 'prev' | 'next') {
    // Check if next lesson is blocked by quiz requirement
    if (direction === 'next' && lessonQuiz?.is_required && !quizProgress?.currentQuizStatus?.passed) {
      alert('You must pass the lesson quiz before proceeding to the next lesson.');
      return;
    }
    
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < allLessons.length) {
      navigate(`/courses/${courseId}/lessons/${allLessons[newIndex].id}`);
    }
  }

  // Quiz-related functions
  const startQuiz = () => {
    if (!lessonQuiz || !user) return;
    
    navigate(`/quiz/lesson/${lessonQuiz.id}`, {
      state: { 
        lessonId, 
        courseId,
        returnTo: `/courses/${courseId}/lessons/${lessonId}` 
      }
    });
  };

  const retakeQuiz = () => {
    if (!lessonQuiz?.allow_retry) return;
    
    const attemptsLeft = lessonQuiz.max_retries - quizAttempts.length;
    if (attemptsLeft <= 0) {
      alert('No more attempts left for this quiz.');
      return;
    }
    
    startQuiz();
  };

  const handleQuizCompleted = (attempt: QuizAttempt) => {
    setQuizAttempts([attempt, ...quizAttempts]);
    loadLessonData(); // Reload to get updated progress
  };

  const isTeacher = user && course?.created_by === user.id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lesson || !course) return null;

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allLessons.length - 1;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/courses/${courseId}`}
          className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 mb-6 min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Course</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
            <div className="flex items-center space-x-2 text-xs sm:text-sm mb-2">
              <BookOpen className="h-4 w-4" />
              <span className="truncate">{course.title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{lesson.title}</h1>
            <p className="text-sm sm:text-base text-blue-100">
              Lesson {currentIndex + 1} of {allLessons.length}
            </p>
          </div>

          <div className="p-4 sm:p-8">
            {lesson.video_url && (
              <div className="mb-6 sm:mb-8 rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
                <p className="text-sm sm:text-base text-slate-600 px-4 text-center">Video player would be here: {lesson.video_url}</p>
              </div>
            )}

            <div className="prose max-w-none mb-6 sm:mb-8">
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                {lesson.content || 'No content available for this lesson.'}
              </div>
            </div>

            {user && (
              <div className="space-y-6 border-t border-slate-200 pt-4 sm:pt-6">
                {/* Lesson Completion and Discussion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={toggleComplete}
                    className={`py-3 min-h-[44px] rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
                      isCompleted
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>{isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}</span>
                  </button>
                  
                  <Link
                    to={`/courses/${courseId}/lessons/${lessonId}/discussions`}
                    className="py-3 min-h-[44px] rounded-lg font-semibold transition flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span>Join Discussion</span>
                  </Link>
                </div>

                {/* Quiz Section */}
                {lessonQuiz ? (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">Lesson Assessment</h3>
                      {lessonQuiz.is_required && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    
                    {/* Quiz Status */}
                    {quizProgress?.currentQuizStatus && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                              {quizProgress.currentQuizStatus.bestScore}%
                            </p>
                            <p className="text-sm text-slate-600">Best Score</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">
                              {quizProgress.currentQuizStatus.attemptsLeft}
                            </p>
                            <p className="text-sm text-slate-600">Attempts Left</p>
                          </div>
                        </div>
                        
                        {/* Quiz Actions */}
                        <div className="space-y-3">
                          {quizProgress.currentQuizStatus.passed ? (
                            <div className="flex items-center justify-center p-4 bg-green-100 rounded-lg">
                              <Award className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-green-800 font-medium">
                                Quiz Passed! Score: {quizProgress.currentQuizStatus.bestScore}%
                              </span>
                            </div>
                          ) : quizProgress.currentQuizStatus.hasAttempted ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-700">
                                Last attempt: {quizProgress.currentQuizStatus.bestScore}%
                              </span>
                              {lessonQuiz.allow_retry && quizProgress.currentQuizStatus.attemptsLeft > 0 && (
                                <button
                                  onClick={retakeQuiz}
                                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  <span>Retake Quiz</span>
                                </button>
                              )}
                            </div>
                          ) : null}
                          
                          {/* Take Quiz Button */}
                          {canTakeQuiz && (
                            <button
                              onClick={startQuiz}
                              className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2 font-semibold"
                            >
                              <Award className="h-5 w-5" />
                              <span>
                                {quizProgress?.currentQuizStatus?.hasAttempted ? 'Retake Quiz' : 'Take Quiz'}
                              </span>
                            </button>
                          )}
                          
                          {/* Quiz Info */}
                          <div className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Time Limit:</span>
                              <span>{lessonQuiz.time_limit ? `${lessonQuiz.time_limit} minutes` : 'No limit'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Passing Score:</span>
                              <span>{lessonQuiz.passing_score}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Questions:</span>
                              <span>{lessonQuiz.questions?.length || 'Loading...'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : isTeacher ? (
                  /* Teacher Quiz Creation */
                  <div className="bg-blue-50 rounded-xl p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">No Quiz Created</h3>
                      <p className="text-blue-600 mb-4">
                        Create an assessment quiz to test student understanding of this lesson.
                      </p>
                      <LessonQuizGenerator
                        lessonId={lessonId!}
                        courseId={courseId!}
                        lessonContent={lesson?.content || ''}
                        onQuizCreated={() => {
                          loadLessonData();
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Teacher Quiz Management */}
                {isTeacher && lessonQuiz && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-800">Quiz Management</h3>
                        <p className="text-blue-600 text-sm">Manage this lesson's assessment quiz</p>
                      </div>
                      <LessonQuizGenerator
                        lessonId={lessonId!}
                        courseId={courseId!}
                        lessonContent={lesson?.content || ''}
                        existingQuiz={lessonQuiz}
                        onQuizCreated={() => {
                          loadLessonData();
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 sm:pt-6 border-t border-slate-200">
              <button
                onClick={() => navigateLesson('prev')}
                disabled={!hasPrev}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 min-h-[44px] rounded-lg transition ${
                  hasPrev
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Previous</span>
              </button>

              <span className="text-sm text-slate-600 order-first sm:order-none">
                {currentIndex + 1} / {allLessons.length}
              </span>

              <button
                onClick={() => navigateLesson('next')}
                disabled={!hasNext}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 min-h-[44px] rounded-lg transition relative ${
                  hasNext
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="h-5 w-5" />
                {lessonQuiz?.is_required && !quizProgress?.currentQuizStatus?.passed && hasNext && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
