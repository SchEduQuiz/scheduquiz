import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, Award, Clock, Target, ChevronLeft, 
  BarChart3, PieChart, Calendar, Trophy, Flame,
  CheckCircle, XCircle, Lightbulb, Zap
} from 'lucide-react';

interface QuizScore {
  id: string;
  quiz_id: number;
  category: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken: number;
  correct_answers: number;
  total_questions: number;
  hints_used: number;
  created_at: string;
}

interface CategoryAnalytics {
  category: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  totalQuestions: number;
  totalCorrect: number;
  averageTime: number;
  recentScores: number[];
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const category = searchParams.get('category') || 'all';
  
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [analytics, setAnalytics] = useState<CategoryAnalytics | null>(null);
  const [allCategoryStats, setAllCategoryStats] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, selectedCategory]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load all quiz scores for the user
      let query = supabase
        .from('quiz_scores')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_completed', true)
        .order('created_at', { ascending: false });

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: scores, error } = await query;

      if (error) {
        console.error('Error loading quiz scores:', error);
        return;
      }

      setQuizScores(scores || []);

      // Calculate analytics
      if (scores && scores.length > 0) {
        if (selectedCategory && selectedCategory !== 'all') {
          // Single category analytics
          const categoryScores = scores.filter(s => s.category === selectedCategory);
          const analytics = calculateCategoryAnalytics(selectedCategory, categoryScores);
          setAnalytics(analytics);
        } else {
          // All categories analytics
          const categoriesMap = new Map<string, QuizScore[]>();
          scores.forEach(score => {
            if (!categoriesMap.has(score.category)) {
              categoriesMap.set(score.category, []);
            }
            categoriesMap.get(score.category)!.push(score);
          });

          const allStats = Array.from(categoriesMap.entries()).map(([cat, scores]) => 
            calculateCategoryAnalytics(cat, scores)
          );
          setAllCategoryStats(allStats);
        }
      } else {
        setAnalytics(null);
        setAllCategoryStats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryAnalytics = (category: string, scores: QuizScore[]): CategoryAnalytics => {
    const totalAttempts = scores.length;
    const averageScore = scores.reduce((sum, s) => sum + s.percentage, 0) / totalAttempts;
    const bestScore = Math.max(...scores.map(s => s.percentage));
    const totalQuestions = scores.reduce((sum, s) => sum + s.total_questions, 0);
    const totalCorrect = scores.reduce((sum, s) => sum + s.correct_answers, 0);
    const averageTime = scores.reduce((sum, s) => sum + s.time_taken, 0) / totalAttempts;
    const recentScores = scores.slice(0, 10).map(s => s.percentage);

    return {
      category,
      totalAttempts,
      averageScore,
      bestScore,
      totalQuestions,
      totalCorrect,
      averageTime,
      recentScores
    };
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      science: 'blue',
      mathematics: 'purple',
      english: 'green',
      computing: 'orange'
    };
    return colors[category] || 'slate';
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'text-yellow-600' };
    if (percentage >= 80) return { label: 'Great', color: 'text-green-600' };
    if (percentage >= 70) return { label: 'Good', color: 'text-blue-600' };
    if (percentage >= 60) return { label: 'Fair', color: 'text-orange-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (quizScores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Home
          </button>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Quiz Data Yet</h2>
            <p className="text-slate-600 mb-6">
              Complete some quizzes to see your performance analytics here.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start a Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Home
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Quiz Analytics</h1>
              <p className="text-slate-600">Track your progress and identify areas for improvement</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {['science', 'mathematics', 'english', 'computing'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                  selectedCategory === cat
                    ? `bg-${getCategoryColor(cat)}-600 text-white`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Single Category View */}
        {selectedCategory !== 'all' && analytics && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Total Attempts</p>
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.totalAttempts}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Average Score</p>
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.averageScore.toFixed(1)}%</p>
                <p className={`text-sm font-medium mt-1 ${getPerformanceLevel(analytics.averageScore).color}`}>
                  {getPerformanceLevel(analytics.averageScore).label}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Best Score</p>
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.bestScore.toFixed(1)}%</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Avg Time</p>
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{Math.round(analytics.averageTime)}s</p>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Performance Trend
              </h3>
              <div className="flex items-end justify-between gap-2 h-64">
                {analytics.recentScores.slice(0, 10).reverse().map((score, idx) => {
                  const height = (score / 100) * 100;
                  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : 'bg-orange-500';
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                      <div className="text-xs font-medium text-slate-600 mb-1">{score.toFixed(0)}%</div>
                      <div
                        className={`w-full ${color} rounded-t-lg transition-all hover:opacity-80`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-slate-500 mt-2">{idx + 1}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm text-slate-600 mt-4">Recent Attempts (oldest to newest)</p>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Accuracy Rate
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Correct Answers</span>
                      <span className="font-medium">{analytics.totalCorrect}/{analytics.totalQuestions}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${(analytics.totalCorrect / analytics.totalQuestions) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      {((analytics.totalCorrect / analytics.totalQuestions) * 100).toFixed(1)}% accuracy
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-slate-700">Questions Answered</span>
                    <span className="font-bold text-blue-600">{analytics.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-slate-700">Correct Answers</span>
                    <span className="font-bold text-green-600">{analytics.totalCorrect}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-slate-700">Incorrect Answers</span>
                    <span className="font-bold text-red-600">{analytics.totalQuestions - analytics.totalCorrect}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Quiz History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                Recent Quiz History
              </h3>
              <div className="space-y-3">
                {quizScores.slice(0, 10).map((score, idx) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-slate-500">#{idx + 1}</div>
                      <div>
                        <p className="font-medium text-slate-800 capitalize">{score.category} Quiz</p>
                        <p className="text-sm text-slate-600">
                          {new Date(score.created_at).toLocaleDateString()} at {new Date(score.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">{score.percentage.toFixed(1)}%</p>
                        <p className="text-sm text-slate-600">{score.correct_answers}/{score.total_questions} correct</p>
                      </div>
                      <div className="text-sm text-slate-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {score.time_taken}s
                      </div>
                      {score.hints_used > 0 && (
                        <div className="text-sm text-yellow-600 flex items-center gap-1">
                          <Lightbulb className="h-4 w-4" />
                          {score.hints_used}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Categories View */}
        {selectedCategory === 'all' && allCategoryStats.length > 0 && (
          <div className="space-y-8">
            {/* Overall Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Total Quizzes</p>
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{quizScores.length}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Overall Average</p>
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {(quizScores.reduce((sum, s) => sum + s.percentage, 0) / quizScores.length).toFixed(1)}%
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Categories</p>
                  <PieChart className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{allCategoryStats.length}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Total Questions</p>
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {quizScores.reduce((sum, s) => sum + s.total_questions, 0)}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Performance by Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allCategoryStats.map((stat) => {
                  const color = getCategoryColor(stat.category);
                  return (
                    <div key={stat.category} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-slate-800 capitalize">{stat.category}</h4>
                        <button
                          onClick={() => setSelectedCategory(stat.category)}
                          className={`text-sm text-${color}-600 hover:text-${color}-700 font-medium`}
                        >
                          View Details
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600">Attempts</p>
                          <p className="text-2xl font-bold text-slate-800">{stat.totalAttempts}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Avg Score</p>
                          <p className="text-2xl font-bold text-slate-800">{stat.averageScore.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Best Score</p>
                          <p className="text-2xl font-bold text-slate-800">{stat.bestScore.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Accuracy</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {((stat.totalCorrect / stat.totalQuestions) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`bg-${color}-500 h-2 rounded-full`}
                            style={{ width: `${stat.averageScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-700 transition"
          >
            Back to Home
          </button>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
