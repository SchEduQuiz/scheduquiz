import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase, Assignment, Notification, Grade } from '../../lib/supabase';
import { logApiError } from '../../lib/logger';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  BookOpen, TrendingUp, Clock, CheckCircle, 
  Bell, Calendar, Award, FileText, Bookmark,
  Target, Flame, Medal, ArrowRight, Eye
} from 'lucide-react';

interface AnalyticsData {
  enrolledCourses: number;
  completedLessons: number;
  averageGrade: string;
  currentStreak: number;
  recentActivity: any[];
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get active tab from URL search params
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';


  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load enrolled courses with progress
      await loadEnrolledCourses(user.id);
      
      // Load assignments
      await loadAssignments(user.id);
      
      // Load notifications (last 5)
      await loadNotifications(user.id);
      
      // Load grades
      await loadGrades(user.id);
      
      // Load analytics
      await loadAnalytics(user.id);
    } finally {
      setLoading(false);
    }
  }

  async function loadEnrolledCourses(userId: string) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, enrolled_at')
      .eq('student_id', userId);

    if (enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map(e => e.course_id);
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds);

      if (courses && courses.length > 0) {
        const teacherIds = [...new Set(courses.map(c => c.teacher_id))];
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', teacherIds);

        const coursesWithProgress = await Promise.all(
          courses.map(async (course) => {
            const teacherName = teachers?.find(t => t.id === course.teacher_id)?.full_name || 'Unknown';

            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .eq('course_id', course.id);

            const { data: progress } = await supabase
              .from('lesson_progress')
              .select('completed')
              .eq('course_id', course.id)
              .eq('student_id', userId)
              .eq('completed', true);

            const totalLessons = lessons?.length || 0;
            const completedLessons = progress?.length || 0;
            const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return { ...course, teacherName, totalLessons, completedLessons, progressPercentage };
          })
        );

        setEnrolledCourses(coursesWithProgress);
      }
    }
  }

  async function loadAssignments(userId: string) {
    try {
      // Get all assignments from enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', userId);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        const { data: allAssignments } = await supabase
          .from('assignments')
          .select('*')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true });

        setAssignments(allAssignments || []);
      }
    } catch (error) {
      logApiError('Loading assignments', error, { userId });
    }
  }

  async function loadNotifications(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    setNotifications(data || []);
  }

  async function loadGrades(userId: string) {
    try {
      // First get the grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', userId)
        .order('graded_at', { ascending: false });

      if (gradesError) {
        console.error('Error loading grades:', gradesError);
        setGrades([]);
        return;
      }

      if (gradesData && gradesData.length > 0) {
        // Get the assignment IDs to fetch points_possible
        const assignmentIds = [...new Set(gradesData.map(g => g.assignment_id))];
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('id, title, points_possible')
          .in('id', assignmentIds);

        // Combine the data
        const gradesWithAssignments = gradesData.map(grade => ({
          ...grade,
          assignments: assignmentsData?.find(a => a.id === grade.assignment_id) || null
        }));

        setGrades(gradesWithAssignments);
      } else {
        setGrades([]);
      }
      return;

      setGrades(gradesData || []);
    } catch (error) {
      logApiError('Loading grades', error, { userId });
    }
  }

  async function loadAnalytics(userId: string) {
    try {
      // Get enrolled courses count
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userId);

      // Get completed lessons count
      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('student_id', userId)
        .eq('completed', true);

      // Get average grade from both assignments and quizzes
      let averageGrade = '0';
      try {
        // Get assignment grades with assignment data
        const { data: gradesData } = await supabase
          .from('grades')
          .select('points_earned, assignment_id')
          .eq('student_id', userId);

        // NOTE: Only fetching course assignment grades for dashboard

        let totalGradePoints = 0;
        let totalGradeCount = 0;

        // Add assignment grades
        if (gradesData && gradesData.length > 0) {
          const assignmentIds = [...new Set(gradesData.map(g => g.assignment_id))];
          const { data: assignmentsData } = await supabase
            .from('assignments')
            .select('id, points_possible')
            .in('id', assignmentIds);

          gradesData.forEach(grade => {
            const assignment = assignmentsData?.find(a => a.id === grade.assignment_id);
            if (assignment?.points_possible > 0) {
              const percentage = (grade.points_earned / assignment.points_possible) * 100;
              totalGradePoints += percentage;
              totalGradeCount++;
            }
          });
        }

        // NOTE: Quiz scores are now completely separate from course dashboard
        // This dashboard only shows course assignment grades

        // Calculate overall average
        if (totalGradeCount > 0) {
          averageGrade = Math.round(totalGradePoints / totalGradeCount).toString();
        }
      } catch (error) {
        console.error('Error fetching grades for analytics:', error);
        // Continue with default value if grades query fails
      }

      const enrolledCourses = enrollments?.length || 0;
      const completed = completedLessons?.length || 0;

      // Get streak from user_points table (gamification system)
      let currentStreak = 0;
      try {
        const { data: userPoints } = await supabase
          .from('user_points')
          .select('streak_count')
          .eq('user_id', userId)
          .maybeSingle();
        
        currentStreak = userPoints?.streak_count || 0;
      } catch (error) {
        console.error('Error fetching user points:', error);
        // Continue with default value if gamification data not available
      }

      const analyticsData: AnalyticsData = {
        enrolledCourses,
        completedLessons: completed,
        averageGrade,
        currentStreak,
        recentActivity: []
      };

      setAnalytics(analyticsData);
    } catch (error) {
      logApiError('Loading analytics', error, { userId });
      // Set default values on error
      setAnalytics({
        enrolledCourses: 0,
        completedLessons: 0,
        averageGrade: '0',
        currentStreak: 0,
        recentActivity: []
      });
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      logApiError('Marking notification as read', error, { notificationId });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingAssignments = assignments
    .filter(a => a.due_date && new Date(a.due_date) > new Date())
    .slice(0, 3);

  const recentGrades = grades.slice(0, 5);
  const unreadNotifications = notifications.filter(n => !n.read);

  const handleTabChange = (tab: string) => {
    const url = tab === 'overview' 
      ? '/student/dashboard' 
      : `/student/dashboard?tab=${tab}`;
    navigate(url);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'assignments', name: 'Assignments', icon: FileText },
    { id: 'grades', name: 'Recent Grades', icon: Award }
  ];

  return (
    <DashboardLayout>
      <div className="py-8 px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">My Learning Dashboard</h1>
          <p className="text-slate-600">Track your progress, manage assignments, and achieve your goals</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-slate-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 flex-shrink-0 ${
                      activeTab === tab.id ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="hidden sm:inline">{tab.name}</span>
                    <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Enrolled Courses</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {analytics?.enrolledCourses || enrolledCourses.length}
                    </p>
                  </div>
                  <BookOpen className="h-10 w-10 text-blue-600 opacity-70" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">
                      {analytics?.completedLessons || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600 opacity-70" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Avg Grade</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {analytics?.averageGrade || '0'}%
                    </p>
                  </div>
                  <Award className="h-10 w-10 text-purple-600 opacity-70" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Study Streak</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {analytics?.currentStreak || 0}
                    </p>
                  </div>
                  <Flame className="h-10 w-10 text-orange-600 opacity-70" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-red-600">
                      {upcomingAssignments.length}
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-red-600 opacity-70" />
                </div>
              </div>
            </div>

            {/* Notifications Banner */}
            {unreadNotifications.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                <div className="flex items-start">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      You have {unreadNotifications.length} new notification{unreadNotifications.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-2">
                      {unreadNotifications.slice(0, 3).map(notification => (
                        <div
                          key={notification.id}
                          className="text-sm text-blue-800 flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <strong>{notification.title}</strong>
                            {notification.message && <p className="text-blue-700">{notification.message}</p>}
                          </div>
                          <button
                            onClick={() => markNotificationRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800 ml-4 text-xs underline"
                          >
                            Mark read
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My Courses Section */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">My Courses</h3>
                <div className="space-y-4">
                  {enrolledCourses.length > 0 ? (
                    enrolledCourses.map((course) => (
                      <div 
                        key={course.id} 
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">{course.title}</p>
                          <p className="text-sm text-slate-600 truncate">
                            Teacher: {course.teacherName || 'Unknown'} • {course.completedLessons}/{course.totalLessons} lessons completed
                          </p>
                          <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${course.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-blue-500 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No enrolled courses</p>
                      <Link to="/courses" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                        Browse courses →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Grades</h3>
                <div className="space-y-4">
                  {recentGrades.length > 0 ? (
                    recentGrades.map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {grade.assignments?.title || `Assignment #${grade.assignment_id}`}
                          </p>
                          <p className="text-sm text-slate-600">
                            {grade.points_earned}/{grade.assignments?.points_possible || 0} points
                          </p>
                        </div>
                        <Award className="h-5 w-5 text-purple-500 flex-shrink-0 ml-2" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No grades yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">All Assignments</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => {
                    const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
                    return (
                      <div 
                        key={assignment.id} 
                        onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
                      >
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                          <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{assignment.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                            <span>Points: {assignment.points_possible}</span>
                            {assignment.due_date && (
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                                <Clock className="h-4 w-4" />
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/assignments/${assignment.id}`);
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">No assignments found</p>
                    <p className="text-sm text-slate-400">Assignments will appear here when your teachers create them</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Recent Grades</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {grades.length > 0 ? (
                  grades.map((grade) => {
                    const percentage = grade.assignments?.points_possible 
                      ? Math.round((grade.points_earned / grade.assignments.points_possible) * 100) 
                      : 0;
                    const gradeColor = percentage >= 90 ? 'text-green-600' : percentage >= 70 ? 'text-blue-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
                    
                    return (
                      <div 
                        key={grade.id} 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                          <h4 className="font-medium text-slate-900">
                            {grade.assignments?.title || `Assignment #${grade.assignment_id}`}
                          </h4>
                          <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            Graded on {new Date(grade.graded_at).toLocaleDateString()}
                          </p>
                          {grade.feedback && (
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2 italic">
                              "{grade.feedback}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right">
                          <div className={`text-2xl sm:text-3xl font-bold ${gradeColor}`}>
                            {percentage}%
                          </div>
                          <div className="text-sm text-slate-500">
                            {grade.points_earned}/{grade.assignments?.points_possible || 0} points
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">No grades yet</p>
                    <p className="text-sm text-slate-400">Your graded assignments will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      </div>
    </DashboardLayout>
  );
}
