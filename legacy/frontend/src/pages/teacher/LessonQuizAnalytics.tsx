import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { BookOpen, Users, TrendingUp, AlertTriangle, Award, Clock, Target } from 'lucide-react';

interface QuizAnalytics {
  lessonId: string;
  lessonTitle: string;
  quizTitle: string;
  stats: {
    totalStudents: number;
    completedQuizzes: number;
    passedQuizzes: number;
    averageScore: number;
    averageTimeSpent: number;
    passRate: number;
    completionRate: number;
  };
  attempts: {
    id: string;
    studentName: string;
    score: number;
    percentage: number;
    passed: boolean;
    timeSpent: number;
    attemptNumber: number;
    completedAt: string;
  }[];
  questionStats: {
    questionId: string;
    question: string;
    difficulty: string;
    correctAnswers: number;
    totalAnswers: number;
    accuracy: number;
    averageTime: number;
  }[];
  commonMistakes: string[];
  recommendations: string[];
}

export default function LessonQuizAnalytics() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'scores' | 'time' | 'attempts'>('scores');

  useEffect(() => {
    if (user && courseId && lessonId) {
      loadAnalytics();
    }
  }, [user, courseId, lessonId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load lesson and quiz data
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      const { data: quizData } = await supabase
        .from('lesson_quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (!quizData) {
        setAnalytics(null);
        return;
      }

      // Load all attempts for this quiz
      const { data: attemptsData } = await supabase
        .from('lesson_quiz_attempts')
        .select(`
          *,
          profiles!lesson_quiz_attempts_user_id_fkey(full_name)
        `)
        .eq('quiz_id', quizData.id)
        .order('created_at', { ascending: false });

      // Load course enrollments to get total students
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      // Load question statistics
      const { data: questionsData } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('quiz_id', quizData.id);

      // Load response statistics
      const { data: responsesData } = await supabase
        .from('lesson_quiz_responses')
        .select(`
          *,
          lesson_questions!lesson_quiz_responses_question_id_fkey(question_text, difficulty)
        `)
        .in('question_id', questionsData?.map(q => q.id) || []);

      // Calculate analytics
      const totalStudents = enrollmentsData?.length || 0;
      const completedQuizzes = attemptsData?.length || 0;
      const passedQuizzes = attemptsData?.filter(a => a.passed).length || 0;
      const averageScore = attemptsData?.length 
        ? attemptsData.reduce((sum, a) => sum + a.percentage, 0) / attemptsData.length 
        : 0;
      const averageTimeSpent = attemptsData?.length
        ? attemptsData.reduce((sum, a) => sum + a.time_spent, 0) / attemptsData.length
        : 0;
      const passRate = completedQuizzes > 0 ? (passedQuizzes / completedQuizzes) * 100 : 0;
      const completionRate = totalStudents > 0 ? (completedQuizzes / totalStudents) * 100 : 0;

      // Process attempts for chart data
      const processedAttempts = attemptsData?.map(attempt => ({
        id: attempt.id,
        studentName: attempt.profiles?.full_name || 'Unknown Student',
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeSpent: attempt.time_spent,
        attemptNumber: attempt.attempt_number,
        completedAt: new Date(attempt.completed_at).toLocaleDateString()
      })) || [];

      // Calculate question statistics
      const questionStats = questionsData?.map(question => {
        const questionResponses = responsesData?.filter(r => r.question_id === question.id) || [];
        const correctAnswers = questionResponses.filter(r => r.is_correct).length;
        const totalAnswers = questionResponses.length;
        const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
        const averageTime = totalAnswers > 0 
          ? questionResponses.reduce((sum, r) => sum + r.response_time, 0) / totalAnswers 
          : 0;

        return {
          questionId: question.id,
          question: question.question_text.length > 50 
            ? question.question_text.substring(0, 50) + '...' 
            : question.question_text,
          difficulty: question.difficulty,
          correctAnswers,
          totalAnswers,
          accuracy: Math.round(accuracy),
          averageTime: Math.round(averageTime)
        };
      }) || [];

      // Generate recommendations based on data
      const recommendations = generateRecommendations({
        passRate,
        completionRate,
        averageScore,
        questionStats,
        totalStudents,
        completedQuizzes
      });

      // Generate common mistakes (placeholder - would need more sophisticated analysis)
      const commonMistakes = generateCommonMistakes(questionStats);

      setAnalytics({
        lessonId: lessonId!,
        lessonTitle: lessonData?.title || 'Unknown Lesson',
        quizTitle: quizData.title,
        stats: {
          totalStudents,
          completedQuizzes,
          passedQuizzes,
          averageScore: Math.round(averageScore * 100) / 100,
          averageTimeSpent: Math.round(averageTimeSpent),
          passRate: Math.round(passRate * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100
        },
        attempts: processedAttempts,
        questionStats,
        commonMistakes,
        recommendations
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (data: any): string[] => {
    const recommendations: string[] = [];
    
    if (data.passRate < 70) {
      recommendations.push('Consider reviewing lesson content - pass rate is below 70%');
    }
    
    if (data.completionRate < 80) {
      recommendations.push('Some students may be struggling to complete the lesson - check engagement levels');
    }
    
    if (data.averageScore < 75) {
      recommendations.push('Overall scores are below expectations - consider adjusting difficulty or adding more practice');
    }
    
    const difficultQuestions = data.questionStats.filter((q: any) => q.accuracy < 50);
    if (difficultQuestions.length > 0) {
      recommendations.push(`${difficultQuestions.length} question(s) have low accuracy rates - review these concepts`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Quiz performance is good! Consider creating more challenging questions for advanced students');
    }
    
    return recommendations;
  };

  const generateCommonMistakes = (questionStats: any[]): string[] => {
    return questionStats
      .filter(q => q.accuracy < 70)
      .map(q => `${q.question} (${q.accuracy}% accuracy)`)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Quiz Data</h2>
          <p className="text-slate-600">This lesson doesn't have a quiz or no attempts have been recorded yet.</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Lesson Quiz Analytics</h1>
              <p className="text-slate-600">{analytics.lessonTitle}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Students</p>
                <p className="text-3xl font-bold text-slate-800">{analytics.stats.totalStudents}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">{analytics.stats.completionRate}%</p>
              </div>
              <Target className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pass Rate</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.stats.passRate}%</p>
              </div>
              <Award className="h-10 w-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Average Score</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.stats.averageScore}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Score Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Score Distribution</h3>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p>Chart will be available once recharts is properly configured</p>
            </div>
          </div>

          {/* Pass/Fail Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pass/Fail Distribution</h3>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p>Chart will be available once recharts is properly configured</p>
            </div>
          </div>
        </div>

        {/* Question Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Question Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Question</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Difficulty</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Accuracy</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Avg Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {analytics.questionStats.map((question, index) => (
                  <tr key={question.questionId} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-800">{question.question}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${
                        question.accuracy >= 80 ? 'text-green-600' :
                        question.accuracy >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {question.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{question.averageTime}s</td>
                    <td className="py-3 px-4 text-slate-600">{question.totalAnswers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Common Mistakes */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Areas Needing Attention</h3>
            <div className="space-y-3">
              {analytics.commonMistakes.map((mistake, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{mistake}</p>
                </div>
              ))}
              {analytics.commonMistakes.length === 0 && (
                <p className="text-slate-500 text-center py-4">No common mistakes identified</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {analytics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="bg-white rounded-xl p-6 shadow-sm mt-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Attempts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Time Spent</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Attempt #</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.attempts.slice(0, 10).map((attempt) => (
                  <tr key={attempt.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-800">{attempt.studentName}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{attempt.percentage}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{Math.floor(attempt.timeSpent / 60)}:{(attempt.timeSpent % 60).toString().padStart(2, '0')}</td>
                    <td className="py-3 px-4 text-slate-600">{attempt.attemptNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{attempt.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}