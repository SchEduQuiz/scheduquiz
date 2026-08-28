import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import { Download, Eye, ExternalLink, FileText, Video, Music, Image, FolderOpen } from 'lucide-react';

interface CourseResource {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  resource_type: string;
  file_url?: string;
  created_at: string;
  courses: {
    id: string;
    title: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function StudentResources() {
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get enrolled courses first
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        
        const { data: resourcesData } = await supabase
          .from('course_resources')
          .select(`
            *,
            courses:course_id(id, title),
            profiles:uploaded_by(full_name)
          `)
          .in('course_id', courseIds)
          .order('created_at', { ascending: false });

        setResources(resourcesData || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getResourceIcon(resourceType: string) {
    switch (resourceType) {
      case 'video':
        return <Video className="h-5 w-5 text-blue-600" />;
      case 'audio':
        return <Music className="h-5 w-5 text-green-600" />;
      case 'image':
        return <Image className="h-5 w-5 text-purple-600" />;
      case 'document':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'link':
        return <ExternalLink className="h-5 w-5 text-indigo-600" />;
      default:
        return <FolderOpen className="h-5 w-5 text-slate-600" />;
    }
  }

  const filteredResources = selectedResourceType === 'all' 
    ? resources 
    : resources.filter(resource => resource.resource_type === selectedResourceType);

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
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Course Resources</h1>
            <p className="text-slate-600">Download and view materials shared by your teachers</p>
          </div>

      {/* Filter by Resource Type */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedResourceType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Resources
          </button>
          <button
            onClick={() => setSelectedResourceType('document')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'document'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setSelectedResourceType('video')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setSelectedResourceType('audio')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'audio'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => setSelectedResourceType('image')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'image'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setSelectedResourceType('link')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedResourceType === 'link'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Links
          </button>
        </div>
      </div>

      {/* Resources List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {selectedResourceType === 'all' ? 'All Resources' : `${selectedResourceType.charAt(0).toUpperCase() + selectedResourceType.slice(1)} Resources`}
            <span className="text-slate-500 font-normal ml-2">({filteredResources.length})</span>
          </h2>

          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {selectedResourceType === 'all' 
                  ? 'No resources available yet' 
                  : `No ${selectedResourceType} resources available`
                }
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Your teachers will upload course materials here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getResourceIcon(resource.resource_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{resource.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span>Course: {resource.courses?.title}</span>
                          <span>By: {resource.profiles?.full_name}</span>
                          {resource.file_size > 0 && <span>{formatFileSize(resource.file_size)}</span>}
                          <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          if (resource.file_url) {
                            window.open(resource.file_url, '_blank');
                          } else {
                            alert('File URL not available');
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View resource"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {resource.resource_type !== 'link' && resource.file_url && (
                        <a
                          href={resource.file_url}
                          download={resource.file_name}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                          title="Download resource"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    </DashboardLayout>
  );
}