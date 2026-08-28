import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileQuestion, Plus, Search, Filter, Edit3, Trash2, 
  Copy, Download, Upload, RefreshCw, AlertTriangle, 
  CheckCircle, XCircle, Save, BookOpen, Target,
  Type, Hash, Calendar, Tag, Database
} from 'lucide-react';

interface Question {
  id: string;
  question_text?: string;
  question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: any;
  correct_answer?: string;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  lesson_id?: string;
  quiz_id?: string;
  title?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface QuestionFormData {
  question_text?: string;
  question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: any;
  correct_answer?: string;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  lesson_id?: string;
  quiz_id?: string;
  title?: string;
  description?: string;
}

const QUESTION_TABLES = {
  lesson_questions: 'Lesson Questions',
  questions: 'Quiz Questions',
  lesson_quizzes: 'Lesson Quizzes',
  quizzes: 'General Quizzes'
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' }
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<{ table: string; questions: Question[] }[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<{ table: string; questionId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters and search
  const [filters, setFilters] = useState({
    tableName: 'all',
    category: '',
    question_type: '',
    difficulty: '',
    search: '',
    lesson_id: '',
    quiz_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentTable, setCurrentTable] = useState<string>('');
  
  // Form data
  const [formData, setFormData] = useState<QuestionFormData>({
    question_text: '',
    question_type: 'multiple_choice',
    options: '',
    correct_answer: '',
    points: 1,
    difficulty: 'medium',
    category: ''
  });

  // Bulk operation state
  const [bulkOperation, setBulkOperation] = useState({
    tableName: '',
    type: 'update_category',
    data: {}
  });

  useEffect(() => {
    loadQuestions();
  }, [filters, pagination]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      if (filters.tableName === 'all') {
        // Load from all tables
        const response = await supabase.functions.invoke('admin-question-management', {
          body: {
            action: 'get_questions',
            filters: {
              ...filters,
              limit: pagination.limit,
              offset: pagination.offset
            }
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        setQuestions(response.data.data || []);
        setPagination(prev => ({ 
          ...prev, 
          total: (response.data.data || []).reduce((sum: number, table: any) => sum + table.questions.length, 0)
        }));
      } else {
        // Load from specific table
        const response = await supabase.functions.invoke('admin-question-management', {
          body: {
            action: 'get_questions',
            tableName: filters.tableName,
            filters: {
              ...Object.fromEntries(Object.entries(filters).filter(([key]) => key !== 'tableName')),
              limit: pagination.limit,
              offset: pagination.offset
            }
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        setQuestions([{
          table: filters.tableName,
          questions: response.data.data || []
        }]);
        setPagination(prev => ({ 
          ...prev, 
          total: response.data.data?.length || 0
        }));
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (questionData: QuestionFormData) => {
    if (!currentTable) {
      setError('Please select a table for the question');
      return;
    }

    try {
      setLoading(true);
      const response = await supabase.functions.invoke('admin-question-management', {
        body: {
          action: 'create_question',
          tableName: currentTable,
          updates: questionData
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSuccess('Question created successfully!');
      setShowCreateModal(false);
      setFormData({
        question_text: '',
        question_type: 'multiple_choice',
        options: '',
        correct_answer: '',
        points: 1,
        difficulty: 'medium',
        category: ''
      });
      loadQuestions();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string, updates: QuestionFormData) => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('admin-question-management', {
        body: {
          action: 'update_question',
          questionId,
          tableName: currentTable,
          updates
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSuccess('Question updated successfully!');
      setShowEditModal(false);
      setCurrentQuestion(null);
      loadQuestions();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, tableName: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await supabase.functions.invoke('admin-question-management', {
        body: {
          action: 'delete_question',
          questionId,
          tableName
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSuccess('Question deleted successfully!');
      loadQuestions();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateQuestion = async (questionId: string, tableName: string) => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('admin-question-management', {
        body: {
          action: 'duplicate_question',
          questionId,
          tableName
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSuccess('Question duplicated successfully!');
      loadQuestions();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      setError('Please select questions for bulk deletion');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedQuestions.length} question(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Group by table for efficient deletion
      const groupedQuestions = selectedQuestions.reduce((acc, item) => {
        if (!acc[item.table]) acc[item.table] = [];
        acc[item.table].push(item.questionId);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [tableName, questionIds] of Object.entries(groupedQuestions)) {
        const response = await supabase.functions.invoke('admin-question-management', {
          body: {
            action: 'bulk_delete_questions',
            tableName,
            updates: { questionIds }
          }
        });

        if (response.error) {
          console.error(`Error deleting from ${tableName}:`, response.error.message);
        }
      }

      setSuccess('Bulk deletion completed!');
      setSelectedQuestions([]);
      loadQuestions();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = (table: string, questionId: string, selected: boolean) => {
    const questionKey = { table, questionId };
    
    if (selected) {
      setSelectedQuestions([...selectedQuestions, questionKey]);
    } else {
      setSelectedQuestions(selectedQuestions.filter(
        item => !(item.table === table && item.questionId === questionId)
      ));
    }
  };

  const handleSelectAllInTable = (table: string, questions: Question[], selected: boolean) => {
    if (selected) {
      const newSelections = questions.map(q => ({ table, questionId: q.id }));
      setSelectedQuestions(prev => [...prev, ...newSelections]);
    } else {
      setSelectedQuestions(prev => 
        prev.filter(item => item.table !== table)
      );
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'multiple_choice': return 'text-blue-600 bg-blue-100';
      case 'true_false': return 'text-purple-600 bg-purple-100';
      case 'short_answer': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-orange-600" />
            Question Management
          </h2>
          <p className="text-slate-600 mt-1">Manage questions across all quiz and lesson systems</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => {
              const data = questions.flatMap(table => 
                table.questions.map(q => ({ table: table.table, ...q }))
              );
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `questions-export-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedQuestions.length === 0 || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Bulk Delete ({selectedQuestions.length})
          </button>
          <button
            onClick={() => {
              setCurrentTable('');
              setFormData({
                question_text: '',
                question_type: 'multiple_choice',
                options: '',
                correct_answer: '',
                points: 1,
                difficulty: 'medium',
                category: ''
              });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>
          <button
            onClick={loadQuestions}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.tableName}
                onChange={(e) => setFilters(prev => ({ ...prev, tableName: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Tables</option>
                {Object.entries(QUESTION_TABLES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filters.question_type}
                onChange={(e) => setFilters(prev => ({ ...prev, question_type: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Types</option>
                {QUESTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Difficulties</option>
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Questions Summary */}
          {selectedQuestions.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedQuestions([])}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Questions Tables */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-600" />
              <span className="ml-2 text-slate-600">Loading questions...</span>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <FileQuestion className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No questions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          questions.map((tableGroup) => (
            <div key={tableGroup.table} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">
                      {QUESTION_TABLES[tableGroup.table as keyof typeof QUESTION_TABLES]}
                    </h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                      {tableGroup.questions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tableGroup.questions.length > 0 && tableGroup.questions.every(q => 
                        selectedQuestions.some(item => item.table === tableGroup.table && item.questionId === q.id)
                      )}
                      onChange={(e) => handleSelectAllInTable(tableGroup.table, tableGroup.questions, e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-600">Select All</span>
                  </div>
                </div>
              </div>

              {tableGroup.questions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileQuestion className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p>No questions in this table</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Select</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {tableGroup.table.includes('quiz') ? 'Title/Question' : 'Question'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Difficulty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tableGroup.questions.map((question) => {
                        const isSelected = selectedQuestions.some(item => 
                          item.table === tableGroup.table && item.questionId === question.id
                        );
                        return (
                          <tr key={question.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectQuestion(tableGroup.table, question.id, e.target.checked)}
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                {question.title || question.question_text ? (
                                  <div>
                                    <div className="font-medium text-slate-900 line-clamp-2">
                                      {question.title || question.question_text?.substring(0, 100)}
                                      {(question.title || question.question_text)?.length > 100 && '...'}
                                    </div>
                                    {question.description && (
                                      <div className="text-slate-500 text-xs mt-1 line-clamp-1">
                                        {question.description}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No text content</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {question.question_type && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(question.question_type)}`}>
                                  {question.question_type.replace('_', ' ')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {question.difficulty && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                  {question.difficulty}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-slate-400" />
                                <span className="text-sm text-slate-600">
                                  {question.category || 'None'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-slate-400" />
                                <span className="text-sm text-slate-600">{question.points || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(question.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setCurrentQuestion(question);
                                    setCurrentTable(tableGroup.table);
                                    setFormData({
                                      question_text: question.question_text || '',
                                      question_type: question.question_type || 'multiple_choice',
                                      options: question.options ? JSON.stringify(question.options, null, 2) : '',
                                      correct_answer: question.correct_answer || '',
                                      points: question.points || 1,
                                      difficulty: question.difficulty || 'medium',
                                      category: question.category || '',
                                      title: question.title || '',
                                      description: question.description || ''
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg"
                                  title="Edit Question"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateQuestion(question.id, tableGroup.table)}
                                  className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg"
                                  title="Duplicate Question"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(question.id, tableGroup.table)}
                                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Create New Question</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateQuestion(formData);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Table *
                  </label>
                  <select
                    required
                    value={currentTable}
                    onChange={(e) => setCurrentTable(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Table</option>
                    {Object.entries(QUESTION_TABLES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {(currentTable === 'lesson_questions' || currentTable === 'questions') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.question_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                {(currentTable === 'lesson_quizzes' || currentTable === 'quizzes') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                )}

                {(currentTable === 'lesson_questions' || currentTable === 'questions') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={formData.question_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        {QUESTION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.question_type === 'multiple_choice' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Options (JSON format)
                        </label>
                        <textarea
                          rows={4}
                          value={formData.options}
                          onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                          placeholder='["Option 1", "Option 2", "Option 3", "Option 4"]'
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Correct Answer
                      </label>
                      <input
                        type="text"
                        value={formData.correct_answer}
                        onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.points}
                          onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Difficulty
                        </label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          {DIFFICULTY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Create Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Question</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateQuestion(currentQuestion.id, formData);
              }} className="space-y-4">
                {(currentTable === 'lesson_questions' || currentTable === 'questions') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Question Text *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.question_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={formData.question_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        {QUESTION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.question_type === 'multiple_choice' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Options (JSON format)
                        </label>
                        <textarea
                          rows={4}
                          value={formData.options}
                          onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Correct Answer
                      </label>
                      <input
                        type="text"
                        value={formData.correct_answer}
                        onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.points}
                          onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Difficulty
                        </label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          {DIFFICULTY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                )}

                {(currentTable === 'lesson_quizzes' || currentTable === 'quizzes') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Update Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Import Questions</h3>
              <div className="text-center py-8">
                <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">
                  Import questions from JSON file
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  File format should match the export format
                </p>
                <button
                  onClick={() => {
                    // TODO: Implement file upload
                    setError('Import functionality coming soon');
                    setShowImportModal(false);
                  }}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Choose File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionManagement;