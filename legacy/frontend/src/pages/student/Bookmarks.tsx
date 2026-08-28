import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import { Bookmark, BookmarkPlus, Trash2, PlayCircle, BookOpen, FileText } from 'lucide-react';

interface BookmarkItem {
  id: string;
  lesson_id?: string;
  course_id?: string;
  resource_id?: string;
  notes?: string;
  created_at: string;
  lessons?: {
    title: string;
    course_id: string;
  };
  courses?: {
    title: string;
    description: string;
  };
  course_resources?: {
    title: string;
    description: string;
    file_name: string;
  };
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'lessons' | 'courses' | 'resources'>('all');

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookmarkData } = await supabase
        .from('bookmarks')
        .select(`
          id,
          lesson_id,
          course_id,
          resource_id,
          notes,
          created_at,
          lessons (
            title,
            course_id
          ),
          courses (
            title,
            description
          ),
          course_resources (
            title,
            description,
            file_name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Transform the data to match the interface
      const transformedBookmarks = (bookmarkData || []).map(item => ({
        id: item.id,
        lesson_id: item.lesson_id,
        course_id: item.course_id,
        resource_id: item.resource_id,
        notes: item.notes,
        created_at: item.created_at,
        lessons: Array.isArray(item.lessons) ? item.lessons[0] : item.lessons,
        courses: Array.isArray(item.courses) ? item.courses[0] : item.courses,
        course_resources: Array.isArray(item.course_resources) ? item.course_resources[0] : item.course_resources
      }));

      setBookmarks(transformedBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeBookmark(bookmarkId: string) {
    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  }

  function filteredBookmarks() {
    if (activeFilter === 'all') return bookmarks;
    
    switch (activeFilter) {
      case 'lessons':
        return bookmarks.filter(b => b.lesson_id);
      case 'courses':
        return bookmarks.filter(b => b.course_id && !b.lesson_id);
      case 'resources':
        return bookmarks.filter(b => b.resource_id);
      default:
        return bookmarks;
    }
  }

  function getBookmarkType(bookmark: BookmarkItem) {
    if (bookmark.lesson_id) return 'lesson';
    if (bookmark.resource_id) return 'resource';
    if (bookmark.course_id) return 'course';
    return 'unknown';
  }

  function getBookmarkTitle(bookmark: BookmarkItem) {
    const type = getBookmarkType(bookmark);
    switch (type) {
      case 'lesson':
        return bookmark.lessons?.title || 'Lesson';
      case 'course':
        return bookmark.courses?.title || 'Course';
      case 'resource':
        return bookmark.course_resources?.title || 'Resource';
      default:
        return 'Bookmark';
    }
  }

  function getBookmarkDescription(bookmark: BookmarkItem) {
    const type = getBookmarkType(bookmark);
    switch (type) {
      case 'course':
        return bookmark.courses?.description || '';
      case 'resource':
        return bookmark.course_resources?.description || '';
      default:
        return '';
    }
  }

  function getBookmarkIcon(bookmark: BookmarkItem) {
    const type = getBookmarkType(bookmark);
    switch (type) {
      case 'lesson':
        return PlayCircle;
      case 'course':
        return BookOpen;
      case 'resource':
        return FileText;
      default:
        return Bookmark;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8 px-6">
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">My Bookmarks</h1>
            <p className="text-slate-600">Save and organize your favorite lessons, courses, and resources</p>
          </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Bookmarks</p>
              <p className="text-3xl font-bold text-blue-600">
                {bookmarks.length}
              </p>
            </div>
            <Bookmark className="h-10 w-10 text-blue-600 opacity-70" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Lesson Bookmarks</p>
              <p className="text-3xl font-bold text-green-600">
                {bookmarks.filter(b => b.lesson_id).length}
              </p>
            </div>
            <PlayCircle className="h-10 w-10 text-green-600 opacity-70" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Course Bookmarks</p>
              <p className="text-3xl font-bold text-purple-600">
                {bookmarks.filter(b => b.course_id && !b.lesson_id).length}
              </p>
            </div>
            <BookOpen className="h-10 w-10 text-purple-600 opacity-70" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Resource Bookmarks</p>
              <p className="text-3xl font-bold text-orange-600">
                {bookmarks.filter(b => b.resource_id).length}
              </p>
            </div>
            <FileText className="h-10 w-10 text-orange-600 opacity-70" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap min-h-[44px] ${
                activeFilter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All ({bookmarks.length})
            </button>
            <button
              onClick={() => setActiveFilter('lessons')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap min-h-[44px] ${
                activeFilter === 'lessons'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Lessons ({bookmarks.filter(b => b.lesson_id).length})
            </button>
            <button
              onClick={() => setActiveFilter('courses')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap min-h-[44px] ${
                activeFilter === 'courses'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Courses ({bookmarks.filter(b => b.course_id && !b.lesson_id).length})
            </button>
            <button
              onClick={() => setActiveFilter('resources')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap min-h-[44px] ${
                activeFilter === 'resources'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Resources ({bookmarks.filter(b => b.resource_id).length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {filteredBookmarks().length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {activeFilter === 'all' ? 'No Bookmarks Yet' : `No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Bookmarks`}
              </h3>
              <p className="text-slate-600 mb-4">
                {activeFilter === 'all' 
                  ? 'Start bookmarking your favorite lessons, courses, and resources!' 
                  : `You haven't bookmarked any ${activeFilter} yet.`
                }
              </p>
              <p className="text-sm text-slate-500">
                Look for the bookmark icon while browsing courses and lessons.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookmarks().map((bookmark) => {
                const IconComponent = getBookmarkIcon(bookmark);
                const title = getBookmarkTitle(bookmark);
                const description = getBookmarkDescription(bookmark);
                const type = getBookmarkType(bookmark);

                return (
                  <div
                    key={bookmark.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 mt-1">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-slate-800">{title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              type === 'lesson' ? 'bg-green-100 text-green-700' :
                              type === 'course' ? 'bg-purple-100 text-purple-700' :
                              type === 'resource' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {type}
                            </span>
                          </div>
                          {description && (
                            <p className="text-sm text-slate-600 mb-2">{description}</p>
                          )}
                          {bookmark.notes && (
                            <p className="text-sm text-slate-500 italic">
                              Note: {bookmark.notes}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            Bookmarked {new Date(bookmark.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => removeBookmark(bookmark.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    </DashboardLayout>
  );
}
