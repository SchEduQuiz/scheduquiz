import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, Trash2, Eye, PlusCircle } from 'lucide-react';

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
  uploaded_by: {
    full_name: string;
  };
  profiles?: {
    full_name: string;
  };
}

export default function CourseResources() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    resource_type: 'document'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadResources(selectedCourse.id);
    }
  }, [selectedCourse]);

  async function loadCourses() {
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
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources(courseId: string) {
    try {
      const { data: resources } = await supabase
        .from('course_resources')
        .select(`
          *,
          profiles:uploaded_by(full_name)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      // Transform the data to match the interface
      const transformedResources = (resources || []).map(item => ({
        ...item,
        uploaded_by: item.profiles || { full_name: 'Unknown' },
        profiles: item.profiles
      }));

      setResources(transformedResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse || !selectedFile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `${selectedCourse.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      // Save resource to database
      const { error: dbError } = await supabase
        .from('course_resources')
        .insert({
          course_id: selectedCourse.id,
          uploaded_by: user.id,
          title: uploadForm.title,
          description: uploadForm.description,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          resource_type: uploadForm.resource_type
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save resource: ${dbError.message}`);
      }

      // Reset form
      setUploadForm({
        title: '',
        description: '',
        resource_type: 'document'
      });
      setSelectedFile(null);
      setShowUploadForm(false);

      // Reload resources
      await loadResources(selectedCourse.id);
      
      // Show success message
      alert('Resource uploaded successfully!');
      
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      alert(`Failed to upload resource: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteResource(resourceId: string) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      // Delete from database (file will be cleaned up by storage policies)
      await supabase.from('course_resources').delete().eq('id', resourceId);
      
      // Reload resources
      if (selectedCourse) {
        await loadResources(selectedCourse.id);
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
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
        return '🎥';
      case 'audio':
        return '🎵';
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      case 'link':
        return '🔗';
      default:
        return '📁';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Course Resources</h1>
          <p className="text-slate-600">Upload and manage course materials for your students</p>
        </div>
        {selectedCourse && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Upload Resource</span>
          </button>
        )}
      </div>

      {/* Course Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Select Course</h2>
        <select
          value={selectedCourse?.id || ''}
          onChange={(e) => {
            const course = courses.find(c => c.id === e.target.value);
            setSelectedCourse(course);
          }}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a course to manage resources</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Form */}
      {showUploadForm && selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Upload New Resource</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Resource Title</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resource Type</label>
                <select
                  value={uploadForm.resource_type}
                  onChange={(e) => {
                    const newResourceType = e.target.value;
                    setUploadForm(prev => ({ ...prev, resource_type: newResourceType }));
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="document">Document (PDF, DOC, TXT)</option>
                  <option value="video">Video (MP4, AVI, MOV)</option>
                  <option value="audio">Audio (MP3, WAV, AAC)</option>
                  <option value="image">Image (JPG, PNG, GIF)</option>
                  <option value="link">External Link</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFile(file);
                    // Auto-detect resource type from file extension
                    if (file) {
                      const extension = file.name.split('.').pop()?.toLowerCase();
                      let autoResourceType = 'document';
                      
                      if (extension) {
                        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
                          autoResourceType = 'image';
                        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
                          autoResourceType = 'video';
                        } else if (['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(extension)) {
                          autoResourceType = 'audio';
                        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
                          autoResourceType = 'document';
                        }
                      }
                      
                      setUploadForm(prev => ({ ...prev, resource_type: autoResourceType }));
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={uploadForm.resource_type !== 'link'}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Max file size: 50MB
                </p>
              </div>
            </div>

            {uploadForm.resource_type === 'link' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">External Link URL</label>
                <input
                  type="url"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="https://example.com/resource"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Upload Resource
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setUploadForm({ title: '', description: '', resource_type: 'document' });
                }}
                className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources List */}
      {selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Resources for: {selectedCourse.title}
            </h2>

            {resources.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No resources uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getResourceIcon(resource.resource_type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{resource.title}</h3>
                          <p className="text-sm text-slate-600">{resource.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                            <span>{resource.file_name}</span>
                            <span>{formatFileSize(resource.file_size)}</span>
                            <span>By {resource.profiles?.full_name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={resource.file_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View resource"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => deleteResource(resource.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete resource"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedCourse && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Select a course to manage its resources</p>
        </div>
      )}
    </div>
  );
}
