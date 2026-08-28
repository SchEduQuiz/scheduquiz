import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Plus, Edit, Trash2, ChevronUp, ChevronDown, Eye, X, BookOpen } from 'lucide-react';

interface LessonQuestion {
  id: string;
  quiz_id?: string;
  lesson_id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: { text: string; is_correct: boolean }[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
  points: number;
}

interface QuestionManagerProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  onClose: () => void;
}

export default function QuestionManager({ lessonId, lessonTitle, lessonContent, onClose }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<LessonQuestion | null>(null);
  const [quizMode, setQuizMode] = useState<'lesson' | 'quiz'>('lesson');
  
  // AI Generation settings
  const [aiSettings, setAISettings] = useState({
    num_questions: 10,
    difficulty: 'mixed',
    question_types: ['multiple_choice', 'true_false']
  });

  // Manual question form
  const [manualForm, setManualForm] = useState({
    question_text: '',
    question_type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'short_answer',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 10
  });

  useEffect(() => {
    loadQuestions();
  }, [lessonId]);

  async function loadQuestions() {
    try {
      setLoading(true);
      
      // First, try to load questions directly by lesson_id
      const { data: lessonQuestions, error: lessonError } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index');

      if (lessonError && lessonError.code !== 'PGRST116') {
        throw lessonError;
      }

      let allQuestions = lessonQuestions || [];

      // If in quiz mode and no lesson questions, try to get quiz questions
      if (quizMode === 'quiz' && allQuestions.length === 0) {
        const { data: quizData } = await supabase
          .from('lesson_quizzes')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('is_active', true)
          .single();

        if (quizData) {
          const { data: quizQuestions } = await supabase
            .from('lesson_questions')
            .select('*')
            .eq('quiz_id', quizData.id)
            .order('order_index');

          allQuestions = quizQuestions || [];
        }
      }

      setQuestions(allQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateAIQuestions() {
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-question-generator`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            lesson_content: lessonContent,
            lesson_title: lessonTitle,
            ...aiSettings
          })
        }
      );

      if (!response.ok) throw new Error('Failed to generate questions');

      const result = await response.json();
      const generatedQuestions = result.data.questions;

      // Save generated questions - prioritize lesson_id approach
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const questionsToInsert = generatedQuestions.map((q: any, index: number) => ({
        lesson_id: lessonId, // ← Primary relationship using lesson_id
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        order_index: questions.length + index,
        points: q.points,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('lesson_questions')
        .insert(questionsToInsert);

      if (error) {
        // If lesson_id approach fails, try quiz-based approach
        if (error.message.includes('null value') || error.message.includes('quiz_id')) {
          await insertWithQuizFallback(questionsToInsert);
        } else {
          throw error;
        }
      }

      await loadQuestions();
      setShowAIModal(false);
      alert(`Successfully generated ${generatedQuestions.length} questions!`);
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function insertWithQuizFallback(questionsToInsert: any[]) {
    // Create a quiz for this lesson if it doesn't exist
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    // Check if quiz already exists
    const { data: existingQuiz } = await supabase
      .from('lesson_quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('is_active', true)
      .single();

    let quizId = existingQuiz?.id;

    if (!quizId) {
      // Create new quiz
      const { data: courseData } = await supabase
        .from('lessons')
        .select('course_id')
        .eq('id', lessonId)
        .single();

      const { data: newQuiz, error: quizError } = await supabase
        .from('lesson_quizzes')
        .insert({
          lesson_id: lessonId,
          title: `${lessonTitle} Quiz`,
          description: `Auto-generated quiz for ${lessonTitle}`,
          quiz_settings: aiSettings,
          is_active: true,
          created_by: user.id,
          course_id: courseData?.course_id,
          time_limit: 300,
          allow_retry: true,
          max_retries: 3,
          shuffle_questions: true,
          shuffle_options: true,
          passing_score: 70,
          is_required: false,
          auto_generated: true
        })
        .select('id')
        .single();

      if (quizError) throw quizError;
      quizId = newQuiz.id;
    }

    // Insert questions with quiz_id
    const quizQuestionsToInsert = questionsToInsert.map(q => ({
      ...q,
      quiz_id: quizId,
      lesson_id: lessonId // Keep both relationships
    }));

    const { error } = await supabase
      .from('lesson_questions')
      .insert(quizQuestionsToInsert);

    if (error) throw error;
  }

  async function saveManualQuestion() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      let options = null;
      if (manualForm.question_type === 'multiple_choice') {
        options = JSON.stringify(
          manualForm.options.map((text, index) => ({
            text,
            is_correct: String.fromCharCode(65 + index) === manualForm.correct_answer
          }))
        );
      } else if (manualForm.question_type === 'true_false') {
        options = JSON.stringify([
          { text: 'True', is_correct: manualForm.correct_answer === 'true' },
          { text: 'False', is_correct: manualForm.correct_answer === 'false' }
        ]);
      }

      const questionData = {
        lesson_id: lessonId,
        question_text: manualForm.question_text,
        question_type: manualForm.question_type,
        options,
        correct_answer: manualForm.correct_answer,
        explanation: manualForm.explanation,
        difficulty: manualForm.difficulty,
        order_index: questions.length,
        points: manualForm.points,
        created_by: user.id
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('lesson_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_questions')
          .insert([questionData]);
        if (error) throw error;
      }

      await loadQuestions();
      setShowManualModal(false);
      setEditingQuestion(null);
      resetManualForm();
      alert(editingQuestion ? 'Question updated!' : 'Question added!');
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question. Please try again.');
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('lesson_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question.');
    }
  }

  async function moveQuestion(id: string, direction: 'up' | 'down') {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];

    // Update order_index in database
    try {
      const updates = newQuestions.map((q, i) => ({
        id: q.id,
        order_index: i
      }));

      for (const update of updates) {
        await supabase
          .from('lesson_questions')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      await loadQuestions();
    } catch (error) {
      console.error('Error reordering questions:', error);
    }
  }

  function resetManualForm() {
    setManualForm({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      difficulty: 'medium',
      points: 10
    });
  }

  function startEditQuestion(question: LessonQuestion) {
    setEditingQuestion(question);
    setManualForm({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options ? question.options.map(o => o.text) : ['', '', '', ''],
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      points: question.points
    });
    setShowManualModal(true);
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Manage Quiz Questions</h2>
            <p className="text-blue-100 mt-1">{lessonTitle}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-2 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex gap-2">
            <button
              onClick={() => setQuizMode('lesson')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                quizMode === 'lesson'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Lesson Questions
            </button>
            <button
              onClick={() => setQuizMode('quiz')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                quizMode === 'quiz'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Quiz Questions
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {quizMode === 'lesson' 
              ? 'Questions generated directly from lesson content (lesson-centered approach)'
              : 'Questions organized in quiz structure (quiz-centered approach)'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              <Sparkles className="h-5 w-5" />
              Auto-Generate AI Questions
            </button>
            <button
              onClick={() => {
                resetManualForm();
                setEditingQuestion(null);
                setShowManualModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Add Question Manually
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
            <span>Total Questions: <strong>{questions.length}</strong></span>
            <span>Easy: <strong>{questions.filter(q => q.difficulty === 'easy').length}</strong></span>
            <span>Medium: <strong>{questions.filter(q => q.difficulty === 'medium').length}</strong></span>
            <span>Hard: <strong>{questions.filter(q => q.difficulty === 'hard').length}</strong></span>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No questions yet</p>
              <p className="text-slate-500 text-sm mt-2">Use AI generation or add questions manually to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">
                        Q{index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{question.question_text}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                            {question.question_type.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${difficultyColors[question.difficulty]}`}>
                            {question.difficulty}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {question.points} pts
                          </span>
                          {question.lesson_id && (
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                              Lesson-Based
                            </span>
                          )}
                          {question.quiz_id && (
                            <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded">
                              Quiz-Based
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveQuestion(question.id, 'up')}
                        disabled={index === 0}
                        className="p-2 hover:bg-slate-100 rounded disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveQuestion(question.id, 'down')}
                        disabled={index === questions.length - 1}
                        className="p-2 hover:bg-slate-100 rounded disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEditQuestion(question)}
                        className="p-2 hover:bg-blue-100 rounded text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="p-2 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Show options for multiple choice */}
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="ml-14 space-y-1">
                      {question.options.map((option, i) => (
                        <div
                          key={i}
                          className={`text-sm p-2 rounded ${
                            option.is_correct
                              ? 'bg-green-50 text-green-700 font-medium'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {option.text}
                          {option.is_correct && ' ✓'}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Show correct answer for true/false */}
                  {question.question_type === 'true_false' && (
                    <div className="ml-14 text-sm">
                      <span className="font-medium">Correct Answer:</span>{' '}
                      <span className="text-green-600 font-bold">{question.correct_answer}</span>
                    </div>
                  )}
                  
                  {/* Show explanation */}
                  {question.explanation && (
                    <div className="ml-14 mt-2 text-sm text-slate-600 bg-blue-50 p-2 rounded">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Generation Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <h3 className="text-2xl font-bold mb-4">Generate Questions with AI</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Questions</label>
                  <select
                    value={aiSettings.num_questions}
                    onChange={(e) => setAISettings({ ...aiSettings, num_questions: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty Level</label>
                  <select
                    value={aiSettings.difficulty}
                    onChange={(e) => setAISettings({ ...aiSettings, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Question Types</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={aiSettings.question_types.includes('multiple_choice')}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...aiSettings.question_types, 'multiple_choice']
                            : aiSettings.question_types.filter(t => t !== 'multiple_choice');
                          setAISettings({ ...aiSettings, question_types: types });
                        }}
                      />
                      Multiple Choice
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={aiSettings.question_types.includes('true_false')}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...aiSettings.question_types, 'true_false']
                            : aiSettings.question_types.filter(t => t !== 'true_false');
                          setAISettings({ ...aiSettings, question_types: types });
                        }}
                      />
                      True/False
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>AI-Powered Generation:</strong> Questions will be generated directly from your lesson content using Google AI, ensuring relevance and quality.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAIModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={generateAIQuestions}
                  disabled={generating || aiSettings.question_types.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Questions'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Question Modal */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-2xl font-bold mb-4">
                {editingQuestion ? 'Edit Question' : 'Add Question Manually'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question Type</label>
                  <select
                    value={manualForm.question_type}
                    onChange={(e) => setManualForm({ 
                      ...manualForm, 
                      question_type: e.target.value as any 
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Question Text</label>
                  <textarea
                    value={manualForm.question_text}
                    onChange={(e) => setManualForm({ ...manualForm, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={3}
                    placeholder="Enter your question here..."
                    required
                  />
                </div>

                {manualForm.question_type === 'multiple_choice' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Options</label>
                      {['A', 'B', 'C', 'D'].map((letter, index) => (
                        <div key={letter} className="mb-2">
                          <input
                            type="text"
                            value={manualForm.options[index]}
                            onChange={(e) => {
                              const newOptions = [...manualForm.options];
                              newOptions[index] = e.target.value;
                              setManualForm({ ...manualForm, options: newOptions });
                            }}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder={`Option ${letter}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Correct Answer</label>
                      <select
                        value={manualForm.correct_answer}
                        onChange={(e) => setManualForm({ ...manualForm, correct_answer: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        required
                      >
                        <option value="">Select correct answer...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </>
                )}

                {manualForm.question_type === 'true_false' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Correct Answer</label>
                    <select
                      value={manualForm.correct_answer}
                      onChange={(e) => setManualForm({ ...manualForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      required
                    >
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}

                {manualForm.question_type === 'short_answer' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Expected Answer</label>
                    <input
                      type="text"
                      value={manualForm.correct_answer}
                      onChange={(e) => setManualForm({ ...manualForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Enter expected answer..."
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Explanation</label>
                  <textarea
                    value={manualForm.explanation}
                    onChange={(e) => setManualForm({ ...manualForm, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="Explain why this answer is correct..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty</label>
                    <select
                      value={manualForm.difficulty}
                      onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Points</label>
                    <input
                      type="number"
                      value={manualForm.points}
                      onChange={(e) => setManualForm({ ...manualForm, points: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualModal(false);
                    setEditingQuestion(null);
                    resetManualForm();
                  }}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveManualQuestion}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}