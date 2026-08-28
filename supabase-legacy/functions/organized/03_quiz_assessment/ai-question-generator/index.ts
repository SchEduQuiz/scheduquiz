// CORS headers for all edge functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// CORS headers
interface GenerateQuestionsRequest {
  lesson_id: string;
  lesson_content: string;
  lesson_title: string;
  num_questions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  question_types?: string[];
}

interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: { text: string; is_correct: boolean }[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: GenerateQuestionsRequest = await req.json();
    const {
      lesson_id,
      lesson_content,
      lesson_title,
      num_questions = 10,
      difficulty = 'mixed',
      question_types = ['multiple_choice', 'true_false']
    } = requestData;

    if (!lesson_content || !lesson_id) {
      return new Response(
        JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Missing required fields' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate questions using AI
    const generatedQuestions = await generateQuestionsWithAI({
      lesson_content,
      lesson_title,
      num_questions,
      difficulty,
      question_types
    });

    return new Response(
      JSON.stringify({
        data: {
          lesson_id,
          questions: generatedQuestions,
          total_generated: generatedQuestions.length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Question Generation Error:', error);
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'GENERATION_ERROR', 
          message: error.message || 'Failed to generate questions'
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateQuestionsWithAI(params: {
  lesson_content: string;
  lesson_title: string;
  num_questions: number;
  difficulty: string;
  question_types: string[];
}): Promise<GeneratedQuestion[]> {
  const { lesson_content, lesson_title, num_questions, difficulty, question_types } = params;

  // Get Google AI API key from environment
  const googleAiApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!googleAiApiKey) {
    console.warn('Google AI API key not configured, using fallback generator');
    return generateFallbackQuestions(lesson_title, num_questions, difficulty, question_types);
  }

  try {
    // Create a structured prompt for Google AI (Gemini)
    const systemPrompt = `You are an expert educational content creator specializing in creating high-quality quiz questions. Your questions should be:
- Clear and unambiguous
- Based strictly on the provided lesson content
- Appropriately challenging for the specified difficulty level
- Educationally valuable with detailed explanations

Always respond with valid JSON only, no additional text or markdown.`;

    const userPrompt = `Generate ${num_questions} quiz questions based on this lesson:

Lesson Title: ${lesson_title}

Lesson Content:
${lesson_content.substring(0, 4000)}

Requirements:
- Generate exactly ${num_questions} questions
- Question types to include: ${question_types.join(', ')}
- Difficulty level: ${difficulty}${difficulty === 'mixed' ? ' (distribute evenly across easy, medium, hard)' : ''}
- Each question must be directly answerable from the lesson content
- For multiple choice: provide 4 plausible options with only one correct answer
- For true/false: create clear, definitive statements
- For short answer: specify the expected answer precisely
- Provide detailed explanations referencing the lesson content

Return a JSON array with this exact structure:
[
  {
    "question_text": "The question text",
    "question_type": "multiple_choice" | "true_false" | "short_answer",
    "options": [
      {"text": "Option text", "is_correct": true/false}
    ],
    "correct_answer": "A/B/C/D for MC, true/false for T/F, or expected answer for short answer",
    "explanation": "Detailed explanation with reference to lesson content",
    "difficulty": "easy" | "medium" | "hard",
    "points": 5-15 based on difficulty
  }
]

Return ONLY the JSON array, no markdown formatting or additional text.`;

    // Call Google AI Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${googleAiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google AI API error:', errorData);
      
      // Check for rate limiting
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      }
      
      throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Invalid response format from Google AI API');
    }

    const content = data.candidates[0].content.parts[0].text;
    let parsedQuestions;
    
    try {
      // Try to parse the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedQuestions = JSON.parse(jsonMatch[0]);
      } else {
        // If responseMimeType worked, it should be a JSON object with array
        const parsed = JSON.parse(content);
        parsedQuestions = parsed.questions || parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse Google AI response:', content);
      throw new Error('Failed to parse AI-generated questions');
    }

    // Validate and normalize the questions
    const validatedQuestions: GeneratedQuestion[] = parsedQuestions.map((q: any, index: number) => {
      // Ensure all required fields exist
      if (!q.question_text || !q.question_type) {
        throw new Error(`Invalid question format at index ${index}`);
      }

      // Normalize difficulty
      let questionDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase())) {
        questionDifficulty = q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
      }

      // Calculate points based on difficulty
      const points = questionDifficulty === 'easy' ? 5 : questionDifficulty === 'medium' ? 10 : 15;

      // Validate question type
      const validTypes = ['multiple_choice', 'true_false', 'short_answer'];
      if (!validTypes.includes(q.question_type)) {
        throw new Error(`Invalid question type: ${q.question_type}`);
      }

      return {
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || undefined,
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || 'No explanation provided',
        difficulty: questionDifficulty,
        points: q.points || points
      };
    });

    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    console.log(`Successfully generated ${validatedQuestions.length} questions using Google AI Gemini`);
    return validatedQuestions;

  } catch (error) {
    console.error('Error calling Google AI API:', error);
    
    // Fallback to mock questions if OpenAI fails
    console.log('Falling back to generated questions due to API error');
    return generateFallbackQuestions(lesson_title, num_questions, difficulty, question_types);
  }
}

function generateFallbackQuestions(
  lessonTitle: string,
  numQuestions: number,
  difficulty: string,
  questionTypes: string[]
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  const difficulties: ('easy' | 'medium' | 'hard')[] = 
    difficulty === 'mixed' ? ['easy', 'medium', 'hard'] : [difficulty as 'easy' | 'medium' | 'hard'];
  
  for (let i = 0; i < numQuestions; i++) {
    const questionType = questionTypes[i % questionTypes.length];
    const difficultyLevel = difficulties[i % difficulties.length];
    
    if (questionType === 'multiple_choice') {
      questions.push({
        question_text: `Question ${i + 1}: What is a key concept discussed in "${lessonTitle}"?`,
        question_type: 'multiple_choice',
        options: [
          { text: 'Core Concept A - Main topic of the lesson', is_correct: true },
          { text: 'Related Concept B - Supporting material', is_correct: false },
          { text: 'Alternative Concept C - Different approach', is_correct: false },
          { text: 'Unrelated Concept D - Not covered in lesson', is_correct: false }
        ],
        correct_answer: 'A',
        explanation: `This question tests understanding of the core concepts in ${lessonTitle}. Please edit this question to match your specific lesson content for better accuracy.`,
        difficulty: difficultyLevel,
        points: difficultyLevel === 'easy' ? 5 : difficultyLevel === 'medium' ? 10 : 15
      });
    } else if (questionType === 'true_false') {
      questions.push({
        question_text: `Question ${i + 1}: The material covered in "${lessonTitle}" provides foundational knowledge for this subject area.`,
        question_type: 'true_false',
        options: [
          { text: 'True', is_correct: true },
          { text: 'False', is_correct: false }
        ],
        correct_answer: 'true',
        explanation: `This statement is generally true for educational content. Please edit this question to match your specific lesson content for accuracy.`,
        difficulty: difficultyLevel,
        points: difficultyLevel === 'easy' ? 5 : difficultyLevel === 'medium' ? 10 : 15
      });
    } else {
      questions.push({
        question_text: `Question ${i + 1}: Summarize the main takeaway from "${lessonTitle}" in your own words.`,
        question_type: 'short_answer',
        correct_answer: 'Students should identify and explain the primary learning objective of the lesson',
        explanation: `Students should demonstrate understanding of the main concepts presented in the lesson. Please edit this question to match your specific lesson content.`,
        difficulty: difficultyLevel,
        points: difficultyLevel === 'easy' ? 5 : difficultyLevel === 'medium' ? 10 : 15
      });
    }
  }
  
  console.log(`Generated ${questions.length} fallback questions (Google AI integration pending)`);
  return questions;
}
