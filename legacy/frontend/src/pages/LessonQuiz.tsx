import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Trophy, Lightbulb, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { LessonQuiz, Question, QuizAttempt, QuestionResponse } from '../types/lessonQuiz';

export default function LessonQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const returnTo = location.state?.returnTo || '/';
  const lessonId = location.state?.lessonId;
  const courseId = location.state?.courseId;
  
  // Quiz state
  const [quiz, setQuiz] = useState<LessonQuiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Question state
  const [userAnswers, setUserAnswers] = useState<{[key: string]: any}>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [hintRequested, setHintRequested] = useState<Set<number>>(new Set());
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);

  useEffect(() => {
    if (!authLoading && user && quizId) {
      loadQuiz();
    } else if (!authLoading && !user) {
      setError('Authentication required. Please log in.');
      setIsLoading(false);
    }
  }, [quizId, user, authLoading]);

  // Question timer
  useEffect(() => {
    if (!questions[currentQuestion]) return;
    
    const question = questions[currentQuestion];
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, question.timeLimit! - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        handleNextQuestion();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, questionStartTime, questions]);

  // Overall quiz timer
  useEffect(() => {
    if (!quiz?.timeLimit) return;
    
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const remaining = Math.max(0, (quiz.timeLimit! * 60) - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        submitQuiz();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartTime, quiz?.timeLimit]);

  // Focus/blur monitoring
  useEffect(() => {
    const handleFocus = () => setFocusLostCount(prev => prev + 1);
    const handleBlur = () => setTabSwitches(prev => prev + 1);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get fresh session for API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Failed to get authentication session');
      }

      // Load quiz and questions
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-quiz-service/${quizId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to load quiz');
      }

      const result = await response.json();
      
      if (result.data) {
        const quizData = result.data.quiz;
        const questionsData = result.data.questions || [];
        
        if (questionsData.length === 0) {
          throw new Error('No questions available for this quiz');
        }
        
        setQuiz(quizData);
        setQuestions(questionsData);
        
        // Initialize attempt
        setSessionStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setTimeLeft(questionsData[0]?.timeLimit || 30);
      } else {
        throw new Error('Failed to load quiz data');
      }
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Get hint for current question
  const getHint = async () => {
    if (!questions[currentQuestion] || hintRequested.has(currentQuestion)) return;

    try {
      const question = questions[currentQuestion];
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-quiz-service/questions/${question.id}/hint`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.hint) {
          setShowHint(true);
          setHintRequested(new Set([...hintRequested, currentQuestion]));
        }
      }
    } catch (err) {
      console.error('Error getting hint:', err);
    }
  };

  // Submit current answer
  const submitAnswer = () => {
    if (!selectedAnswer || !questions[currentQuestion]) return;

    const question = questions[currentQuestion];
    setUserAnswers(prev => ({
      ...prev,
      [question.id]: selectedAnswer
    }));

    handleNextQuestion();
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setQuestionStartTime(Date.now());
      setTimeLeft(questions[currentQuestion + 1]?.timeLimit || 30);
    } else {
      submitQuiz();
    }
  };

  // Submit entire quiz
  const submitQuiz = async () => {
    if (!quiz || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-quiz-service/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: userAnswers,
          total_time: Math.floor((Date.now() - sessionStartTime) / 1000),
          focus_lost_count: focusLostCount,
          tab_switches: tabSwitches
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Navigate back to lesson with result
          navigate(returnTo, { 
            state: { 
              quizCompleted: true, 
              attempt: result.data.attempt,
              returnTo 
            } 
          });
        } else {
          throw new Error(result.error?.message || 'Failed to submit quiz');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading Quiz...</h2>
          <p className="text-slate-600">Preparing your assessment questions</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(returnTo)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Back to Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting state
  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitting Quiz...</h2>
          <p className="text-slate-600">Calculating your results</p>
        </div>
      </div>
    );
  }

  // No quiz loaded
  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Not Available</h2>
          <p className="text-slate-600 mb-6">This quiz is not currently available.</p>
          <button
            onClick={() => navigate(returnTo)}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold">{quiz.title}</h1>
                <p className="text-sm text-orange-100">Lesson Assessment</p>
              </div>
              <div className="flex items-center space-x-4">
                {quiz.timeLimit && (
                  <div className="flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg">
                    <Clock className="h-5 w-5" />
                    <span className="text-lg font-bold">{formatTime(timeLeft)}</span>
                  </div>
                )}
                {(focusLostCount > 0 || tabSwitches > 0) && (
                  <div className="bg-red-500/20 px-3 py-2 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span className="text-orange-100">
                Passing Score: {quiz.passingScore}%
              </span>
            </div>
            
            <div className="w-full bg-white/30 rounded-full h-3 mt-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex-1">
                  {question.question}
                </h3>
                <button
                  onClick={getHint}
                  disabled={hintRequested.has(currentQuestion)}
                  className={`ml-4 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    hintRequested.has(currentQuestion)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  {hintRequested.has(currentQuestion) ? 'Hint Used' : 'Hint'}
                </button>
              </div>
              
              {showHint && question.explanation && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg mb-6">
                  <div className="flex">
                    <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-800">
                      <strong>Hint:</strong> {question.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-8">
              {question.type === 'true-false' ? (
                ['True', 'False'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedAnswer === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-lg mr-3">{option === 'True' ? 'A' : 'B'}.</span>
                    <span className="text-base">{option}</span>
                  </button>
                ))
              ) : question.type === 'multiple-choice' && question.options ? (
                question.options.map((option: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedAnswer === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-lg mr-3">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-base">{option}</span>
                  </button>
                ))
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Answer
                  </label>
                  <input
                    type="text"
                    value={selectedAnswer || ''}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-full p-4 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter your answer..."
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <button
                onClick={() => navigate(returnTo)}
                className="px-6 py-3 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Exit Quiz
              </button>
              
              <button
                onClick={submitAnswer}
                disabled={!selectedAnswer}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  selectedAnswer
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}