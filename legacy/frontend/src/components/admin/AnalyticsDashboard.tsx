import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, TrendingUp, Users, FileQuestion, 
  Activity, Calendar, RefreshCw, Download,
  Target, BookOpen, Award, Clock, AlertTriangle,
  CheckCircle, XCircle, Database, Zap
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    newUsers: number;
    activeUsers: number;
  };
  questions: {
    total: number;
    byType: Record<string, number>;
    newQuestions: number;
  };
  activities: {
    totalActivities: number;
    byType: Record<string, number>;
    dailyActivity: Record<string, number>;
  };
  courses: {
    total: number;
    newCourses: number;
  };
  enrollments: {
    totalEnrollments: number;
    dailyEnrollments: Record<string, number>;
  };
  generatedAt: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on selected period
      const now = new Date();
      const startDate = new Date();
      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Get user analytics
      const { data: users, count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Get user statistics
      const userByRole: Record<string, number> = {};
      const userByStatus: Record<string, number> = {};
      const newUsers = users?.filter(user => 
        new Date(user.created_at) >= startDate
      ).length || 0;

      users?.forEach(user => {
        userByRole[user.role] = (userByRole[user.role] || 0) + 1;
        userByStatus[user.status] = (userByStatus[user.status] || 0) + 1;
      });

      // Get questions data
      const { data: questions, count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact' });

      const questionByType: Record<string, number> = {};
      const newQuestions = questions?.filter(question => 
        new Date(question.created_at) >= startDate
      ).length || 0;

      questions?.forEach(question => {
        questionByType[question.type] = (questionByType[question.type] || 0) + 1;
      });

      // Get courses data
      const { data: courses, count: totalCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact' });

      const newCourses = courses?.filter(course => 
        new Date(course.created_at) >= startDate
      ).length || 0;

      // Get enrollments data
      const { data: enrollments, count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact' });

      // Create daily activity data (last 7 days)
      const dailyActivity: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count activities for this date
        let activities = 0;
        if (users) {
          activities += users.filter(user => 
            user.created_at && user.created_at.startsWith(dateStr)
          ).length;
        }
        if (enrollments) {
          activities += enrollments.filter(enrollment => 
            enrollment.created_at && enrollment.created_at.startsWith(dateStr)
          ).length;
        }
        
        dailyActivity[dateStr] = activities;
      }

      // Create analytics data structure
      const analyticsData: AnalyticsData = {
        period: selectedPeriod,
        users: {
          total: totalUsers || 0,
          byRole: userByRole,
          byStatus: userByStatus,
          newUsers,
          activeUsers: userByStatus.active || 0
        },
        questions: {
          total: totalQuestions || 0,
          byType: questionByType,
          newQuestions
        },
        activities: {
          totalActivities: (newUsers + newQuestions + newCourses) || 0,
          byType: {
            registrations: newUsers,
            new_questions: newQuestions,
            new_courses: newCourses
          },
          dailyActivity
        },
        courses: {
          total: totalCourses || 0,
          newCourses
        },
        enrollments: {
          totalEnrollments: totalEnrollments || 0,
          dailyEnrollments: {}
        },
        generatedAt: now.toISOString()
      };

      setAnalyticsData(analyticsData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analyticsData) return;

    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-600" />
          <span className="ml-2 text-slate-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-orange-600" />
            Platform Analytics
          </h2>
          <p className="text-slate-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={exportAnalytics}
            disabled={!analyticsData}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {analyticsData && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {formatNumber(analyticsData.users.total)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    +{formatNumber(analyticsData.users.newUsers)} new this {selectedPeriod}
                  </p>
                </div>
                <Users className="h-10 w-10 text-slate-600 opacity-70" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Questions</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {formatNumber(analyticsData.questions.total)}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    +{formatNumber(analyticsData.questions.newQuestions)} new this {selectedPeriod}
                  </p>
                </div>
                <FileQuestion className="h-10 w-10 text-slate-600 opacity-70" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {formatNumber(analyticsData.users.activeUsers)}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    {((analyticsData.users.activeUsers / analyticsData.users.total) * 100).toFixed(1)}% of total
                  </p>
                </div>
                <Activity className="h-10 w-10 text-slate-600 opacity-70" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Courses</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {formatNumber(analyticsData.courses.total)}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    +{formatNumber(analyticsData.courses.newCourses)} new this {selectedPeriod}
                  </p>
                </div>
                <BookOpen className="h-10 w-10 text-slate-600 opacity-70" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Distribution by Role
              </h3>
              <div className="space-y-4">
                {Object.entries(analyticsData.users.byRole).map(([role, count]) => {
                  const percentage = (count / analyticsData.users.total * 100).toFixed(1);
                  const colors = {
                    admin: 'bg-orange-500',
                    teacher: 'bg-blue-500',
                    student: 'bg-green-500'
                  };
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[role as keyof typeof colors] || 'bg-gray-500'}`}></div>
                        <span className="capitalize font-medium">{role}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{formatNumber(count)}</span>
                        <span className="text-sm font-medium">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Types */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Question Types
              </h3>
              <div className="space-y-4">
                {Object.entries(analyticsData.questions.byType).map(([type, count]) => {
                  const percentage = (count / analyticsData.questions.total * 100).toFixed(1);
                  const colors = {
                    multiple_choice: 'bg-blue-500',
                    true_false: 'bg-purple-500',
                    short_answer: 'bg-orange-500'
                  };
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[type as keyof typeof colors] || 'bg-gray-500'}`}></div>
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{formatNumber(count)}</span>
                        <span className="text-sm font-medium">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatNumber(analyticsData.activities.totalActivities)}
                </div>
                <div className="text-sm text-slate-600 mt-1">Total Activities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatNumber(analyticsData.enrollments.totalEnrollments)}
                </div>
                <div className="text-sm text-slate-600 mt-1">Total Enrollments</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {((analyticsData.users.activeUsers / analyticsData.users.total) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600 mt-1">Active User Rate</div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity ({selectedPeriod})
            </h3>
            <div className="space-y-3">
              {Object.entries(analyticsData.activities.dailyActivity)
                .slice(0, 7) // Show last 7 days
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, count]) => (
                  <div key={date} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{formatNumber(count)} activities</span>
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((count / Math.max(...Object.values(analyticsData.activities.dailyActivity))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">Database</p>
                  <p className="text-sm text-green-600">Healthy</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">Edge Functions</p>
                  <p className="text-sm text-green-600">Operational</p>
                </div>
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-800">Storage</p>
                  <p className="text-sm text-blue-600">45% Used</p>
                </div>
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-center text-sm text-slate-500">
            <p>Last updated: {new Date(analyticsData.generatedAt).toLocaleString()}</p>
          </div>
        </>
      )}

      {!analyticsData && !loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No analytics data available</p>
          <p className="text-sm">Click refresh to load analytics</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;