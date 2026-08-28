import React, { useState, useEffect } from 'react';
import { Plus, Settings, Shuffle, Clock, Target, Save, Wand2, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LessonQuizSettings, GeneratedQuestion, Question } from '../types/lessonQuiz';

interface LessonQuizGeneratorProps {
  lessonId: string;
  courseId: string;
  lessonContent: string;
  onQuizCreated?: (quizId: string) => void;
  existingQuiz?: any; // Existing quiz for editing
}

export default function LessonQuizGenerator({ 
  lessonId, 
  courseId, 
  lessonContent, 
  onQuizCreated,
  existingQuiz 
}: LessonQuizGeneratorProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'preview'>('settings');
  
  // Quiz settings state
  const [settings, setSettings] = useState<LessonQuizSettings>({
    lessonId,
    quizEnabled: !!existingQuiz,
    isRequired: existingQuiz?.is_required || false,
    autoGenerate: existingQuiz?.auto_generated || true,
    customQuizId: existingQuiz?.id,
    
    questionCount: existingQuiz?.generation_settings?.questionCount || 5,
    difficultyDistribution: existingQuiz?.generation_settings?.difficultyDistribution || {
      easy: 2,
      medium: 2,
      hard: 1
    },
    questionTypes: existingQuiz?.generation_settings?.questionTypes || {
      multipleChoice: true,
      trueFalse: true,
      shortAnswer: false,
      fillBlank: false
    },
    
    passingScore: existingQuiz?.passing_score || 70,
    timeLimit: existingQuiz?.time_limit || undefined,
    allowRetries: existingQuiz?.allow_retry ?? true,
    maxRetries: existingQuiz?.max_retries || 3,
    shuffleQuestions: existingQuiz?.shuffle_questions || false,
    shuffleOptions: existingQuiz?.shuffle_options || false
  });
  
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (existingQuiz && settings.autoGenerate) {
      loadExistingQuestions();
    }
  }, [existingQuiz]);

  const loadExistingQuestions = async () => {
    if (!existingQuiz?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('quiz_id', existingQuiz.id);
      
      if (error) throw error;
      
      const formattedQuestions: Question[] = data.map(q => ({
        id: q.id,
        quiz_id: q.quiz_id,
        type: q.question_type as any,
        question_text: q.question_text,
        question: q.question_text,
        options: q.options ? (Array.isArray(q.options) ? q.options : [q.options]) : undefined,
        correct_answer: q.correct_answer,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        points: q.points,
        timeLimit: undefined, // Not in current schema
        lessonId: lessonId,
        contentReference: undefined, // Not in current schema
        difficulty: 'medium' as any,
        order_index: q.order_index,
        created_at: new Date(q.created_at)
      }));
      
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const generateQuiz = async () => {
    if (!user || !lessonContent) return;
    
    setLoading(true);
    try {
      // Call edge function to generate quiz from lesson content
      const { data, error } = await supabase.functions.invoke('generate-lesson-quiz', {
        body: {
          lessonId,
          content: lessonContent,
          settings
        }
      });
      
      if (error) throw error;
      
      if (data?.questions) {
        setQuestions(data.questions);
        setActiveTab('questions');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Fallback to manual question creation
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async () => {
    if (!user || !settings.quizEnabled) return;
    
    setLoading(true);
    try {
      let quizId = settings.customQuizId;
      
      if (!quizId) {
        // Create new quiz
        const { data: quizData, error: quizError } = await supabase
          .from('lesson_quizzes')
          .insert({
            title: `Quiz: ${lessonId}`,
            description: 'Lesson assessment quiz',
            lesson_id: lessonId,
            course_id: courseId,
            created_by: user.id,
            time_limit: settings.timeLimit,
            allow_retry: settings.allowRetries,
            max_retries: settings.maxRetries,
            shuffle_questions: settings.shuffleQuestions,
            shuffle_options: settings.shuffleOptions,
            passing_score: settings.passingScore,
            is_required: settings.isRequired,
            is_active: true,
            auto_generated: settings.autoGenerate,
            generation_settings: {
              questionCount: settings.questionCount,
              difficultyDistribution: settings.difficultyDistribution,
              questionTypes: settings.questionTypes
            }
          })
          .select()
          .single();
        
        if (quizError) throw quizError;
        quizId = quizData.id;
      }
      
      // Save questions
      if (questions.length > 0) {
        const questionsData = questions.map(q => ({
          quiz_id: quizId,
          lesson_id: lessonId,
          question_text: q.question,
          question_type: q.type,
          option_a: q.options?.[0],
          option_b: q.options?.[1],
          option_c: q.options?.[2],
          option_d: q.options?.[3],
          correct_answer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
          correct_answers: Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer],
          explanation: q.explanation,
          hint: undefined,
          points: q.points,
          time_limit: q.timeLimit,
          content_reference: q.contentReference,
          difficulty: q.difficulty
        }));
        
        // Delete existing questions if updating
        if (existingQuiz) {
          await supabase
            .from('lesson_questions')
            .delete()
            .eq('quiz_id', quizId);
        }
        
        const { error: questionsError } = await supabase
          .from('lesson_questions')
          .insert(questionsData);
        
        if (questionsError) throw questionsError;
      }
      
      onQuizCreated?.(quizId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      quiz_id: '',
      type: 'multiple-choice',
      question_text: '',
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      correctAnswer: '',
      explanation: '',
      points: 10,
      timeLimit: 30,
      lessonId,
      contentReference: undefined,
      difficulty: 'medium',
      order_index: questions.length,
      created_at: new Date()
    };
    
    setQuestions([...questions, newQuestion]);
    setEditingQuestion(newQuestion);
  };

  const updateQuestion = (updatedQuestion: Question) => {
    setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2"
      >
        <Wand2 className="h-5 w-5" />
        <span>{existingQuiz ? 'Edit Quiz' : 'Create Quiz'}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Lesson Quiz Builder</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {['settings', 'questions', 'preview'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Enable Quiz Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-800">Enable Quiz Assessment</h3>
                  <p className="text-sm text-slate-600">Add a quiz to test student understanding</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.quizEnabled}
                    onChange={(e) => setSettings({...settings, quizEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.quizEnabled && (
                <>
                  {/* Generation Method */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Quiz Creation Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setSettings({...settings, autoGenerate: true})}
                        className={`p-4 rounded-lg border-2 text-left transition ${
                          settings.autoGenerate
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <Wand2 className="h-6 w-6 mb-2 text-blue-600" />
                        <h4 className="font-medium">Auto-Generate from Content</h4>
                        <p className="text-sm text-slate-600">AI creates questions from lesson content</p>
                      </button>
                      
                      <button
                        onClick={() => setSettings({...settings, autoGenerate: false})}
                        className={`p-4 rounded-lg border-2 text-left transition ${
                          !settings.autoGenerate
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <Edit3 className="h-6 w-6 mb-2 text-purple-600" />
                        <h4 className="font-medium">Create Manually</h4>
                        <p className="text-sm text-slate-600">Build questions step by step</p>
                      </button>
                    </div>
                  </div>

                  {/* Auto-generation Settings */}
                  {settings.autoGenerate && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-slate-800">Generation Settings</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Number of Questions
                          </label>
                          <input
                            type="number"
                            min="3"
                            max="20"
                            value={settings.questionCount}
                            onChange={(e) => setSettings({...settings, questionCount: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={settings.passingScore}
                            onChange={(e) => setSettings({...settings, passingScore: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Question Types
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(settings.questionTypes).map(([type, enabled]) => (
                            <label key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  questionTypes: {
                                    ...settings.questionTypes,
                                    [type]: e.target.checked
                                  }
                                })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-700 capitalize">
                                {type.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={generateQuiz}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        <span>{loading ? 'Generating...' : 'Generate Quiz'}</span>
                      </button>
                    </div>
                  )}

                  {/* Assessment Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-800">Assessment Settings</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <Clock className="inline h-4 w-4 mr-1" />
                          Time Limit (minutes, optional)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="No limit"
                          value={settings.timeLimit || ''}
                          onChange={(e) => setSettings({...settings, timeLimit: e.target.value ? parseInt(e.target.value) : undefined})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <Target className="inline h-4 w-4 mr-1" />
                          Max Retries
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={settings.maxRetries}
                          onChange={(e) => setSettings({...settings, maxRetries: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.isRequired}
                          onChange={(e) => setSettings({...settings, isRequired: e.target.checked})}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          <strong>Required:</strong> Students must pass before accessing next lesson
                        </span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.allowRetries}
                          onChange={(e) => setSettings({...settings, allowRetries: e.target.checked})}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Allow retakes</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.shuffleQuestions}
                          onChange={(e) => setSettings({...settings, shuffleQuestions: e.target.checked})}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          <Shuffle className="inline h-4 w-4 mr-1" />
                          Shuffle questions
                        </span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.shuffleOptions}
                          onChange={(e) => setSettings({...settings, shuffleOptions: e.target.checked})}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          <Shuffle className="inline h-4 w-4 mr-1" />
                          Shuffle answer options
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quiz Questions ({questions.length})</h3>
                <button
                  onClick={addQuestion}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Question</span>
                </button>
              </div>
              
              {questions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Edit3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No questions yet. Generate a quiz or add questions manually.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={updateQuestion}
                      onDelete={() => deleteQuestion(question.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Quiz Preview</h3>
              
              <div className="bg-slate-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Settings</h4>
                    <ul className="text-sm text-slate-600 mt-2 space-y-1">
                      <li>• Questions: {questions.length}</li>
                      <li>• Passing Score: {settings.passingScore}%</li>
                      <li>• Time Limit: {settings.timeLimit ? `${settings.timeLimit} minutes` : 'No limit'}</li>
                      <li>• Retries: {settings.allowRetries ? `${settings.maxRetries} allowed` : 'No retries'}</li>
                      <li>• Required: {settings.isRequired ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                  
                  {questions.length > 0 && (
                    <div>
                      <h4 className="font-medium">Sample Questions</h4>
                      <div className="mt-2 space-y-3">
                        {questions.slice(0, 3).map((question, index) => (
                          <div key={question.id} className="bg-white p-4 rounded border">
                            <p className="font-medium text-sm">{index + 1}. {question.question}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Type: {question.type} • Difficulty: {question.difficulty}
                            </p>
                          </div>
                        ))}
                        {questions.length > 3 && (
                          <p className="text-sm text-slate-500">... and {questions.length - 3} more questions</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-4">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={saveQuiz}
            disabled={loading || !settings.quizEnabled || questions.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Save Quiz'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Editor Component
interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
}

function QuestionEditor({ question, index, onUpdate, onDelete }: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const updateField = (field: keyof Question, value: any) => {
    onUpdate({ ...question, [field]: value });
  };
  
  const updateOption = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate({ ...question, options: newOptions });
  };
  
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-500">Question {index + 1}</span>
            <p className="font-medium text-slate-800 mt-1">
              {question.question || 'Click to edit question'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {question.type} • {question.difficulty} • {question.points} points
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Question Text
            </label>
            <textarea
              value={question.question}
              onChange={(e) => updateField('question', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter your question..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Question Type
              </label>
              <select
                value={question.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True/False</option>
                <option value="short-answer">Short Answer</option>
                <option value="fill-blank">Fill in the Blank</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Difficulty
              </label>
              <select
                value={question.difficulty}
                onChange={(e) => updateField('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          {(question.type === 'multiple-choice' || question.type === 'true-false') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Answer Options
              </label>
              {question.type === 'true-false' ? (
                <>
                  <input
                    type="text"
                    value={question.options?.[0] || 'True'}
                    onChange={(e) => updateOption(0, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option A"
                  />
                  <input
                    type="text"
                    value={question.options?.[1] || 'False'}
                    onChange={(e) => updateOption(1, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option B"
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={question.options?.[0] || ''}
                    onChange={(e) => updateOption(0, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option A"
                  />
                  <input
                    type="text"
                    value={question.options?.[1] || ''}
                    onChange={(e) => updateOption(1, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option B"
                  />
                  <input
                    type="text"
                    value={question.options?.[2] || ''}
                    onChange={(e) => updateOption(2, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option C"
                  />
                  <input
                    type="text"
                    value={question.options?.[3] || ''}
                    onChange={(e) => updateOption(3, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Option D"
                  />
                </>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Correct Answer
            </label>
            {question.type === 'true-false' ? (
              <select
                value={question.correctAnswer as string}
                onChange={(e) => updateField('correctAnswer', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : question.type === 'multiple-choice' ? (
              <select
                value={question.correctAnswer as string}
                onChange={(e) => updateField('correctAnswer', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select correct answer</option>
                {question.options?.map((option: any, idx: number) => (
                  <option key={idx} value={option}>
                    {option || `Option ${String.fromCharCode(65 + idx)}`}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={question.correctAnswer as string}
                onChange={(e) => updateField('correctAnswer', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the correct answer"
              />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Points
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={question.points}
                onChange={(e) => updateField('points', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={question.timeLimit || 30}
                onChange={(e) => updateField('timeLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Explanation (optional)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => updateField('explanation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Explain why this is the correct answer..."
            />
          </div>
        </div>
      )}
    </div>
  );
}