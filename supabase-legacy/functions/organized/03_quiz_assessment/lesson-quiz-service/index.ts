// Lesson Quiz Service Edge Function
// Handles lesson-based quiz creation, taking, and grading

// Inline CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Utility: Verify JWT token
async function verifyToken(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error('Token expired');
    
    // Check for required fields in Supabase JWT
    if (!payload.sub || !payload.aud) throw new Error('Invalid token structure');
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Utility: Get user from auth header
async function getUser(authHeader: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Utility: Database fetch
async function dbFetch(url: string, options: RequestInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response = await fetch(`${supabaseUrl}${url}`, {
    ...options,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

// Calculate time-based bonus points
function calculateTimeBonus(responseTime: number, timeLimit: number, basePoints: number): number {
  const timeRatio = responseTime / timeLimit;
  const maxBonus = Math.floor(basePoints * 0.3); // Max 30% bonus
  
  if (timeRatio <= 0.3) {
    return maxBonus; // Full bonus for quick answers
  } else if (timeRatio <= 0.6) {
    return Math.floor(maxBonus * 0.5); // Half bonus
  }
  
  return 0; // No bonus for slow answers
}

// Handler: Get lesson quiz with questions
async function handleGetLessonQuiz(quizId: string, includeAnswers: boolean = false) {
  // Get quiz details
  const quizResponse = await dbFetch(`/rest/v1/lesson_quizzes?id=eq.${quizId}&limit=1`);
  const quizzes = await quizResponse.json();
  
  if (!quizzes || quizzes.length === 0) {
    throw new Error('Quiz not found');
  }
  
  const quiz = quizzes[0];
  
  // Get questions
  const questionsResponse = await dbFetch(
    `/rest/v1/lesson_questions?quiz_id=eq.${quizId}&order=created_at.asc`
  );
  const questions = await questionsResponse.json();
  
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions found for this quiz');
  }
  
  // Transform questions to frontend format
  const transformedQuestions = questions.map(q => ({
    id: q.id,
    type: q.question_type,
    question: q.question_text,
    options: q.options ? (Array.isArray(q.options) ? q.options : [q.options]) : undefined,
    correctAnswer: q.correct_answer,
    explanation: includeAnswers ? q.explanation : undefined,
    points: q.points,
    timeLimit: undefined, // Not in current schema
    lessonId: quiz.lesson_id,
    contentReference: undefined, // Not in current schema
    difficulty: 'medium' // Default value
  }));
  
  return {
    quiz,
    questions: transformedQuestions
  };
}

// Handler: Get hint for a question
async function handleGetHint(authHeader: string, questionId: string) {
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const questionResponse = await dbFetch(
    `/rest/v1/lesson_questions?id=eq.${questionId}&select=id,hint,explanation&limit=1`
  );
  const questions = await questionResponse.json();
  
  if (!questions || questions.length === 0) {
    throw new Error('Question not found');
  }
  
  const question = questions[0];
  
  return {
    question_id: questionId,
    hint: question.hint || question.explanation || 'No hint available',
  };
}

// Handler: Submit lesson quiz
async function handleSubmitQuiz(authHeader: string, quizId: string, body: any) {
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const { answers, total_time, focus_lost_count = 0, tab_switches = 0 } = body;
  
  // Get quiz and question details
  const quizData = await handleGetLessonQuiz(quizId, true);
  const quiz = quizData.quiz;
  const questions = quizData.questions;
  
  // Check attempt limits - use default limit since max_retries not in schema
  const existingAttemptsResponse = await dbFetch(
    `/rest/v1/lesson_quiz_attempts?quiz_id=eq.${quizId}&student_id=eq.${user.sub}&select=id`
  );
  const existingAttempts = await existingAttemptsResponse.json();
  
  // Default to 3 attempts if limit not specified
  const maxAttempts = quiz.quiz_settings?.max_retries || 3;
  if (existingAttempts.length >= maxAttempts) {
    throw new Error('Maximum attempts exceeded');
  }
  
  let correctCount = 0;
  let baseScore = 0;
  let totalTimeBonus = 0;
  const responses = [];
  const questionResults = [];
  
  // Calculate score
  for (const question of questions) {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;
    const basePoints = isCorrect ? question.points : 0;
    
    // Calculate time bonus
    const timeBonus = isCorrect ? calculateTimeBonus(
      0, // We don't have individual question timing
      question.timeLimit || 30,
      question.points
    ) : 0;
    
    const pointsEarned = basePoints + timeBonus;
    
    if (isCorrect) correctCount++;
    baseScore += basePoints;
    totalTimeBonus += timeBonus;
    
    responses.push({
      question_id: question.id,
      user_answer: userAnswer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      response_time: 0, // Individual question timing not tracked in this implementation
    });
    
    questionResults.push({
      questionId: question.id,
      question: question.question,
      userAnswer: userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect,
      points: pointsEarned,
      maxPoints: question.points,
      responseTime: 0,
    });
  }
  
  // Final score
  const finalScore = baseScore + totalTimeBonus;
  const maxPossibleScore = questions.reduce((sum: number, q: any) => sum + q.points, 0);
  const percentage = maxPossibleScore > 0 ? (finalScore / maxPossibleScore) * 100 : 0;
  const passed = percentage >= quiz.passing_score;
  
  // Create attempt record
  const attemptNumber = existingAttempts.length + 1;
  const attemptResponse = await dbFetch('/rest/v1/lesson_quiz_attempts', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      quiz_id: quizId,
      student_id: user.sub,
      attempt_number: attemptNumber,
      total_questions: questions.length,
      correct_answers: correctCount,
      score_percentage: percentage,
      time_spent: total_time,
      passed: passed,
      focus_lost_count: focus_lost_count,
      tab_switches: tab_switches,
      completed_at: new Date().toISOString(),
    }),
  });
  
  if (!attemptResponse.ok) {
    const error = await attemptResponse.text();
    throw new Error(`Failed to save attempt: ${error}`);
  }
  
  const attemptData = await attemptResponse.json();
  const attempt = attemptData[0];
  
  // Save question responses
  for (const response of responses) {
    await dbFetch('/rest/v1/lesson_quiz_responses', {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: attempt.id,
        question_id: response.question_id,
        student_answer: response.user_answer,
        is_correct: response.is_correct,
        time_spent: response.response_time,
      }),
    });
  }
  
  // Update quiz analytics (if we track them)
  try {
    await dbFetch(`/rest/v1/lesson_quizzes?id=eq.${quizId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('Failed to update quiz analytics:', error);
  }
  
  return {
    success: true,
    data: {
      attempt: {
        ...attempt,
        responses: questionResults
      },
      summary: {
        score: finalScore,
        maxScore: maxPossibleScore,
        percentage: Math.round(percentage * 100) / 100,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        passed: passed,
        timeSpent: total_time,
        attemptNumber: attemptNumber,
      }
    }
  };
}

// Handler: Get quiz attempts for a user
async function handleGetUserAttempts(authHeader: string, quizId: string) {
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const response = await dbFetch(
    `/rest/v1/lesson_quiz_attempts?quiz_id=eq.${quizId}&user_id=eq.${user.sub}&order=created_at.desc`
  );
  
  const attempts = await response.json();
  
  return {
    attempts: attempts || [],
    totalAttempts: attempts?.length || 0
  };
}

// Handler: Auto-generate quiz from lesson content (placeholder)
async function handleGenerateQuizFromContent(authHeader: string, body: any) {
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const { lessonId, content, settings } = body;
  
  // This is a placeholder implementation
  // In a real implementation, you would use AI/ML to generate questions
  
  const mockQuestions = [
    {
      id: 'temp-1',
      type: 'multiple-choice',
      question: `What is the main topic discussed in this lesson about "${content.substring(0, 50)}..."?`,
      options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
      correctAnswer: 'Topic A',
      explanation: 'This is the primary topic covered in the lesson content.',
      points: 10,
      timeLimit: 30,
      lessonId: lessonId,
      difficulty: 'medium'
    },
    {
      id: 'temp-2',
      type: 'true-false',
      question: 'The lesson covers important concepts that students should understand.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Lessons are designed to teach important concepts.',
      points: 5,
      timeLimit: 20,
      lessonId: lessonId,
      difficulty: 'easy'
    },
    {
      id: 'temp-3',
      type: 'short-answer',
      question: 'Briefly describe the key learning objective of this lesson.',
      options: undefined,
      correctAnswer: 'Understanding the main concepts',
      explanation: 'Students should demonstrate understanding of the key concepts.',
      points: 15,
      timeLimit: 60,
      lessonId: lessonId,
      difficulty: 'hard'
    }
  ];
  
  return {
    success: true,
    data: {
      questions: mockQuestions,
      message: 'Quiz generated successfully (mock implementation)'
    }
  };
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const action = pathParts[pathParts.length - 1];
    const authHeader = req.headers.get('authorization') || '';
    
    let result;
    
    if (req.method === 'GET') {
      if (action === 'generate') {
        // Generate quiz from content
        result = await handleGenerateQuizFromContent(authHeader, {});
      } else if (action === 'attempts') {
        // Get user attempts
        const quizId = pathParts[pathParts.length - 2];
        result = await handleGetUserAttempts(authHeader, quizId);
      } else if (action === 'hint') {
        // Get hint for question
        const questionId = pathParts[pathParts.length - 2];
        result = await handleGetHint(authHeader, questionId);
      } else if (action === 'questions' && pathParts.length >= 3) {
        // Get hint for specific question: /questions/{id}/hint
        const questionId = pathParts[pathParts.length - 2];
        if (pathParts[pathParts.length - 1] === 'hint') {
          result = await handleGetHint(authHeader, questionId);
        } else {
          throw new Error('Invalid endpoint');
        }
      } else {
        // Get lesson quiz
        const quizId = action;
        const includeAnswers = url.searchParams.get('include_answers') === 'true';
        result = await handleGetLessonQuiz(quizId, includeAnswers);
      }
    } else if (req.method === 'POST') {
      const body = await req.json();
      
      if (action === 'generate') {
        // Generate quiz from content
        result = await handleGenerateQuizFromContent(authHeader, body);
      } else if (action === 'submit' && pathParts.length >= 2) {
        // Submit quiz
        const quizId = pathParts[pathParts.length - 2];
        result = await handleSubmitQuiz(authHeader, quizId, body);
      } else {
        throw new Error('Invalid endpoint');
      }
    } else {
      throw new Error('Method not allowed');
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'LESSON_QUIZ_ERROR',
        message: error.message,
      },
    }), {
      status: error.message.includes('not found') ? 404 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});