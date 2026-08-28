import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  courses: {
    title: string;
  };
}

export default function Announcements() {
  const [courses, setCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadAnnouncements(selectedCourse);
    }
  }, [selectedCourse]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      setCourses(courses || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnnouncements(courseId: string) {
    try {
      const { data: announcements } = await supabase
        .from('announcements')
        .select(`
          *,
          courses(title)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      setAnnouncements(announcements || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('announcements')
        .insert({
          course_id: selectedCourse,
          teacher_id: user.id,
          title: formData.title,
          content: formData.content,
          priority: formData.priority
        });

      if (error) throw error;

      // Reset form
      setFormData({
        title: '',
        content: '',
        priority: 'normal'
      });
      setShowForm(false);

      // Reload announcements
      await loadAnnouncements(selectedCourse);
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  }

  async function deleteAnnouncement(announcementId: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      // Reload announcements
      if (selectedCourse) {
        await loadAnnouncements(selectedCourse);
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  }

  function getPriorityIcon(priority: string) {
    switch (priority) {
      case 'low':
        return Info;
      case 'normal':
        return Bell;
      case 'high':
        return AlertCircle;
      case 'urgent':
        return AlertTriangle;
      default:
        return Bell;
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'normal':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'high':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  }

  function formatPriority(priority: string) {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Course Announcements</h1>
          <p className="text-slate-600">Send important updates and announcements to your students</p>
        </div>
        {selectedCourse && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <Bell className="h-5 w-5" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* Course Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Select Course</h2>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a course to manage announcements</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Announcement Form */}
      {showForm && selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Announcement title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Announcement content"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create Announcement
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    title: '',
                    content: '',
                    priority: 'normal'
                  });
                }}
                className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Announcements for: {courses.find(c => c.id === selectedCourse)?.title}
            </h2>

            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No announcements created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const IconComponent = getPriorityIcon(announcement.priority);
                  return (
                    <div
                      key={announcement.id}
                      className={`border rounded-lg p-4 ${getPriorityColor(announcement.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-slate-800">{announcement.title}</h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                                {formatPriority(announcement.priority)}
                              </span>
                            </div>
                            <p className="text-slate-700 mb-2">{announcement.content}</p>
                            <p className="text-xs text-slate-600">
                              Created {new Date(announcement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="text-slate-500 hover:text-red-600 transition"
                          title="Delete announcement"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedCourse && (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Select a course to manage announcements</p>
        </div>
      )}
    </div>
  );
}
