// Shared Gemini AI Service for Essay Grading and Pre-submit Feedback
// Uses GEMINI_AI_API_KEY environment variable
// Note: Lesson quiz generation uses GOOGLE_AI_API_KEY in separate functions

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface GeminiError {
  message: string;
  status?: number;
  details?: any;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = Deno.env.get('GEMINI_AI_API_KEY') || '';
  }

  /**
   * Generate content using Gemini AI
   */
  async generateContent(prompt: string, options: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  } = {}): Promise<string> {
    const {
      model = 'gemini-1.5-flash-latest',
      temperature = 0.7,
      maxOutputTokens = 4000,
      responseMimeType = 'application/json'
    } = options;

    if (!this.apiKey) {
      throw new Error('Gemini AI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', response.status, errorData);
        
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again in a moment.');
        }
        
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate structured JSON content from Gemini
   */
  async generateJSON<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\n${prompt}\n\nAlways respond with valid JSON only.`
      : `${prompt}\n\nAlways respond with valid JSON only.`;

    try {
      const response = await this.generateContent(fullPrompt, {
        responseMimeType: 'application/json'
      });

      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON match, try parsing the entire response
      return JSON.parse(response);

    } catch (error) {
      console.error('Failed to parse Gemini JSON response:', error);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Generate text content from Gemini (non-JSON)
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\n${prompt}`
      : prompt;

    return this.generateContent(fullPrompt, {
      responseMimeType: 'text/plain'
    });
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get API key status
   */
  getStatus(): { configured: boolean; error?: string } {
    if (!this.apiKey) {
      return { configured: false, error: 'Gemini AI API key not found in environment variables' };
    }
    return { configured: true };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

// Utility functions for common AI operations
export const AIUtils = {
  /**
   * Create a structured prompt for essay grading
   */
  createEssayGradingPrompt(params: {
    essay: string;
    lessonContent: string;
    learningObjectives: string[];
    requirements: string;
    rubricConfig: any;
    wordCount: number;
  }): string {
    const { essay, lessonContent, learningObjectives, requirements, rubricConfig, wordCount } = params;

    return `You are an expert educational assessor specializing in essay evaluation. Grade the following essay based on the provided lesson content and assignment requirements.

ASSIGNMENT REQUIREMENTS:
${requirements}

LESSON CONTENT:
${lessonContent.substring(0, 3000)}

LEARNING OBJECTIVES:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

ESSAY TO GRADE:
${essay}

WORD COUNT: ${wordCount}

RUBRIC CRITERIA:
${Object.entries(rubricConfig).map(([key, criterion]: [string, any]) => 
  `${key.toUpperCase()} (${criterion.weight}% of total, ${criterion.max_points} points max):
  - Weight: ${criterion.weight}%
  - Max Points: ${criterion.max_points}
  - Instructions: ${criterion.ai_model_instructions}`
).join('\n\n')}

Evaluate the essay for each criterion and provide:
1. A score out of the maximum points for that criterion
2. Detailed feedback explaining the score
3. Specific evidence from the essay
4. Constructive suggestions for improvement

Respond with valid JSON in this exact format:
{
  "rubric_scores": {
    "content": {
      "score": number,
      "feedback": "detailed feedback",
      "evidence": ["specific evidence from essay"]
    },
    "grammar": {
      "score": number,
      "feedback": "detailed feedback",
      "issues": ["specific grammar issues found"]
    },
    "coherence": {
      "score": number,
      "feedback": "detailed feedback",
      "analysis": ["coherence observations"]
    },
    "relevance": {
      "score": number,
      "feedback": "detailed feedback",
      "alignment": ["relevance observations"]
    }
  },
  "ai_summary": "Overall assessment summary",
  "suggestions": [
    {
      "area": "content|grammar|coherence|relevance",
      "suggestion": "specific improvement suggestion",
      "priority": "high|medium|low"
    }
  ],
  "improvement_areas": ["area1", "area2"],
  "confidence_score": 0.85
}

Provide accurate, constructive, and educational feedback that helps students improve their writing.`;
  },

  /**
   * Create a prompt for pre-submit feedback
   */
  createPreSubmitFeedbackPrompt(params: {
    draft: string;
    lessonContent: string;
    learningObjectives: string[];
    requirements: string;
    wordLimits?: { min?: number; max?: number };
  }): string {
    const { draft, lessonContent, learningObjectives, requirements, wordLimits } = params;

    return `You are a helpful writing assistant providing pre-submit feedback to help students improve their essays before final submission.

ASSIGNMENT REQUIREMENTS:
${requirements}

LESSON CONTENT (for context):
${lessonContent.substring(0, 2500)}

LEARNING OBJECTIVES:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

DRAFT TO REVIEW:
${draft}

${wordLimits ? `WORD COUNT LIMITS: ${wordLimits.min || 'No minimum'} - ${wordLimits.max || 'No maximum'} words` : ''}

Provide encouraging, constructive feedback to help the student improve their writing before submission. Focus on:

1. CONTENT: How well does the draft address the lesson content and learning objectives?
2. GRAMMAR: Grammar, punctuation, and mechanical issues
3. COHERENCE: Organization, flow, and logical structure
4. RELEVANCE: How well does it stay on topic and meet requirements?

Respond with valid JSON in this format:
{
  "overall_score": 75,
  "word_count": ${draft.split(/\s+/).length},
  "feedback_sections": {
    "content": {
      "score": 15,
      "feedback": "encouraging feedback",
      "suggestions": ["specific suggestion 1", "suggestion 2"]
    },
    "grammar": {
      "score": 22,
      "feedback": "constructive feedback",
      "suggestions": ["grammar suggestion 1", "suggestion 2"]
    },
    "coherence": {
      "score": 20,
      "feedback": "organization feedback",
      "suggestions": ["coherence suggestion 1", "suggestion 2"]
    },
    "relevance": {
      "score": 18,
      "feedback": "relevance feedback",
      "suggestions": ["relevance suggestion 1", "suggestion 2"]
    }
  },
  "general_suggestions": [
    "overall suggestion 1",
    "overall suggestion 2"
  ],
  "priority_improvements": [
    "highest priority area",
    "second priority area"
  ],
  "confidence_level": 0.80
}

Be supportive and specific in your feedback. Students should feel encouraged to improve their work.`;
  },

  /**
   * Extract JSON from Gemini response
   */
  extractJSON(response: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no match, try parsing entire response
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to extract JSON from response:', response);
      throw new Error('Invalid JSON response from AI');
    }
  }
};