// Inline CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Enhanced Quiz Gamification Processor
// Handles: Points calculation, streaks, achievements, leaderboards, analytics

// Utility: Verify JWT token
async function verifyToken(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error('Token expired');
    
    if (!payload.sub || !payload.aud) throw new Error('Invalid token structure');
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
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

// Calculate sophisticated points
function calculatePoints(
  question: any,
  userAnswer: string,
  timeTaken: number,
  currentStreak: number
): { basePoints: number; timeBonus: number; streakBonus: number; totalPoints: number; isCorrect: boolean } {
  const isCorrect = question.correct_answer === userAnswer;
  
  if (!isCorrect) {
    return { basePoints: 0, timeBonus: 0, streakBonus: 0, totalPoints: 0, isCorrect: false };
  }
  
  // Base points from question
  const basePoints = question.points || 10;
  
  // Time bonus calculation (faster = more bonus)
  // Max 5 bonus points for answering in first 25% of time limit
  const timeLimit = (question.time_limit || 30) * 1000; // Convert to ms
  const timeRatio = timeTaken / timeLimit;
  let timeBonus = 0;
  
  if (timeRatio <= 0.25) {
    timeBonus = 5; // Super fast
  } else if (timeRatio <= 0.50) {
    timeBonus = 3; // Fast
  } else if (timeRatio <= 0.75) {
    timeBonus = 1; // Moderate
  }
  
  // Difficulty multiplier
  const difficultyMultipliers: { [key: string]: number } = {
    'easy': 1,
    'medium': 1.5,
    'hard': 2
  };
  const multiplier = difficultyMultipliers[question.difficulty || 'medium'];
  
  // Streak bonus (10% bonus per streak, max 50%)
  const streakMultiplier = Math.min(1 + (currentStreak * 0.1), 1.5);
  const streakBonus = Math.floor(basePoints * (streakMultiplier - 1));
  
  // Calculate total with all bonuses
  const totalPoints = Math.floor((basePoints + timeBonus) * multiplier + streakBonus);
  
  return { basePoints, timeBonus, streakBonus, totalPoints, isCorrect };
}

// Check and award achievements
async function checkAchievements(
  userId: string,
  quizResult: any
): Promise<string[]> {
  const achievements: string[] = [];
  
  // Perfect score achievement
  if (quizResult.percentage === 100) {
    achievements.push('perfect_score');
    await dbFetch('/rest/v1/user_achievements', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        achievement_type: 'perfect_score',
        achievement_name: 'Perfect Score',
        achievement_description: 'Answered all questions correctly',
        achievement_data: { quiz_id: quizResult.quiz_id, category: quizResult.category },
        points_awarded: 50,
        icon: 'trophy'
      })
    });
  }
  
  // Speed demon (average < 10 seconds per question)
  const avgTime = quizResult.time_taken / quizResult.total_questions;
  if (avgTime < 10) {
    achievements.push('speed_demon');
    await dbFetch('/rest/v1/user_achievements', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        achievement_type: 'speed_demon',
        achievement_name: 'Speed Demon',
        achievement_description: 'Completed quiz with exceptional speed',
        achievement_data: { avg_time: avgTime, quiz_id: quizResult.quiz_id },
        points_awarded: 30,
        icon: 'zap'
      })
    });
  }
  
  // High score (>= 90%)
  if (quizResult.percentage >= 90) {
    achievements.push('high_achiever');
    await dbFetch('/rest/v1/user_achievements', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        achievement_type: 'high_achiever',
        achievement_name: 'High Achiever',
        achievement_description: 'Scored 90% or higher',
        achievement_data: { percentage: quizResult.percentage, quiz_id: quizResult.quiz_id },
        points_awarded: 20,
        icon: 'star'
      })
    });
  }
  
  return achievements;
}

// Update user points and streak
async function updateUserPoints(
  userId: string,
  pointsEarned: number,
  wasCorrect: boolean
): Promise<{ newStreak: number; totalPoints: number }> {
  // Get current user points
  const pointsResponse = await dbFetch(`/rest/v1/user_points?user_id=eq.${userId}&select=*`);
  const pointsData = await pointsResponse.json();
  
  let currentStreak = 0;
  let totalPoints = 0;
  let longestStreak = 0;
  let currentLevel = 1;
  
  if (pointsData && pointsData.length > 0) {
    const userPoints = pointsData[0];
    currentStreak = userPoints.streak_count || 0;
    totalPoints = userPoints.total_points || 0;
    longestStreak = userPoints.longest_streak || 0;
    currentLevel = userPoints.current_level || 1;
    
    // Check if last quiz was today (maintain streak)
    const lastQuizDate = userPoints.last_quiz_date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastQuizDate) {
      const lastDate = new Date(lastQuizDate);
      const isSameDay = lastDate.toDateString() === today.toDateString();
      const isYesterday = lastDate.toDateString() === yesterday.toDateString();
      
      if (isSameDay) {
        // Same day, don't increment streak
      } else if (isYesterday) {
        // Consecutive day, increment streak
        currentStreak += 1;
      } else {
        // Streak broken, reset
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    
    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
    
    // Add points
    totalPoints += pointsEarned;
    
    // Calculate level (every 1000 points = 1 level)
    currentLevel = Math.floor(totalPoints / 1000) + 1;
    
    // Update user points
    await dbFetch(`/rest/v1/user_points?user_id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        total_points: totalPoints,
        streak_count: currentStreak,
        longest_streak: longestStreak,
        current_level: currentLevel,
        last_quiz_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
  } else {
    // Create new user points entry
    totalPoints = pointsEarned;
    currentStreak = 1;
    longestStreak = 1;
    currentLevel = 1;
    
    await dbFetch('/rest/v1/user_points', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        total_points: totalPoints,
        streak_count: currentStreak,
        longest_streak: longestStreak,
        current_level: currentLevel,
        last_quiz_date: new Date().toISOString()
      })
    });
  }
  
  return { newStreak: currentStreak, totalPoints };
}

// Update leaderboard
async function updateLeaderboard(
  userId: string,
  userName: string,
  quizResult: any,
  category: string
): Promise<void> {
  // Get current leaderboard entry
  const leaderboardResponse = await dbFetch(
    `/rest/v1/user_leaderboard_entries?user_id=eq.${userId}&category=eq.${category}`
  );
  const leaderboardData = await leaderboardResponse.json();
  
  if (leaderboardData && leaderboardData.length > 0) {
    const entry = leaderboardData[0];
    
    // Update statistics
    const newGamesPlayed = entry.games_played + 1;
    const newTotalScore = entry.total_score + quizResult.score;
    const newAverageAccuracy = ((entry.average_accuracy * entry.games_played) + quizResult.percentage) / newGamesPlayed;
    const newTotalTimeSpent = entry.total_time_spent + quizResult.time_taken;
    const newPerfectScores = entry.perfect_scores + (quizResult.percentage === 100 ? 1 : 0);
    
    await dbFetch(`/rest/v1/user_leaderboard_entries?id=eq.${entry.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        total_score: newTotalScore,
        games_played: newGamesPlayed,
        average_accuracy: newAverageAccuracy,
        total_time_spent: newTotalTimeSpent,
        perfect_scores: newPerfectScores,
        updated_at: new Date().toISOString()
      })
    });
  } else {
    // Create new leaderboard entry
    await dbFetch('/rest/v1/user_leaderboard_entries', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        user_name: userName,
        total_score: quizResult.score,
        games_played: 1,
        average_accuracy: quizResult.percentage,
        total_time_spent: quizResult.time_taken,
        perfect_scores: quizResult.percentage === 100 ? 1 : 0,
        category: category
      })
    });
  }
}

// Update quiz analytics
async function updateAnalytics(
  userId: string,
  quizId: number,
  quizResult: any,
  category: string
): Promise<void> {
  // Get current analytics
  const analyticsResponse = await dbFetch(
    `/rest/v1/quiz_analytics?user_id=eq.${userId}&quiz_id=eq.${quizId}`
  );
  const analyticsData = await analyticsResponse.json();
  
  if (analyticsData && analyticsData.length > 0) {
    const analytics = analyticsData[0];
    
    const newAttempts = analytics.total_attempts + 1;
    const newBestScore = Math.max(analytics.best_score, quizResult.score);
    const newBestPercentage = Math.max(analytics.best_percentage, quizResult.percentage);
    const newAverageScore = ((analytics.average_score * analytics.total_attempts) + quizResult.score) / newAttempts;
    const newAverageTime = Math.floor(((analytics.average_time * analytics.total_attempts) + quizResult.time_taken) / newAttempts);
    const newTotalCorrect = analytics.total_correct + quizResult.correct_answers;
    const newTotalQuestions = analytics.total_questions + quizResult.total_questions;
    
    // Calculate improvement rate
    const improvementRate = newBestScore > analytics.best_score 
      ? ((newBestScore - analytics.best_score) / analytics.best_score) * 100 
      : 0;
    
    await dbFetch(`/rest/v1/quiz_analytics?id=eq.${analytics.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        total_attempts: newAttempts,
        best_score: newBestScore,
        best_percentage: newBestPercentage,
        average_score: newAverageScore,
        average_time: newAverageTime,
        total_correct: newTotalCorrect,
        total_questions: newTotalQuestions,
        improvement_rate: improvementRate,
        last_attempt_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
  } else {
    // Create new analytics entry
    await dbFetch('/rest/v1/quiz_analytics', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        quiz_id: quizId,
        category: category,
        total_attempts: 1,
        best_score: quizResult.score,
        best_percentage: quizResult.percentage,
        average_score: quizResult.score,
        average_time: quizResult.time_taken,
        total_correct: quizResult.correct_answers,
        total_questions: quizResult.total_questions,
        improvement_rate: 0,
        last_attempt_date: new Date().toISOString()
      })
    });
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);
    const userId = payload.sub;

    const body = await req.json();
    const { quiz_id, quiz_result, questions, category, user_name } = body;

    if (!quiz_id || !quiz_result || !questions) {
      throw new Error('Missing required parameters');
    }

    // Validate quiz_result structure
    if (!quiz_result.responses || !Array.isArray(quiz_result.responses)) {
      throw new Error('Invalid quiz_result structure: responses array required');
    }

    // Validate questions is an array
    if (!Array.isArray(questions)) {
      throw new Error('Invalid questions structure: array required');
    }

    // Save quiz score to quiz_scores table
    const scoreResponse = await dbFetch('/rest/v1/quiz_scores', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        quiz_id: parseInt(quiz_id),
        score: quiz_result.score,
        max_score: quiz_result.max_score,
        percentage: quiz_result.percentage,
        time_taken: quiz_result.time_taken,
        correct_answers: quiz_result.correct_answers,
        total_questions: quiz_result.total_questions,
        hints_used: quiz_result.hints_used || 0,
        hint_penalty: quiz_result.hint_penalty || 0,
        time_bonus: quiz_result.time_bonus || 0,
        game_mode: 'challenge',
        is_completed: true
      })
    });

    if (!scoreResponse.ok) {
      const errorText = await scoreResponse.text();
      console.error('Failed to save score:', errorText);
      throw new Error(`Failed to save score: ${errorText}`);
    }

    const scoreData = await scoreResponse.json();
    if (!scoreData || scoreData.length === 0 || !scoreData[0].id) {
      console.error('Score insert returned no data:', scoreData);
      throw new Error('Score insert failed: no ID returned');
    }
    const scoreId = scoreData[0].id;

    // Save individual question responses
    let currentStreak = 0;
    for (let i = 0; i < quiz_result.responses.length; i++) {
      const response = quiz_result.responses[i];
      const question = questions[i];
      
      if (!response) {
        console.error(`Response at index ${i} is undefined`);
        continue;
      }
      
      if (!question) {
        console.warn(`Question at index ${i} is undefined, using defaults`);
      }
      
      if (response.is_correct) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }

      const responseInsert = await dbFetch('/rest/v1/quiz_question_responses', {
        method: 'POST',
        body: JSON.stringify({
          result_id: scoreId,
          user_id: userId,
          quiz_id: parseInt(quiz_id),
          question_id: response.question_id,
          selected_answer: response.user_answer,
          correct_answer: response.correct_answer,
          is_correct: response.is_correct,
          time_taken: response.response_time || 0,
          points_earned: response.points_earned || 0,
          time_bonus: response.time_bonus || 0,
          streak_bonus: 0,
          difficulty: question?.difficulty || 'medium'
        })
      });

      if (!responseInsert.ok) {
        const errorText = await responseInsert.text();
        console.error(`Failed to save response ${i}:`, errorText);
        // Continue with other responses
      }
    }

    // Update user points and streak
    const pointsUpdate = await updateUserPoints(userId, quiz_result.score, quiz_result.correct_answers > 0);

    // Check and award achievements
    const achievements = await checkAchievements(userId, {
      ...quiz_result,
      quiz_id,
      category
    });

    // Update leaderboard
    await updateLeaderboard(userId, user_name, quiz_result, category);

    // Update analytics
    await updateAnalytics(userId, parseInt(quiz_id), quiz_result, category);

    return new Response(JSON.stringify({
      data: {
        score_id: scoreId,
        new_streak: pointsUpdate.newStreak,
        total_points: pointsUpdate.totalPoints,
        achievements_unlocked: achievements,
        message: 'Quiz results processed successfully'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
