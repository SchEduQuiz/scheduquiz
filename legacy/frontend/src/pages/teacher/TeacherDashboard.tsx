import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, Assignment } from '../../lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import QuestionManager from '../../components/QuestionManager';
import { AssignmentCreationForm } from '../../components/assignments/AssignmentCreationForm';
import { AIGradingModalWrapper } from './AIGradingModalWrapper';
import { 
  type EnhancedAssignment
} from '../../hooks/useAIGrading';
import { 
  BookOpen, Users, PlusCircle, Edit, Trash2, Eye, EyeOff,
  FileText, Award, Bell, ArrowRight, Settings, TrendingUp, FolderOpen, Megaphone,
  PlayCircle, PauseCircle, BookMarked, X, ExternalLink, Clock, CheckCircle2, Sparkles
} from 'lucide-react';

export default function TeacherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: '' });
  const [assignmentFormData, setAssignmentFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    points_possible: 100,
    submission_type: 'text'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonFormData, setLessonFormData] = useState({ 
    title: '', 
    content: '', 
    order: 0, 
    has_quiz: false,
    quiz_pass_score: 70,
    quiz_time_limit: 300
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionManager, setShowQuestionManager] = useState(false);
  const [questionManagerLesson, setQuestionManagerLesson] = useState<any>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [gradingData, setGradingData] = useState({ points: 0, feedback: '' });
  const [showEnhancedAssignmentForm, setShowEnhancedAssignmentForm] = useState(false);
  const [enhancedAssignmentCourseId, setEnhancedAssignmentCourseId] = useState<string | null>(null);
  const [editingEnhancedAssignment, setEditingEnhancedAssignment] = useState<EnhancedAssignment | null>(null);

  // Get active tab from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';


  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await loadCourses(user.id);
      await loadAssignments(user.id);
      await loadPendingSubmissions(user.id);
      await loadAnalytics();
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses(userId: string) {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false });

    if (courses) {
      const coursesWithStats = await Promise.all(
        courses.map(async (course) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', course.id);

          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('course_id', course.id);

          const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .eq('course_id', course.id);

          return {
            ...course,
            lessonsCount: lessons?.length || 0,
            studentsCount: enrollments?.length || 0,
            assignmentsCount: assignments?.length || 0
          };
        })
      );
      setCourses(coursesWithStats);
    }
  }

  async function loadAssignments(userId: string) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('teacher_id', userId);

    if (courses && courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', courseIds)
        .order('due_date', { ascending: true });

      setAssignments(assignments || []);
    }
  }

  async function loadPendingSubmissions(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', userId);

      if (coursesError) {
        console.error('Error loading courses:', coursesError);
        return;
      }

      if (courses && courses.length > 0) {
        const courseIds = courses.map(c => c.id);
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('id, title, course_id, due_date, points_possible')
          .in('course_id', courseIds);

        if (assignmentsError) {
          console.error('Error loading assignments:', assignmentsError);
          return;
        }

        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id);
          
          // Fetch all submissions first
          const { data: allSubmissions, error: submissionsError } = await supabase
            .from('submissions')
            .select('id, assignment_id, student_id, submission_text, file_url, file_name, status, submitted_at, created_at, updated_at')
            .in('assignment_id', assignmentIds)
            .in('status', ['submitted', 'draft']);

          if (submissionsError) {
            console.error('Error loading submissions:', submissionsError);
            // Try alternative query structure - get submissions without grades
            const { data: altSubmissions } = await supabase
              .from('submissions')
              .select('*')
              .in('assignment_id', assignmentIds)
              .in('status', ['submitted', 'draft']);

            // Get grades to filter out already graded submissions
            if (altSubmissions && altSubmissions.length > 0) {
              const submissionIds = altSubmissions.map((s: any) => s.id);
              const { data: existingGrades } = await supabase
                .from('grades')
                .select('submission_id')
                .in('submission_id', submissionIds);

              const gradedSubmissionIds = new Set(existingGrades?.map((g: any) => g.submission_id) || []);
              const ungradedSubs = altSubmissions.filter((s: any) => !gradedSubmissionIds.has(s.id));

              if (ungradedSubs && ungradedSubs.length > 0) {
                // Manually fetch student and assignment data
                const studentIds = [...new Set(ungradedSubs.map((s: any) => s.student_id))];
                const { data: students } = await supabase
                  .from('profiles')
                  .select('id, full_name, email')
                  .in('id', studentIds);

                const enrichedSubmissions = ungradedSubs.map((submission: any) => {
                  const student = students?.find((s: any) => s.id === submission.student_id);
                  const assignment = assignments.find((a: any) => a.id === submission.assignment_id);
                  return {
                    ...submission,
                    profiles: student ? { full_name: student.full_name, email: student.email } : null,
                    assignments: assignment ? { title: assignment.title, due_date: assignment.due_date, points_possible: assignment.points_possible } : null,
                    grades: []
                  };
                });

                // Filter to only show submissions that need grading
                const ungradedSubmissions = enrichedSubmissions.filter((submission: any) => 
                  submission.status === 'submitted' || 
                  (submission.status === 'draft' && 
                   submission.assignments?.due_date && 
                   new Date(submission.assignments.due_date) > new Date())
                );

                setPendingSubmissions(ungradedSubmissions);
              } else {
                setPendingSubmissions([]);
              }
            } else {
              setPendingSubmissions([]);
            }
            return;
          }

          if (!allSubmissions || allSubmissions.length === 0) {
            setPendingSubmissions([]);
            return;
          }

          // Get grades to filter out already graded submissions
          const submissionIds = allSubmissions.map(s => s.id);
          const { data: existingGrades } = await supabase
            .from('grades')
            .select('submission_id')
            .in('submission_id', submissionIds);

          const gradedSubmissionIds = new Set(existingGrades?.map(g => g.submission_id) || []);
          const ungradedSubmissions = allSubmissions.filter(s => !gradedSubmissionIds.has(s.id));

          if (ungradedSubmissions.length === 0) {
            setPendingSubmissions([]);
            return;
          }

          // Fetch student and assignment data for ungraded submissions
          const studentIds = [...new Set(ungradedSubmissions.map(s => s.student_id))];
          const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);

          // Process submissions with nested data structure
          const processedSubmissions = ungradedSubmissions.map(submission => {
            const student = students?.find(s => s.id === submission.student_id);
            const assignment = assignments.find(a => a.id === submission.assignment_id);
            
            return {
              ...submission,
              profiles: student ? { full_name: student.full_name, email: student.email } : null,
              assignments: assignment ? { 
                title: assignment.title, 
                due_date: assignment.due_date,
                points_possible: assignment.points_possible 
              } : null,
              grades: []
            };
          });

          // Filter to only show submissions that need grading
          const finalUngradedSubmissions = processedSubmissions.filter(submission => 
            submission.status === 'submitted' || 
            (submission.status === 'draft' && 
             submission.assignments?.due_date && 
             new Date(submission.assignments.due_date) > new Date())
          );

          setPendingSubmissions(finalUngradedSubmissions);
        }
      }
    } catch (error) {
      console.error('Error loading pending submissions:', error);
    }
  }

  async function loadAnalytics() {
    try {
      // Calculate analytics from existing data
      const totalStudents = courses.reduce((sum, course) => sum + course.studentsCount, 0);
      
      // Count published courses
      const publishedCourses = courses.filter(c => c.is_published).length;
      
      // Count pending grades from submissions (including overdue)
      const pendingGrades = pendingSubmissions.length;

      setAnalytics({
        totalCourses: courses.length,
        totalStudents,
        pendingGrades,
        publishedCourses
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set default values on error
      setAnalytics({
        totalCourses: 0,
        totalStudents: 0,
        pendingGrades: 0,
        publishedCourses: 0
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create courses');
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('courses')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingId);

        if (error) {
          console.error('Error updating course:', error);
          alert(`Error updating course: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{ ...formData, teacher_id: user.id }]);

        if (error) {
          console.error('Error creating course:', error);
          alert(`Error creating course: ${error.message}`);
          return;
        }
      }

      setFormData({ title: '', description: '', category: '' });
      setEditingId(null);
      setShowForm(false);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert(`Error saving course: ${error.message || 'Unknown error'}`);
    }
  }

  async function handleAssignmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create assignments');
        return;
      }

      if (editingAssignmentId) {
        const { error } = await supabase
          .from('assignments')
          .update({
            course_id: assignmentFormData.course_id,
            title: assignmentFormData.title,
            description: assignmentFormData.description,
            due_date: assignmentFormData.due_date || null,
            points_possible: assignmentFormData.points_possible,
            submission_type: assignmentFormData.submission_type,
            allow_late_submission: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAssignmentId);

        if (error) {
          console.error('Error updating assignment:', error);
          alert(`Error updating assignment: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert([{
            course_id: assignmentFormData.course_id,
            teacher_id: user.id,
            title: assignmentFormData.title,
            description: assignmentFormData.description,
            due_date: assignmentFormData.due_date || null,
            points_possible: assignmentFormData.points_possible,
            submission_type: assignmentFormData.submission_type,
            allow_late_submission: true,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          console.error('Error creating assignment:', error);
          alert(`Error creating assignment: ${error.message}`);
          return;
        }
      }

      setAssignmentFormData({
        course_id: '',
        title: '',
        description: '',
        due_date: '',
        points_possible: 100,
        submission_type: 'text'
      });
      setEditingAssignmentId(null);
      setShowAssignmentForm(false);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      alert(`Error saving assignment: ${error.message || 'Unknown error'}`);
    }
  }

  async function gradeSubmission(submissionId: string, points: number, feedback: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to grade submissions');
        return;
      }

      // First get the submission to find assignment_id and student_id
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .select('assignment_id, student_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        console.error('Error fetching submission:', submissionError);
        alert(`Error fetching submission: ${submissionError?.message || 'Submission not found'}`);
        return;
      }

      // Convert points to number (handle NUMERIC type)
      const pointsEarned = parseFloat(points.toString());

      // Create or update grade with teacher_id
      const { error: gradeError } = await supabase
        .from('grades')
        .upsert({
          submission_id: submissionId,
          assignment_id: submission.assignment_id,
          student_id: submission.student_id,
          teacher_id: user.id,
          points_earned: pointsEarned,
          feedback: feedback || null,
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'submission_id'
        });

      if (gradeError) {
        console.error('Error saving grade:', gradeError);
        alert(`Error saving grade: ${gradeError.message}`);
        return;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ 
          status: 'graded',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating submission status:', updateError);
        alert(`Error updating submission status: ${updateError.message}`);
        return;
      }

      await loadDashboardData();
    } catch (error: any) {
      console.error('Error grading submission:', error);
      alert(`Error grading submission: ${error.message || 'Unknown error'}`);
    }
  }

  async function togglePublish(courseId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ 
          is_published: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) {
        console.error('Error updating course publish status:', error);
        alert(`Error updating course: ${error.message}`);
        return;
      }

      await loadDashboardData();
    } catch (error: any) {
      console.error('Error toggling publish status:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Error deleting course:', error);
        alert(`Error deleting course: ${error.message}`);
        return;
      }

      await loadDashboardData();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    }
  }

  function startEdit(course: any) {
    setFormData({ title: course.title, description: course.description || '', category: course.category || '' });
    setEditingId(course.id);
    setShowForm(true);
  }

  function startEditAssignment(assignment: any) {
    setAssignmentFormData({
      course_id: assignment.course_id,
      title: assignment.title,
      description: assignment.description || '',
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
      points_possible: assignment.points_possible,
      submission_type: assignment.submission_type
    });
    setEditingAssignmentId(assignment.id);
    setShowAssignmentForm(true);
  }

  async function deleteAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error deleting assignment:', error);
        alert(`Error deleting assignment: ${error.message}`);
        return;
      }

      await loadDashboardData();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    }
  }

  async function loadLessons(courseId: string) {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setLessons(data || []);
  }

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseId) {
      alert('Please select a course first');
      return;
    }

    try {
      if (editingLessonId) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonFormData.title,
            content: lessonFormData.content,
            order_index: lessonFormData.order,
            has_quiz: lessonFormData.has_quiz,
            quiz_pass_score: lessonFormData.has_quiz ? lessonFormData.quiz_pass_score : null,
            quiz_time_limit: lessonFormData.has_quiz ? lessonFormData.quiz_time_limit : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLessonId);

        if (error) {
          console.error('Error updating lesson:', error);
          alert(`Error updating lesson: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert([{
            course_id: selectedCourseId,
            title: lessonFormData.title,
            content: lessonFormData.content,
            order_index: lessonFormData.order,
            has_quiz: lessonFormData.has_quiz,
            quiz_pass_score: lessonFormData.has_quiz ? lessonFormData.quiz_pass_score : null,
            quiz_time_limit: lessonFormData.has_quiz ? lessonFormData.quiz_time_limit : null,
            is_published: false,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          console.error('Error creating lesson:', error);
          alert(`Error creating lesson: ${error.message}`);
          return;
        }
      }

      setLessonFormData({ 
        title: '', 
        content: '', 
        order: 0, 
        has_quiz: false,
        quiz_pass_score: 70,
        quiz_time_limit: 300
      });
      setEditingLessonId(null);
      await loadLessons(selectedCourseId);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      alert(`Error saving lesson: ${error.message || 'Unknown error'}`);
    }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) {
        console.error('Error deleting lesson:', error);
        alert(`Error deleting lesson: ${error.message}`);
        return;
      }

      if (selectedCourseId) {
        await loadLessons(selectedCourseId);
        await loadDashboardData();
      }
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    }
  }

  function startEditLesson(lesson: any) {
    setLessonFormData({
      title: lesson.title,
      content: lesson.content || '',
      order: lesson.order_index,
      has_quiz: lesson.has_quiz || false,
      quiz_pass_score: lesson.quiz_pass_score || 70,
      quiz_time_limit: lesson.quiz_time_limit || 300
    });
    setEditingLessonId(lesson.id);
  }

  function openLessonModal(courseId: string) {
    setSelectedCourseId(courseId);
    setShowLessonModal(true);
    loadLessons(courseId);
  }

  async function openGradingModal(submission: any) {
    setSelectedSubmission(submission);
    setSelectedSubmissionId(submission.id);
    setSelectedAssignmentId(submission.assignment_id);
    
    // Fetch existing grade if any
    try {
      const { data: existingGrade } = await supabase
        .from('grades')
        .select('points_earned, feedback')
        .eq('submission_id', submission.id)
        .maybeSingle();

      setGradingData({
        points: existingGrade?.points_earned || 0,
        feedback: existingGrade?.feedback || ''
      });
    } catch (error) {
      console.error('Error loading existing grade:', error);
      setGradingData({
        points: 0,
        feedback: ''
      });
    }
    
    setShowGradingModal(true);
  }

  async function submitGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubmission) {
      alert('No submission selected');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to grade submissions');
        return;
      }

      // Validate points
      const maxPoints = selectedSubmission.assignments?.points_possible || 100;
      if (gradingData.points < 0 || gradingData.points > maxPoints) {
        alert(`Points must be between 0 and ${maxPoints}`);
        return;
      }

      await gradeSubmission(
        selectedSubmission.id,
        gradingData.points,
        gradingData.feedback
      );

      setShowGradingModal(false);
      setSelectedSubmission(null);
      setGradingData({ points: 0, feedback: '' });
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error submitting grade:', error);
      alert(`Error submitting grade: ${error.message || 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingAssignments = assignments.filter(a => 
    a.due_date && new Date(a.due_date) > new Date()
  ).slice(0, 5);

  const handleTabChange = (tab: string) => {
    const url = tab === 'overview' ? '/teacher/dashboard' : `/teacher/dashboard?tab=${tab}`;
    navigate(url);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'courses', name: 'My Courses', icon: BookOpen },
    { id: 'assignments', name: 'Assignments', icon: FileText },
    { id: 'submissions', name: 'Pending Grading', icon: Award },
    { id: 'resources', name: 'Resources', icon: FolderOpen },
    { id: 'announcements', name: 'Announcements', icon: Megaphone }
  ];

  return (
    <DashboardLayout>
      <div className="py-8 px-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">Teaching Dashboard</h1>
              <p className="text-slate-600">Manage courses, assignments, and student progress</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Show enhanced assignment form
                  if (courses.length === 1) {
                    setEnhancedAssignmentCourseId(courses[0].id);
                    setShowEnhancedAssignmentForm(true);
                    setEditingEnhancedAssignment(null);
                  } else if (courses.length > 1) {
                    // Show course selection
                    setEnhancedAssignmentCourseId(null);
                    setShowEnhancedAssignmentForm(true);
                    setEditingEnhancedAssignment(null);
                  } else {
                    alert('Please create a course first before creating assignments');
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 min-h-[44px] rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center space-x-2 shadow-lg"
              >
                <Sparkles className="h-5 w-5" />
                <span>New AI Assignment</span>
              </button>
              <button
                onClick={() => {
                  setShowAssignmentForm(!showAssignmentForm);
                  setEditingAssignmentId(null);
                  setAssignmentFormData({
                    course_id: '',
                    title: '',
                    description: '',
                    due_date: '',
                    points_possible: 100,
                    submission_type: 'text'
                  });
                }}
                className="bg-slate-600 text-white px-6 py-3 min-h-[44px] rounded-lg hover:bg-slate-700 transition flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Basic Assignment</span>
              </button>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingId(null);
                  setFormData({ title: '', description: '', category: '' });
                }}
                className="bg-blue-600 text-white px-6 py-3 min-h-[44px] rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2"
              >
                <PlusCircle className="h-5 w-5" />
                <span>New Course</span>
              </button>
            </div>
          </div>
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
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 flex-shrink-0 ${
                      activeTab === tab.id ? 'text-purple-500' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="hidden sm:inline">{tab.name}</span>
                    <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                    {tab.id === 'submissions' && pendingSubmissions.length > 0 && (
                      <span className="ml-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingSubmissions.length}
                      </span>
                    )}
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
                <p className="text-sm text-slate-600 mb-1">Total Courses</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics?.totalCourses || courses.length}
                </p>
              </div>
              <BookOpen className="h-10 w-10 text-blue-600 opacity-70" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-green-600">
                  {analytics?.totalStudents || courses.reduce((sum, c) => sum + c.studentsCount, 0)}
                </p>
              </div>
              <Users className="h-10 w-10 text-green-600 opacity-70" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Assignments</p>
                <p className="text-3xl font-bold text-purple-600">
                  {assignments.length}
                </p>
              </div>
              <FileText className="h-10 w-10 text-purple-600 opacity-70" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">To Grade</p>
                <p className="text-3xl font-bold text-orange-600">
                  {analytics?.pendingGrades || pendingSubmissions.length}
                </p>
              </div>
              <Award className="h-10 w-10 text-orange-600 opacity-70" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Published</p>
                <p className="text-3xl font-bold text-teal-600">
                  {analytics?.publishedCourses || courses.filter(c => c.is_published).length}
                </p>
              </div>
              <Eye className="h-10 w-10 text-teal-600 opacity-70" />
            </div>
          </div>
        </div>

        {/* Pending Grading Alert */}
        {pendingSubmissions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <Award className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    You have {pendingSubmissions.length} submission{pendingSubmissions.length > 1 ? 's' : ''} waiting to be graded
                  </h3>
                  <p className="text-sm text-orange-700">
                    Access the drawer navigation to review and grade all submissions, including overdue assignments.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        )}

        {/* Assignment Form */}
        {showAssignmentForm && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              {editingAssignmentId ? 'Edit Assignment' : 'Create New Assignment'}
            </h2>
            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Course</label>
                <select
                  value={assignmentFormData.course_id}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, course_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assignment Title</label>
                <input
                  type="text"
                  value={assignmentFormData.title}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={assignmentFormData.description}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                  <input
                    type="datetime-local"
                    value={assignmentFormData.due_date}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Points Possible</label>
                  <input
                    type="number"
                    value={assignmentFormData.points_possible}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, points_possible: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="submit" className="bg-green-600 text-white px-6 py-3 min-h-[44px] rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {editingAssignmentId ? 'Update' : 'Create'} Assignment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentForm(false);
                    setEditingAssignmentId(null);
                    setAssignmentFormData({
                      course_id: '',
                      title: '',
                      description: '',
                      due_date: '',
                      points_possible: 100,
                      submission_type: 'text'
                    });
                  }}
                  className="bg-slate-300 text-slate-700 px-6 py-3 min-h-[44px] rounded-lg hover:bg-slate-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Course Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              {editingId ? 'Edit Course' : 'Create New Course'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Course Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 min-h-[44px] rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {editingId ? 'Update' : 'Create'} Course
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ title: '', description: '', category: '' });
                  }}
                  className="bg-slate-300 text-slate-700 px-6 py-3 min-h-[44px] rounded-lg hover:bg-slate-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quick Overview Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
              <p className="text-sm text-slate-600">Access all features through the navigation drawer</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Courses */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Your Courses ({courses.length})</h3>
                <div className="space-y-3">
                  {courses.slice(0, 3).map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 text-sm">{course.title}</h4>
                        <p className="text-xs text-slate-600">{course.studentsCount} students • {course.lessonsCount} lessons</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${course.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="text-center py-6 text-slate-600">
                      <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No courses created yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Submissions */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Pending Actions ({pendingSubmissions.length})</h3>
                <div className="space-y-3">
                  {pendingSubmissions.slice(0, 3).map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 text-sm">
                          {(submission as any).profiles?.full_name || 'Student'}
                        </h4>
                        <p className="text-xs text-slate-600">
                          Submission pending review
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-orange-600" />
                    </div>
                  ))}
                  {pendingSubmissions.length === 0 && (
                    <div className="text-center py-6 text-slate-600">
                      <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No pending submissions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Instructions */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Access All Features</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Use the navigation drawer to access courses, lessons, assignments, grading, resources, and announcements.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <span className="text-blue-700">• Courses Management</span>
                    <span className="text-blue-700">• Lesson Creation</span>
                    <span className="text-blue-700">• Assignment Setup</span>
                    <span className="text-blue-700">• Grade Submissions</span>
                    <span className="text-blue-700">• Resource Library</span>
                    <span className="text-blue-700">• Announcements</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'courses' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Your Courses</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all">
                      <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="font-medium text-slate-900 hover:text-purple-600 cursor-pointer transition-colors flex-1"
                          >
                            {course.title}
                          </h4>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                            course.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {course.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        {course.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{course.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {course.studentsCount} students
                          </span>
                          <span className="flex items-center gap-1">
                            <BookMarked className="h-4 w-4" />
                            {course.lessonsCount} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {course.assignmentsCount} assignments
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                          title="View Course"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => openLessonModal(course.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Manage Lessons"
                        >
                          <BookMarked className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(course)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Course"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => togglePublish(course.id, course.is_published)}
                          className={`p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center ${course.is_published ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={course.is_published ? 'Unpublish Course' : 'Publish Course'}
                        >
                          {course.is_published ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Delete Course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">No courses created yet</p>
                )}
              </div>
            </div>
          </div>
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
                    const course = courses.find(c => c.id === assignment.course_id);
                    return (
                      <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all">
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                          <h4 className="font-medium text-slate-900">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{assignment.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              {assignment.points_possible} points
                            </span>
                            {course && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {course.title}
                              </span>
                            )}
                            {assignment.due_date && (
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                <Clock className="h-4 w-4" />
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </span>
                          <button
                            onClick={() => startEditAssignment(assignment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Edit Assignment"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAssignment(assignment.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Delete Assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">No assignments created yet</p>
                    <p className="text-sm text-slate-400">Create your first assignment using the button above</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Assignment Submissions & Grading</h3>
              <p className="text-sm text-slate-600 mt-1">Manage all student submissions, including overdue assignments</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pendingSubmissions.length > 0 ? (
                  pendingSubmissions.map((submission) => {
                    const isOverdue = submission.assignments?.due_date && new Date(submission.assignments.due_date) < new Date();
                    return (
                      <div key={submission.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                        isOverdue ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-slate-900">
                              {(submission as any).profiles?.full_name || 'Student'}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isOverdue ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Submitted'}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            <p>Assignment: {submission.assignments?.title || 'Unknown'}</p>
                            {submission.assignments?.due_date && (
                              <p className={isOverdue ? 'text-red-600' : 'text-slate-500'}>
                                Due: {new Date(submission.assignments.due_date).toLocaleDateString()}
                              </p>
                            )}
                            {submission.status === 'draft' && (
                              <p className="text-yellow-600">Draft submission - not yet submitted</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0">
                          <button
                            onClick={() => openGradingModal(submission)}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={submission.status === 'graded'}
                          >
                            <Award className="h-4 w-4" />
                            {submission.status === 'graded' ? 'Graded' : 'Grade'}
                          </button>
                          {submission.submission_text && (
                            <button
                              onClick={() => {
                                const textArea = document.createElement('textarea');
                                textArea.value = submission.submission_text;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                              }}
                              className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                              title="Copy submission text"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p>No submissions to grade</p>
                    <p className="text-sm">All assignments are up to date</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Course Resources</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-slate-500">
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p>Course resources management</p>
                <p className="text-sm">Coming soon</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Announcements</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-slate-500">
                <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p>Course announcements</p>
                <p className="text-sm">Coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Lesson Management Modal */}
        {showLessonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800">Manage Lessons</h2>
                  <button
                    onClick={() => {
                      setShowLessonModal(false);
                      setEditingLessonId(null);
                      setLessonFormData({ 
                        title: '', 
                        content: '', 
                        order: 0, 
                        has_quiz: false,
                        quiz_pass_score: 70,
                        quiz_time_limit: 300
                      });
                    }}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Lesson Creation Form */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    {editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}
                  </h3>
                  <form onSubmit={handleLessonSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Lesson Title</label>
                        <input
                          type="text"
                          value={lessonFormData.title}
                          onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                        <input
                          type="number"
                          value={lessonFormData.order}
                          onChange={(e) => setLessonFormData({ ...lessonFormData, order: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                      <textarea
                        value={lessonFormData.content}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, content: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        placeholder="Enter lesson content, instructions, or materials..."
                      />
                    </div>
                    
                    {/* Quiz Settings Section */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <input
                          type="checkbox"
                          id="has_quiz"
                          checked={lessonFormData.has_quiz}
                          onChange={(e) => setLessonFormData({ 
                            ...lessonFormData, 
                            has_quiz: e.target.checked 
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <label htmlFor="has_quiz" className="text-sm font-medium text-slate-700">
                          Enable Lesson Completion Quiz
                        </label>
                      </div>
                      
                      {lessonFormData.has_quiz && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Passing Score (%)
                              </label>
                              <input
                                type="number"
                                value={lessonFormData.quiz_pass_score}
                                onChange={(e) => setLessonFormData({ 
                                  ...lessonFormData, 
                                  quiz_pass_score: parseInt(e.target.value) 
                                })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                                required
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                Minimum percentage required to pass
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Time Limit (minutes)
                              </label>
                              <input
                                type="number"
                                value={Math.floor(lessonFormData.quiz_time_limit / 60)}
                                onChange={(e) => setLessonFormData({ 
                                  ...lessonFormData, 
                                  quiz_time_limit: parseInt(e.target.value) * 60 
                                })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="1"
                                max="60"
                                required
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                Time limit for quiz completion
                              </p>
                            </div>
                          </div>
                          
                          {editingLessonId && (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const lesson = lessons.find(l => l.id === editingLessonId);
                                  if (lesson) {
                                    setQuestionManagerLesson(lesson);
                                    setShowQuestionManager(true);
                                  }
                                }}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg flex items-center justify-center gap-2"
                              >
                                <FileText className="h-5 w-5" />
                                Manage Quiz Questions
                              </button>
                              <p className="text-xs text-slate-500 mt-2 text-center">
                                Add AI-generated or manual questions for this lesson quiz
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        {editingLessonId ? 'Update' : 'Add'} Lesson
                      </button>
                      {editingLessonId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonFormData({ 
                        title: '', 
                        content: '', 
                        order: 0, 
                        has_quiz: false,
                        quiz_pass_score: 70,
                        quiz_time_limit: 300
                      });
                          }}
                          className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Lessons List */}
                <div>
                  <h3 className="font-semibold text-slate-800 mb-4">Course Lessons ({lessons.length})</h3>
                  {lessons.length > 0 ? (
                    <div className="space-y-3">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                {lesson.order_index}
                              </span>
                              <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                            </div>
                            {lesson.content && (
                              <p className="text-sm text-slate-600 mt-2 truncate">{lesson.content}</p>
                            )}
                            {lesson.has_quiz && (
                              <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full ml-2">
                                Quiz Enabled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {lesson.has_quiz && (
                              <button
                                onClick={() => {
                                  setQuestionManagerLesson(lesson);
                                  setShowQuestionManager(true);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                title="Manage Questions"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => startEditLesson(lesson)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Lesson"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Lesson"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <BookMarked className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p>No lessons created yet</p>
                      <p className="text-sm">Add your first lesson above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Question Manager Modal */}
      {showQuestionManager && questionManagerLesson && (
        <QuestionManager
          lessonId={questionManagerLesson.id}
          lessonTitle={questionManagerLesson.title}
          lessonContent={questionManagerLesson.content || ''}
          onClose={() => {
            setShowQuestionManager(false);
            setQuestionManagerLesson(null);
          }}
        />
      )}

      {/* Enhanced Assignment Form */}
      {showEnhancedAssignmentForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {editingEnhancedAssignment ? 'Edit Assignment' : 'Create AI-Enhanced Assignment'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Create assignments with AI grading, lesson linking, and pre-submit feedback
              </p>
            </div>
            <button
              onClick={() => {
                setShowEnhancedAssignmentForm(false);
                setEnhancedAssignmentCourseId(null);
                setEditingEnhancedAssignment(null);
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {enhancedAssignmentCourseId ? (
            <AssignmentCreationForm
              courseId={enhancedAssignmentCourseId}
              initialData={editingEnhancedAssignment || undefined}
              onSuccess={(assignment) => {
                setShowEnhancedAssignmentForm(false);
                setEnhancedAssignmentCourseId(null);
                setEditingEnhancedAssignment(null);
                loadDashboardData();
              }}
              onCancel={() => {
                setShowEnhancedAssignmentForm(false);
                setEnhancedAssignmentCourseId(null);
                setEditingEnhancedAssignment(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Course</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setEnhancedAssignmentCourseId(e.target.value);
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Grading Modal - AI-Enhanced or Manual */}
      {showGradingModal && selectedSubmissionId && selectedAssignmentId && (
        <AIGradingModalWrapper
          submissionId={selectedSubmissionId}
          assignmentId={selectedAssignmentId}
          submission={selectedSubmission}
          onClose={() => {
            setShowGradingModal(false);
            setSelectedSubmission(null);
            setSelectedSubmissionId(null);
            setSelectedAssignmentId(null);
            setGradingData({ points: 0, feedback: '' });
          }}
          onGradeComplete={async () => {
            await loadDashboardData();
            setShowGradingModal(false);
            setSelectedSubmission(null);
            setSelectedSubmissionId(null);
            setSelectedAssignmentId(null);
            setGradingData({ points: 0, feedback: '' });
          }}
        />
      )}
    </DashboardLayout>
  );
}