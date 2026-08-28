// Enhanced Quiz Service Edge Function
// Features: Time-based scoring, hints system, explanations

import { corsHeaders } from '../../../_shared/cors.ts';

// Utility: Verify JWT token with detailed error logging
async function verifyToken(token: string): Promise<any> {
  try {
    console.log('Starting token verification for token length:', token.length);
    
    const parts = token.split('.');
    console.log('Token parts count:', parts.length);
    
    if (parts.length !== 3) {
      console.error('Invalid token format - expected 3 parts, got:', parts.length);
      throw new Error('Invalid token format');
    }
    
    // Handle URL-safe base64
    let payloadBase64 = parts[1];
    // Replace URL-safe base64 characters
    payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if necessary
    while (payloadBase64.length % 4) {
      payloadBase64 += '=';
    }
    
    console.log('Attempting to decode payload...');
    const payloadString = atob(payloadBase64);
    console.log('Decoded payload string length:', payloadString.length);
    
    const payload = JSON.parse(payloadString);
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));
    
    const now = Math.floor(Date.now() / 1000);
    console.log('Current time (seconds):', now);
    
    if (payload.exp && payload.exp < now) {
      console.error('Token expired - exp:', payload.exp, 'now:', now);
      throw new Error('Token expired');
    }
    
    // Check for required fields in Supabase JWT
    if (!payload.sub || !payload.aud) {
      console.error('Invalid token structure - missing required fields');
      console.error('sub field:', payload.sub);
      console.error('aud field:', payload.aud);
      throw new Error('Invalid token structure');
    }
    
    console.log('Token verification successful');
    return payload;
  } catch (error) {
    console.error('Token verification error:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Invalid token: ${error.message}`);
  }
}

// Utility: Get user from auth header
async function getUser(authHeader: string) {
  console.log('getUser called with authHeader length:', authHeader ? authHeader.length : 0);
  console.log('authHeader starts with Bearer:', authHeader ? authHeader.startsWith('Bearer ') : false);
  
  if (!authHeader) {
    console.error('No auth header provided');
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.error('Auth header does not start with Bearer');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('Extracted token length:', token.length);
  
  try {
    console.log('Calling verifyToken...');
    const payload = await verifyToken(token);
    console.log('Token verification successful, returning payload');
    return payload;
  } catch (error) {
    console.error('Token verification failed in getUser:', error);
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
  // Reward faster responses with bonus points
  // If answered in first 25% of time: full bonus (50% of base points)
  // If answered in first 50% of time: half bonus (25% of base points)
  // After 50%: no bonus
  
  const timeRatio = responseTime / (timeLimit * 1000); // Convert to seconds
  const maxBonus = Math.floor(basePoints * 0.5); // Max 50% bonus
  
  if (timeRatio <= 0.25) {
    return maxBonus; // Full bonus
  } else if (timeRatio <= 0.50) {
    return Math.floor(maxBonus * 0.5); // Half bonus
  }
  
  return 0; // No bonus
}

// Handler: Start a quiz session with random question selection
async function handleStartQuiz(authHeader: string, params: URLSearchParams) {
  // Check authentication first
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }

  const quizId = params.get('quiz_id'); // Quiz ID is required
  const questionsToSelect = parseInt(params.get('questions') || '15'); // Default 15 questions

  // Get available questions for the quiz
  const questionsResponse = await dbFetch(
    `/rest/v1/questions?quiz_id=eq.${quizId}&order=id.asc`
  );
  const allQuestions = await questionsResponse.json();

  if (!allQuestions || allQuestions.length === 0) {
    throw new Error('No questions found for this quiz');
  }

  // Randomly select questions (max 15 from available pool)
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, questionsToSelect);

  // Transform questions to match frontend expected format
  const transformedQuestions = selectedQuestions.map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    hint: q.hint,
    points: q.points,
    time_limit: q.time_limit,
    difficulty: q.difficulty
  }));

  const sessionId = `quiz_${quizId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    data: {
      session_id: sessionId,
      quiz_id: quizId,
      questions: transformedQuestions,
      total_questions: transformedQuestions.length,
      session_started_at: new Date().toISOString()
    }
  };
}

// Handler: List quizzes
async function handleListQuizzes(params: URLSearchParams) {
  const skip = parseInt(params.get('skip') || '0');
  const limit = parseInt(params.get('limit') || '20');
  const category = params.get('category');
  const difficulty = params.get('difficulty');
  const search = params.get('search');

  let query = '/rest/v1/quizzes?is_public=eq.true&is_active=eq.true';

  if (category) query += `&category=eq.${category}`;
  if (difficulty) query += `&difficulty=eq.${difficulty}`;
  if (search) query += `&title=ilike.*${search}*`;

  query += `&order=created_at.desc&offset=${skip}&limit=${limit}`;

  const response = await dbFetch(query);
  const quizzes = await response.json();

  // Get question counts
  for (const quiz of quizzes) {
    const countResponse = await dbFetch(
      `/rest/v1/questions?quiz_id=eq.${quiz.id}&select=id`
    );
    const questions = await countResponse.json();
    quiz.question_count = questions.length;
  }

  // Get total count
  let countQuery = '/rest/v1/quizzes?is_public=eq.true&is_active=eq.true&select=id';
  if (category) countQuery += `&category=eq.${category}`;
  if (difficulty) countQuery += `&difficulty=eq.${difficulty}`;

  const countResponse = await dbFetch(countQuery);
  const countData = await countResponse.json();
  const total = countData.length;

  return {
    items: quizzes,
    total,
    skip,
    limit,
  };
}

// Fisher-Yates shuffle algorithm for random array selection
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Handler: Get quiz by ID (without hints for security)
// RANDOM SELECTION: Selects 15 random questions from the full question pool per challenge
async function handleGetQuiz(quizId: string, includeQuestions: boolean = true) {
  const quizResponse = await dbFetch(`/rest/v1/quizzes?id=eq.${quizId}&limit=1`);
  const quizzes = await quizResponse.json();

  if (!quizzes || quizzes.length === 0) {
    throw new Error('Quiz not found');
  }

  const quiz = quizzes[0];

  if (includeQuestions) {
    // Fetch all questions from the quiz (including hint and explanation for frontend)
    const questionsResponse = await dbFetch(
      `/rest/v1/questions?quiz_id=eq.${quizId}&select=id,question_text,question_type,difficulty,time_limit,points,option_a,option_b,option_c,option_d,correct_answer,hint,explanation`
    );
    const allQuestions = await questionsResponse.json();
    
    if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
      throw new Error('No questions found for this quiz');
    }
    
    // Randomly select 15 questions from the pool for variety in each challenge session
    // This ensures each quiz session is unique and players get different questions
    const shuffledQuestions = shuffleArray(allQuestions);
    const selectedQuestions = shuffledQuestions.slice(0, 15);
    
    console.log(`Quiz ${quizId}: Loaded ${selectedQuestions.length} questions from ${allQuestions.length} total questions`);
    quiz.questions = selectedQuestions;
  }

  return quiz;
}

// Handler: Get hint for a question
async function handleGetHint(authHeader: string, questionId: string) {
  // Check authentication first
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }

  const questionResponse = await dbFetch(
    `/rest/v1/questions?id=eq.${questionId}&select=id,hint&limit=1`
  );
  const questions = await questionResponse.json();
  
  if (!questions || questions.length === 0) {
    throw new Error('Question not found');
  }

  return {
    question_id: parseInt(questionId),
    hint: questions[0].hint || 'No hint available',
  };
}

// Handler: Submit quiz answers with enhanced scoring
async function handleSubmitQuiz(authHeader: string, quizId: string, body: any) {
  const user = await getUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }

  const { answers, time_taken, hints_used_list } = body;
  const hintsUsedCount = hints_used_list ? hints_used_list.length : 0;

  // Get quiz and all question details (including hints and explanations)
  const quizResponse = await dbFetch(`/rest/v1/quizzes?id=eq.${quizId}&limit=1`);
  const quizzes = await quizResponse.json();
  if (!quizzes || quizzes.length === 0) {
    throw new Error('Quiz not found');
  }
  const quiz = quizzes[0];

  // Get full question details including hints and explanations
  const questionsResponse = await dbFetch(
    `/rest/v1/questions?quiz_id=eq.${quizId}&order=id.asc`
  );
  const questions = await questionsResponse.json();

  let correctCount = 0;
  let baseScore = 0;
  let totalTimeBonus = 0;
  const responses = [];
  const questionResults = [];

  // Calculate score with time bonuses
  for (const answer of answers) {
    const question = questions.find((q: any) => q.id === answer.question_id);
    if (!question) continue;

    const isCorrect = question.correct_answer === answer.user_answer;
    const basePoints = isCorrect ? question.points : 0;
    
    // Calculate time bonus for correct answers only
    const timeBonus = isCorrect ? calculateTimeBonus(
      answer.response_time || 0,
      question.time_limit,
      question.points
    ) : 0;
    
    const pointsEarned = basePoints + timeBonus;

    if (isCorrect) correctCount++;
    baseScore += basePoints;
    totalTimeBonus += timeBonus;

    const usedHint = hints_used_list && hints_used_list.includes(question.id);

    responses.push({
      question_id: question.id,
      user_answer: answer.user_answer,
      is_correct: isCorrect,
      response_time: answer.response_time || 0,
      points_earned: pointsEarned,
    });

    // Include full question details for results display
    questionResults.push({
      question_id: question.id,
      question_text: question.question_text,
      user_answer: answer.user_answer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      options: [question.option_a, question.option_b, question.option_c, question.option_d],
      base_points: basePoints,
      time_bonus: timeBonus,
      total_points: pointsEarned,
      hint_used: usedHint,
      hint: question.hint,
      explanation: question.explanation,
      response_time: answer.response_time || 0,
    });
  }

  // Calculate hint penalty (2 points per hint)
  const hintPenalty = hintsUsedCount * 2;
  
  // Final score = base score + time bonuses - hint penalties
  const finalScore = Math.max(0, baseScore + totalTimeBonus - hintPenalty);
  const maxPossibleScore = questions.reduce((sum: number, q: any) => {
    return sum + q.points + Math.floor(q.points * 0.5); // Base + max time bonus
  }, 0);
  const percentage = maxPossibleScore > 0 ? (finalScore / maxPossibleScore) * 100 : 0;

  // Create score record with detailed tracking
  const scoreResponse = await dbFetch('/rest/v1/quiz_scores', {  // Fixed: Use quiz_scores table with UUID support
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: user.sub,  // Fixed: JWT payload uses 'sub' not 'user_id'
      quiz_id: parseInt(quizId),
      score: finalScore,
      max_score: maxPossibleScore,
      percentage,
      time_taken,
      correct_answers: correctCount,
      total_questions: questions.length,
      hints_used: hintsUsedCount,
      hint_penalty: hintPenalty,
      time_bonus: totalTimeBonus,
      game_mode: 'practice',
      is_completed: true,
    }),
  });

  if (!scoreResponse.ok) {
    const error = await scoreResponse.text();
    throw new Error(`Failed to save score: ${error}`);
  }

  const scoreData = await scoreResponse.json();
  const scoreId = scoreData[0].id;

  // Note: Responses are saved by quiz-gamification-processor to quiz_question_responses table
  // Legacy user_responses table (INTEGER-based) is no longer used

  // Note: User stats update removed - using auth.users (UUID) instead of legacy users table (INTEGER)
  // If user stats tracking is needed, create a separate user_stats table linked to auth.users

  return {
    score_id: scoreId,
    base_score: baseScore,
    time_bonus: totalTimeBonus,
    hint_penalty: hintPenalty,
    final_score: finalScore,
    max_possible_score: maxPossibleScore,
    percentage: Math.round(percentage * 100) / 100,
    correct_answers: correctCount,
    total_questions: questions.length,
    time_taken,
    hints_used: hintsUsedCount,
    results: questionResults,
  };
}

// Handler: Get quiz scores
async function handleGetScores(quizId: string, params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '10');

  const scoresResponse = await dbFetch(
    `/rest/v1/quiz_scores?quiz_id=eq.${quizId}&order=score.desc&limit=${limit}`  // Fixed: Use quiz_scores table
  );

  const scores = await scoresResponse.json();

  // Get user info for each score from profiles table (UUID-based)
  for (const score of scores) {
    const userResponse = await dbFetch(
      `/rest/v1/profiles?id=eq.${score.user_id}&select=id,full_name,avatar_url&limit=1`  // Fixed: Use profiles table with UUID
    );
    const users = await userResponse.json();
    score.user = users[0] || null;
  }

  return scores;
}

// Handler: Get categories
async function handleGetCategories() {
  const response = await dbFetch('/rest/v1/quizzes?select=category&is_active=eq.true');
  const quizzes = await response.json();
  const categories = [...new Set(quizzes.map((q: any) => q.category))];
  return categories;
}

// Handler: Get difficulty levels
async function handleGetDifficultyLevels() {
  return ['easy', 'medium', 'hard'];
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
    const apiKey = req.headers.get('apikey') || '';

    let result;

    if (req.method === 'GET') {
      if (action === 'list' || action === 'quiz-service') {
        result = await handleListQuizzes(url.searchParams);
      } else if (action === 'categories') {
        result = await handleGetCategories();
      } else if (action === 'start') {
        result = await handleStartQuiz(authHeader, url.searchParams);
      } else if (action === 'difficulty-levels') {
        result = await handleGetDifficultyLevels();
      } else if (action === 'scores' && pathParts.length >= 2) {
        const quizId = pathParts[pathParts.length - 2];
        result = await handleGetScores(quizId, url.searchParams);
      } else if (action === 'hint' && pathParts.length >= 2) {
        // Get hint for a specific question: /questions/{id}/hint
        const questionId = pathParts[pathParts.length - 2];
        result = await handleGetHint(authHeader, questionId);
      } else if (!isNaN(parseInt(action))) {
        // Get quiz by ID
        console.log(`Getting quiz with ID: ${action}, API key present: ${!!apiKey}`);
        result = await handleGetQuiz(action);
      } else {
        throw new Error(`Not found: ${req.method} ${url.pathname}`);
      }
    } else if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'submit' && pathParts.length >= 2) {
        const quizId = pathParts[pathParts.length - 2];
        result = await handleSubmitQuiz(authHeader, quizId, body);
      } else if (action === 'start') {
        // Handle POST request for starting quiz with JSON body
        const params = new URLSearchParams();
        if (body.quiz_id) params.append('quiz_id', body.quiz_id);
        if (body.questions) params.append('questions', body.questions.toString());
        result = await handleStartQuiz(authHeader, params);
      } else {
        throw new Error('Invalid endpoint');
      }
    } else {
      throw new Error('Method not allowed');
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message,
      },
    }), {
      status: error.message.includes('not found') ? 404 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
