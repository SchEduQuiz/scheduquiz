import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Trophy, Lightbulb, Sparkles, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuizQuestion {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  hint?: string;
  points: number;
  time_limit: number;
  difficulty: string;
}

interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  start_time: string;
  total_questions: number;
  hints_used: number;
}

interface QuizResult {
  score: number;
  max_score: number;
  percentage: number;
  time_taken: number;
  correct_answers: number;
  total_questions: number;
  hints_used: number;
  hint_penalty: number;
  time_bonus: number;
  game_mode: string;
  responses: {
    question_id: number;
    question_text: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    points_earned: number;
    response_time?: number;
  }[];
  new_streak?: number;
  total_points?: number;
  achievements_unlocked?: string[];
}

interface BalloonType {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  rotation: number;
  velocity: number;
}

export default function QuizPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Quiz state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Question state
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<{[key: number]: number}>({});
  const [showHint, setShowHint] = useState(false);
  const [hintRequested, setHintRequested] = useState<Set<number>>(new Set());
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  
  // Enhanced UX state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const [canNavigateBack, setCanNavigateBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation state
  const [showBalloons, setShowBalloons] = useState(false);
  const [balloons, setBalloons] = useState<BalloonType[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  // Initialize quiz
  useEffect(() => {
    if (!authLoading && user) {
      startQuiz();
    } else if (!authLoading && !user) {
      setError('Authentication required. Please log in.');
      setIsLoading(false);
    }
  }, [category, user, authLoading]);

  // Question timer
  useEffect(() => {
    if (!quizSession || !quizSession.questions[currentQuestion] || showFeedback) return;
    
    const question = quizSession.questions[currentQuestion];
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, question.time_limit - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0 && !showFeedback) {
        handleAnswerSubmit();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentQuestion, questionStartTime, quizSession, showFeedback]);

  // Auto-advance after answer - reduced delay for instant UX
  useEffect(() => {
    if (showFeedback && autoAdvanceTimer) {
      const timer = setTimeout(() => {
        moveToNextQuestion();
      }, 2500); // 2.5 second delay for feedback display

      return () => clearTimeout(timer);
    }
  }, [showFeedback, autoAdvanceTimer]);

  // Instant answer submission when answer is selected
  useEffect(() => {
    if (selectedAnswer && !showFeedback && !isSubmitting && quizSession) {
      const questionId = quizSession.questions[currentQuestion].id;
      // Only auto-submit if this question hasn't been answered yet
      if (!userAnswers[questionId]) {
        // Brief delay to show selection before submitting
        const submitTimer = setTimeout(() => {
          handleAnswerSubmit();
        }, 800); // 0.8 second delay to show selection

        return () => clearTimeout(submitTimer);
      }
    }
  }, [selectedAnswer, showFeedback, isSubmitting, currentQuestion]);

  // Map categories to quiz IDs
  const getQuizIdForCategory = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'science': '6',
      'mathematics': '7', 
      'english': '8',
      'computing': '9'
    };
    return categoryMap[category] || '6';
  };

  // Start quiz
  const startQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (authLoading) return;
      if (!user) throw new Error('Authentication required. Please log in again.');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Failed to get authentication session. Please log in again.');
      }

      const quizId = getQuizIdForCategory(category || 'science');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/start?quiz_id=${quizId}&questions=15`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Debug test failed for category: ${category}`);
      }

      const result = await response.json();
      console.log('Quiz service response:', JSON.stringify(result, null, 2));
      
      // Debug response structure
      if (!result.data.success) {
        console.error('Quiz service returned success: false', result);
        throw new Error(result.data.error?.message || 'Quiz service returned an error');
      }
      
      if (!result.data.data) {
        console.error('Quiz service returned no data:', result);
        throw new Error('Quiz service returned no data');
      }
      
      if (!result.data.data.questions) {
        console.error('Quiz service returned no questions array:', result.data);
        throw new Error('Quiz service returned no questions');
      }
      
      const questions = result.data.data.questions || [];
      if (questions.length === 0) {
        throw new Error('No questions available for this category. Please try another category.');
      }
      
      const transformedQuestions = questions.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b, 
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        hint: q.hint,
        points: q.points || 10,
        time_limit: q.time_limit || 30,
        difficulty: q.difficulty || 'medium'
      }));
      
      setQuizSession({
        id: quizId,
        questions: transformedQuestions,
        start_time: new Date().toISOString(),
        total_questions: transformedQuestions.length,
        hints_used: 0
      });
      
      setCurrentQuestion(0);
      setSessionStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setTimeLeft(transformedQuestions[0]?.time_limit || 30);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Get hint for current question
  const getHint = async () => {
    if (!quizSession || !quizSession.questions[currentQuestion]) return;

    const question = quizSession.questions[currentQuestion];
    if (hintRequested.has(question.id)) return;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/questions/${question.id}/hint`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.hint) {
          setShowHint(true);
          setHintRequested(new Set([...hintRequested, question.id]));
          setQuizSession(prev => prev ? {
            ...prev,
            hints_used: prev.hints_used + 1
          } : null);
        }
      }
    } catch (err) {
      console.error('Error getting hint:', err);
    }
  };

  // Handle answer submission with instant feedback
  const handleAnswerSubmit = () => {
    if (!quizSession || isSubmitting) return;
    
    setIsSubmitting(true);
    const question = quizSession.questions[currentQuestion];
    const answer = selectedAnswer || 'TIMEOUT';
    const isCorrect = answer === question.correct_answer;
    
    // Record answer time
    const timeTaken = Date.now() - questionStartTime;
    setQuestionTimes(prev => ({
      ...prev,
      [question.id]: timeTaken
    }));
    
    // Save answer
    setUserAnswers(prev => ({
      ...prev,
      [question.id]: answer
    }));
    
    // Show instant feedback
    setFeedbackType(isCorrect ? 'correct' : 'incorrect');
    setShowFeedback(true);
    setAutoAdvanceTimer(Date.now());
  };

  // Move to next question
  const moveToNextQuestion = () => {
    if (!quizSession) return;

    setShowFeedback(false);
    setFeedbackType(null);
    setAutoAdvanceTimer(null);
    setSelectedAnswer(null);
    setShowHint(false);
    setIsSubmitting(false);

    if (currentQuestion < quizSession.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCanNavigateBack(true);
      setQuestionStartTime(Date.now());
      setTimeLeft(quizSession.questions[currentQuestion + 1]?.time_limit || 30);
    } else {
      finishQuiz();
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestion > 0 && !showFeedback && !isSubmitting) {
      setCurrentQuestion(prev => prev - 1);
      setQuestionStartTime(Date.now());
      setTimeLeft(quizSession?.questions[currentQuestion - 1]?.time_limit || 30);
      setIsSubmitting(false);
      const prevQuestionId = quizSession?.questions[currentQuestion - 1].id;
      if (prevQuestionId && userAnswers[prevQuestionId]) {
        setSelectedAnswer(userAnswers[prevQuestionId]);
      } else {
        setSelectedAnswer(null);
      }
    }
  };

  // Navigate to next question manually
  const goToNextQuestion = () => {
    if (currentQuestion < (quizSession?.questions.length || 0) - 1 && !showFeedback && !isSubmitting) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionStartTime(Date.now());
      setTimeLeft(quizSession?.questions[currentQuestion + 1]?.time_limit || 30);
      setCanNavigateBack(true);
      setIsSubmitting(false);
      const nextQuestionId = quizSession?.questions[currentQuestion + 1].id;
      if (nextQuestionId && userAnswers[nextQuestionId]) {
        setSelectedAnswer(userAnswers[nextQuestionId]);
      } else {
        setSelectedAnswer(null);
      }
    }
  };

  // Create balloon animation
  const createBalloons = useCallback(() => {
    const colors = ['#FF6B9D', '#C44569', '#FFC312', '#EA2027', '#0652DD', '#9980FA', '#5758BB', '#1B1464'];
    const newBalloons = Array.from({length: 30}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 100 + Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 2,
      size: 40 + Math.random() * 40
    }));
    setBalloons(newBalloons);
  }, []);

  // Create confetti animation
  const createConfetti = useCallback(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#E74C3C'];
    const newConfetti = Array.from({length: 100}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
      velocity: 3 + Math.random() * 3
    }));
    setConfettiPieces(newConfetti);
  }, []);

  // Launch celebration for high scores
  const launchCelebration = useCallback((percentage: number) => {
    // Only trigger if not already showing and score is genuinely >= 80%
    if (percentage >= 80 && !showBalloons) {
      // Balloon pop animation for >= 80%
      createBalloons();
      setShowBalloons(true);
      
      setTimeout(() => {
        setShowBalloons(false);
      }, 6000);
    }
    
    if (percentage >= 90) {
      // Add confetti for >= 90%
      createConfetti();
      setShowConfetti(true);
      
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  }, [createBalloons, createConfetti]);

  // Finish quiz with gamification
  const finishQuiz = async () => {
    if (!quizSession || !user) return;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Authentication error. Please try logging in again.');
        return;
      }

      // Transform answers to match backend format
      const formattedAnswers = Object.entries(userAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        user_answer: answer,
        response_time: questionTimes[parseInt(questionId)] || 0
      }));
      
      // Submit to original quiz service
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/${quizSession.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          time_taken: Math.floor((Date.now() - sessionStartTime) / 1000),
          hints_used_list: Array.from(hintRequested)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data) {
          const quizResultData: QuizResult = {
            score: result.data.final_score || 0,
            max_score: result.data.max_possible_score || 100,
            percentage: result.data.percentage || 0,
            time_taken: result.data.time_taken || 0,
            correct_answers: result.data.correct_answers || 0,
            total_questions: result.data.total_questions || 0,
            hints_used: result.data.hints_used || 0,
            hint_penalty: result.data.hint_penalty || 0,
            time_bonus: result.data.time_bonus || 0,
            game_mode: 'challenge',
            responses: (result.data.results || []).map((r: any) => ({
              question_id: r.question_id,
              question_text: r.question_text,
              user_answer: r.user_answer,
              correct_answer: r.correct_answer,
              is_correct: r.is_correct,
              explanation: r.explanation,
              points_earned: r.total_points || r.points_earned || 0,
              response_time: questionTimes[r.question_id] || 0
            }))
          };
          
          // Get user profile for name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          
          // Call gamification processor
          try {
            const gamificationResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-gamification-processor`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  quiz_id: quizSession.id,
                  quiz_result: quizResultData,
                  questions: quizSession.questions,
                  category: category,
                  user_name: profile?.full_name || 'Anonymous'
                })
              }
            );
            
            if (gamificationResponse.ok) {
              const gamificationData = await gamificationResponse.json();
              // Use optional chaining to safely access gamification data
              if (gamificationData?.data) {
                quizResultData.new_streak = gamificationData.data.new_streak ?? undefined;
                quizResultData.total_points = gamificationData.data.total_points ?? undefined;
                quizResultData.achievements_unlocked = gamificationData.data.achievements_unlocked ?? undefined;
              }
            } else {
              // Log detailed error for debugging
              const errorText = await gamificationResponse.text();
              console.error('Gamification processor failed:', {
                status: gamificationResponse.status,
                statusText: gamificationResponse.statusText,
                error: errorText
              });
            }
          } catch (gamificationError) {
            console.error('Gamification processing error:', gamificationError);
            // Continue even if gamification fails
          }
          
          // Save quiz result to database for analytics
          try {
            const { error: saveError } = await supabase
              .from('quiz_scores')
              .insert({
                user_id: user.id,
                quiz_id: parseInt(quizSession.id),
                category: category,
                score: quizResultData.score,
                max_score: quizResultData.max_score,
                percentage: quizResultData.percentage,
                time_taken: quizResultData.time_taken,
                correct_answers: quizResultData.correct_answers,
                total_questions: quizResultData.total_questions,
                hints_used: quizResultData.hints_used,
                hint_penalty: quizResultData.hint_penalty,
                time_bonus: quizResultData.time_bonus,
                game_mode: quizResultData.game_mode,
                is_completed: true
              });
            
            if (saveError) {
              console.error('Error saving quiz result:', saveError);
              // Continue even if save fails - don't block user experience
            }
          } catch (saveError) {
            console.error('Error saving quiz result:', saveError);
            // Continue even if save fails
          }
          
          setQuizResult(quizResultData);
          
          // Trigger celebration for good scores (only once per quiz completion)
          if (quizResultData.percentage >= 80 && !showBalloons) {
            launchCelebration(quizResultData.percentage);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('Error finishing quiz:', err);
      setError('Failed to submit quiz');
    }
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{authLoading ? 'Checking Authentication...' : 'Starting Quiz...'}</h2>
          <p className="text-slate-600">{authLoading ? 'Verifying your session' : 'Preparing your questions'}</p>
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
              onClick={startQuiz}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-700 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz result screen (PART 2 will follow...)
  // Quiz result screen with enhanced gamification display
  if (quizResult) {
    const percentage = quizResult.percentage;
    const isExcellent = percentage >= 90;
    const isGood = percentage >= 80;
    const isPassing = percentage >= 60;

    return (
      <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
        <div className="max-w-4xl w-full relative z-10">
          {/* Balloon Animation */}
          {showBalloons && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {balloons.map((balloon) => (
                <div
                  key={balloon.id}
                  className="absolute animate-balloon-float"
                  style={{
                    left: `${balloon.x}%`,
                    bottom: '-10%',
                    animationDelay: `${balloon.delay}s`,
                    animationDuration: `${balloon.duration}s`,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: `${balloon.size}px`,
                      height: `${balloon.size * 1.2}px`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full animate-balloon-wobble"
                      style={{
                        backgroundColor: balloon.color,
                        boxShadow: `inset -10px -10px 20px rgba(0,0,0,0.1), 0 4px 20px ${balloon.color}40`,
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                      style={{
                        width: '2px',
                        height: '40px',
                        backgroundColor: balloon.color,
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confetti Animation */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {confettiPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="absolute animate-confetti-fall"
                  style={{
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    backgroundColor: piece.color,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: '3s',
                    width: '10px',
                    height: '10px',
                    transform: `rotate(${piece.rotation}deg)`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header with gamification elements */}
            <div className={`p-6 sm:p-8 text-white ${
              isExcellent ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              isGood ? 'bg-gradient-to-r from-green-400 to-blue-500' :
              isPassing ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
              'bg-gradient-to-r from-slate-400 to-slate-600'
            }`}>
              <div className="text-center">
                <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  {isExcellent ? <Sparkles className="h-10 w-10" /> : <Trophy className="h-10 w-10" />}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                  {isExcellent ? 'Outstanding!' : isGood ? 'Great Job!' : isPassing ? 'Good Effort!' : 'Keep Practicing!'}
                </h2>
                <p className="text-xl opacity-90 capitalize">{category} Quiz Complete</p>
                
                {/* Gamification Stats - Only show if data is valid */}
                {quizResult.new_streak != null && quizResult.new_streak > 1 && (
                  <div className="mt-4 bg-white/20 rounded-lg p-3 inline-block">
                    <p className="text-sm font-medium">Streak: {quizResult.new_streak} days</p>
                  </div>
                )}
                {quizResult.achievements_unlocked != null && Array.isArray(quizResult.achievements_unlocked) && quizResult.achievements_unlocked.length > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      {quizResult.achievements_unlocked.length} Achievement{quizResult.achievements_unlocked.length > 1 ? 's' : ''} Unlocked!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Score Summary with enhanced stats */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{percentage}%</p>
                  <p className="text-sm text-slate-600">Score</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{quizResult.correct_answers}/{quizResult.total_questions}</p>
                  <p className="text-sm text-slate-600">Correct</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{quizResult.time_taken}s</p>
                  <p className="text-sm text-slate-600">Time</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                    {quizResult.total_points ?? quizResult.score}
                  </p>
                  <p className="text-sm text-slate-600">Points</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Question Review</h3>
                  <button
                    onClick={() => navigate(`/analytics?category=${category}`)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    <TrendingUp className="h-4 w-4" />
                    View Analytics
                  </button>
                </div>
                {quizResult.responses.map((response, idx) => (
                  <div
                    key={response.question_id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      response.is_correct 
                        ? 'border-green-200 bg-green-50 hover:shadow-md' 
                        : 'border-red-200 bg-red-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {response.is_correct ? (
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-800">Question {idx + 1}</p>
                          <span className="text-sm font-medium text-blue-600">
                            +{response.points_earned} pts
                          </span>
                        </div>
                        <p className="text-slate-700 mb-2">{response.question_text}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className={`font-medium px-2 py-1 rounded ${
                              response.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              Your Answer: {response.user_answer}
                            </span>
                            {!response.is_correct && (
                              <span className="font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                                Correct: {response.correct_answer}
                              </span>
                            )}
                            {response.response_time && (
                              <span className="text-slate-600">
                                {Math.floor(response.response_time / 1000)}s
                              </span>
                            )}
                          </div>
                          {response.explanation && (
                            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <p className="text-blue-800">
                                <strong>Explanation:</strong> {response.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                  Go Home
                </button>
                <button
                  onClick={startQuiz}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes balloon-float {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            50% {
              transform: translateY(-50vh) rotate(180deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-110vh) rotate(360deg);
              opacity: 0;
            }
          }
          
          @keyframes balloon-wobble {
            0%, 100% {
              transform: rotate(-3deg);
            }
            50% {
              transform: rotate(3deg);
            }
          }
          
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          
          .animate-balloon-float {
            animation: balloon-float 6s ease-in-out forwards;
          }
          
          .animate-balloon-wobble {
            animation: balloon-wobble 1s ease-in-out infinite;
          }
          
          .animate-confetti-fall {
            animation: confetti-fall 3s ease-in-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // Quiz in progress (PART 3 will follow...)
  // Quiz in progress with enhanced UX
  if (!quizSession) return null;

  const question = quizSession.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizSession.questions.length) * 100;
  const answeredQuestions = Object.keys(userAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with enhanced progress */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold capitalize mb-1">{category} Quiz</h2>
                <p className="text-sm opacity-90">
                  Question {currentQuestion + 1} of {quizSession.questions.length}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  timeLeft <= 10 ? 'bg-red-500/30 animate-pulse' : 'bg-white/20'
                }`}>
                  <Clock className="h-5 w-5" />
                  <span className="text-lg font-bold">{timeLeft}s</span>
                </div>
                <div className="bg-white/20 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium">
                    {answeredQuestions}/{quizSession.questions.length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Content with instant feedback */}
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex-1">
                  {question.question_text}
                </h3>
                <button
                  onClick={getHint}
                  disabled={hintRequested.has(question.id) || showFeedback}
                  className={`ml-4 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    hintRequested.has(question.id) || showFeedback
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  {hintRequested.has(question.id) ? 'Used' : 'Hint'}
                </button>
              </div>
              
              {/* Hint display */}
              {showHint && question.hint && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg mb-6 animate-fade-in">
                  <div className="flex">
                    <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-800">
                      <strong>Hint:</strong> {question.hint}
                    </p>
                  </div>
                </div>
              )}

              {/* Instant feedback */}
              {showFeedback && (
                <div className={`p-4 rounded-lg mb-6 animate-fade-in ${
                  feedbackType === 'correct' 
                    ? 'bg-green-50 border-l-4 border-green-500' 
                    : 'bg-red-50 border-l-4 border-red-500'
                }`}>
                  <div className="flex items-center">
                    {feedbackType === 'correct' ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <p className="text-green-800 font-medium">
                          Correct! Well done!
                        </p>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                        <p className="text-red-800 font-medium">
                          Incorrect. The correct answer is: <strong>{question.correct_answer}</strong>
                        </p>
                      </>
                    )}
                  </div>
                  {question.explanation && (
                    <p className="text-sm text-slate-700 mt-2 ml-7">
                      {question.explanation}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-2 ml-7">
                    Auto-advancing in 2.5 seconds...
                  </p>
                </div>
              )}
            </div>

            {/* Answer options with enhanced styling */}
            <div className="space-y-3 mb-8">
              {[
                { key: 'A', value: question.option_a },
                { key: 'B', value: question.option_b },
                { key: 'C', value: question.option_c },
                { key: 'D', value: question.option_d },
              ].filter(option => option.value).map((option) => {
                const isSelected = selectedAnswer === option.key;
                const isCorrect = option.key === question.correct_answer;
                const showCorrectAnswer = showFeedback && isCorrect;
                const showIncorrectAnswer = showFeedback && isSelected && !isCorrect;

                return (
                  <button
                    key={option.key}
                    onClick={() => {
                      if (!showFeedback && !isSubmitting && !userAnswers[question.id]) {
                        setSelectedAnswer(option.key);
                      }
                    }}
                    disabled={showFeedback || isSubmitting || !!userAnswers[question.id]}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      showCorrectAnswer
                        ? 'border-green-500 bg-green-50'
                        : showIncorrectAnswer
                        ? 'border-red-500 bg-red-50'
                        : isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-md transform scale-[1.02]'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    } ${showFeedback || isSubmitting || !!userAnswers[question.id] ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center">
                      <span className={`font-bold text-lg mr-3 w-8 h-8 rounded-full flex items-center justify-center ${
                        showCorrectAnswer
                          ? 'bg-green-500 text-white'
                          : showIncorrectAnswer
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {option.key}
                      </span>
                      <span className="text-base flex-1">{option.value}</span>
                      {showCorrectAnswer && (
                        <CheckCircle className="h-6 w-6 text-green-600 ml-2" />
                      )}
                      {showIncorrectAnswer && (
                        <XCircle className="h-6 w-6 text-red-600 ml-2" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons - Enhanced for manual navigation */}
            <div className="flex gap-4">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestion === 0 || showFeedback || isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  currentQuestion === 0 || showFeedback || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </button>

              <button
                onClick={goToNextQuestion}
                disabled={currentQuestion >= quizSession.questions.length - 1 || showFeedback || isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  currentQuestion >= quizSession.questions.length - 1 || showFeedback || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Show processing state */}
              {isSubmitting && (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-blue-100 text-blue-800 font-semibold">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                  Submitting...
                </div>
              )}
            </div>

            {/* Progress indicator */}
            <div className="mt-6 text-center text-sm text-slate-600">
              <p>
                {answeredQuestions} of {quizSession.questions.length} questions answered
                {canNavigateBack && ' • You can go back to previous questions'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for fade-in animation */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
