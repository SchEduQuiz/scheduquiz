// AI Essay Grading Edge Function (Updated with Gemini API)
// Purpose: Grade essay assignments using AI with lesson-based rubrics

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { geminiService, AIUtils } from '../_shared/gemini.ts'

interface AIGradingRequest {
  submission_id: string
  assignment_id: string
  draft_text: string
  word_count: number
}

interface GradingResult {
  rubric_scores: {
    content: { score: number; feedback: string; evidence: string[] }
    grammar: { score: number; feedback: string; issues: string[] }
    coherence: { score: number; feedback: string; analysis: string[] }
    relevance: { score: number; feedback: string; alignment: string[] }
  }
  ai_summary: string
  suggestions: Array<{
    area: string
    suggestion: string
    priority: string
  }>
  improvement_areas: string[]
  confidence_score: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract parameters from request body
    const { submission_id, assignment_id, draft_text, word_count }: AIGradingRequest = await req.json()

    if (!submission_id || !assignment_id || !draft_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // Get assignment details with lesson content
    const { data: assignment, error: assignmentError } = await supabaseClient
      .from('assignments')
      .select(`
        id,
        title,
        description,
        requirements,
        lesson_id,
        ai_rubric_config,
        word_limit_min,
        word_limit_max,
        lessons!inner(
          id,
          title,
          content,
          learning_objectives
        )
      `)
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return new Response(
        JSON.stringify({ error: 'Assignment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get lesson content and learning objectives
    const lessonContent = assignment.lessons?.content || ''
    const learningObjectives = assignment.lessons?.learning_objectives || []

    // Get AI rubric configuration (use default if not configured)
    let rubricConfig = assignment.ai_rubric_config
    if (!rubricConfig || Object.keys(rubricConfig).length === 0) {
      const { data: defaultRubric } = await supabaseClient
        .rpc('create_default_ai_rubric', { assignment_id })
      
      if (defaultRubric) {
        rubricConfig = defaultRubric
      } else {
        // Fallback to hardcoded default
        rubricConfig = {
          content: { weight: 20, max_points: 20, ai_model_instructions: "Evaluate content quality based on lesson learning objectives." },
          grammar: { weight: 30, max_points: 30, ai_model_instructions: "Assess mechanical writing quality including grammar and clarity." },
          coherence: { weight: 30, max_points: 30, ai_model_instructions: "Evaluate organizational structure and logical flow of ideas." },
          relevance: { weight: 20, max_points: 20, ai_model_instructions: "Compare response against lesson content and assignment requirements." }
        }
      }
    }

    // Generate AI grading using Gemini
    const gradingResult = await performAIGrading({
      essay: draft_text,
      lessonContent,
      learningObjectives: learningObjectives.map(obj => obj.title || obj),
      rubricConfig,
      assignmentRequirements: assignment.requirements || '',
      wordCount: word_count
    })

    const processingTime = Date.now() - startTime

    // Calculate weighted scores
    const contentScore = (gradingResult.rubric_scores.content.score / rubricConfig.content.max_points) * rubricConfig.content.weight
    const grammarScore = (gradingResult.rubric_scores.grammar.score / rubricConfig.grammar.max_points) * rubricConfig.grammar.weight
    const coherenceScore = (gradingResult.rubric_scores.coherence.score / rubricConfig.coherence.max_points) * rubricConfig.coherence.weight
    const relevanceScore = (gradingResult.rubric_scores.relevance.score / rubricConfig.relevance.max_points) * rubricConfig.relevance.weight

    const totalScore = contentScore + grammarScore + coherenceScore + relevanceScore
    const totalPossible = rubricConfig.content.weight + rubricConfig.grammar.weight + rubricConfig.coherence.weight + rubricConfig.relevance.weight

    // Save AI grading results to database
    const aiGradingData = {
      submission_id,
      assignment_id,
      ai_overall_score: Math.round(totalScore * 100) / 100,
      ai_total_possible: totalPossible,
      ai_confidence_score: gradingResult.confidence_score,
      ai_processing_time_ms: processingTime,
      
      content_score: gradingResult.rubric_scores.content.score,
      content_feedback: gradingResult.rubric_scores.content.feedback,
      content_evidence: gradingResult.rubric_scores.content.evidence,
      
      grammar_score: gradingResult.rubric_scores.grammar.score,
      grammar_feedback: gradingResult.rubric_scores.grammar.feedback,
      grammar_issues: gradingResult.rubric_scores.grammar.issues,
      
      coherence_score: gradingResult.rubric_scores.coherence.score,
      coherence_feedback: gradingResult.rubric_scores.coherence.feedback,
      coherence_analysis: gradingResult.rubric_scores.coherence.analysis,
      
      relevance_score: gradingResult.rubric_scores.relevance.score,
      relevance_feedback: gradingResult.rubric_scores.relevance.feedback,
      relevance_alignment: gradingResult.rubric_scores.relevance.alignment,
      
      ai_summary_feedback: gradingResult.ai_summary,
      ai_specific_suggestions: gradingResult.suggestions,
      ai_improvement_areas: gradingResult.improvement_areas,
      
      ai_model_version: 'gemini-1.5-flash-latest',
      processing_timestamp: new Date().toISOString()
    }

    const { data: savedResult, error: saveError } = await supabaseClient
      .from('ai_grading_results')
      .insert(aiGradingData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving AI grading results:', saveError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          grading_result: {
            ...gradingResult,
            overall_score: Math.round(totalScore * 100) / 100,
            total_possible: totalPossible
          },
          processing_time_ms: processingTime,
          saved_result: savedResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('AI Grading Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'AI grading failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// AI Grading Implementation using Gemini
async function performAIGrading(params: {
  essay: string
  lessonContent: string
  learningObjectives: string[]
  rubricConfig: any
  assignmentRequirements: string
  wordCount: number
}): Promise<GradingResult> {
  const { essay, lessonContent, learningObjectives, rubricConfig, assignmentRequirements, wordCount } = params

  try {
    // Check if Gemini API is configured
    const apiStatus = geminiService.getStatus()
    if (!apiStatus.configured) {
      console.warn('Gemini API not configured, using fallback grading')
      return performFallbackGrading(params)
    }

    // Create grading prompt
    const prompt = AIUtils.createEssayGradingPrompt({
      essay,
      lessonContent,
      learningObjectives,
      requirements: assignmentRequirements,
      rubricConfig,
      wordCount
    })

    // Get AI grading result from Gemini
    const aiResult = await geminiService.generateJSON<GradingResult>(prompt, 
      'You are an expert educational assessor. Always respond with valid JSON only.'
    )

    // Validate and normalize the result
    return validateGradingResult(aiResult)

  } catch (error) {
    console.error('Gemini API grading failed, using fallback:', error)
    return performFallbackGrading(params)
  }
}

// Fallback grading when Gemini API is not available
function performFallbackGrading(params: {
  essay: string
  lessonContent: string
  learningObjectives: string[]
  assignmentRequirements: string
  wordCount: number
}): GradingResult {
  const { essay, lessonContent, assignmentRequirements, wordCount } = params

  // Simple keyword-based analysis (fallback)
  const words = essay.toLowerCase().split(/\s+/)
  const lessonWords = lessonContent.toLowerCase().split(/\s+/)
  
  // Content analysis
  const commonWords = words.filter(word => lessonWords.includes(word) && word.length > 3)
  const contentCoverage = Math.min(commonWords.length / Math.max(words.length * 0.1, 1), 1)
  const contentScore = Math.min(contentCoverage * 18 + 2, 20)

  // Grammar analysis (simple)
  const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const doubleSpaces = (essay.match(/  /g) || []).length
  const missingPunctuation = sentences.filter(s => !/[.!?]$/.test(s.trim())).length
  const totalErrors = doubleSpaces + missingPunctuation
  const errorRate = totalErrors / Math.max(words.length, 1)
  const grammarScore = Math.max(30 - (errorRate * 200), 15)

  // Coherence analysis
  const paragraphs = essay.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const hasMultipleParagraphs = paragraphs.length > 1
  const coherenceScore = hasMultipleParagraphs ? 25 : 18

  // Relevance analysis
  const reqLower = assignmentRequirements.toLowerCase()
  const requirementKeywords = reqLower.split(/\s+/).filter(word => word.length > 3)
  const requirementMatches = requirementKeywords.filter(keyword => essay.toLowerCase().includes(keyword)).length
  const relevanceScore = Math.min(requirementMatches * 2 + 8, 20)

  return {
    rubric_scores: {
      content: {
        score: Math.round(contentScore * 100) / 100,
        feedback: `Content coverage: ${Math.round(contentCoverage * 100)}%. Consider adding more specific examples from lesson material.`,
        evidence: commonWords.slice(0, 5)
      },
      grammar: {
        score: Math.round(grammarScore * 100) / 100,
        feedback: `Found ${totalErrors} potential grammar issues. ${errorRate < 0.02 ? 'Good overall grammar.' : 'Consider proofreading.'}`,
        issues: [doubleSpaces > 0 ? 'Double spaces' : null, missingPunctuation > 0 ? 'Missing punctuation' : null].filter(Boolean) as string[]
      },
      coherence: {
        score: coherenceScore,
        feedback: hasMultipleParagraphs ? 'Good paragraph structure.' : 'Consider breaking into multiple paragraphs.',
        analysis: [hasMultipleParagraphs ? 'Multiple paragraphs present' : 'Single paragraph, consider more structure']
      },
      relevance: {
        score: Math.round(relevanceScore * 100) / 100,
        feedback: `Addresses ${requirementMatches} requirement keywords. Consider reviewing assignment requirements.`,
        alignment: [`${requirementMatches} requirement matches found`]
      }
    },
    ai_summary: `AI Assessment: Content (${contentScore}/20), Grammar (${grammarScore}/30), Coherence (${coherenceScore}/30), Relevance (${relevanceScore}/20). General performance with room for improvement.`,
    suggestions: [
      {
        area: 'content',
        suggestion: 'Include more specific examples and references to lesson material',
        priority: 'high'
      },
      {
        area: 'grammar',
        suggestion: 'Proofread for grammar and punctuation errors',
        priority: errorRate > 0.02 ? 'high' : 'medium'
      }
    ],
    improvement_areas: ['Content Depth', errorRate > 0.02 ? 'Writing Mechanics' : 'Organization'],
    confidence_score: 0.65
  }
}

// Validate and normalize grading result
function validateGradingResult(result: any): GradingResult {
  // Ensure all required fields exist with defaults
  const validated: GradingResult = {
    rubric_scores: {
      content: {
        score: Math.max(0, Math.min(20, result.rubric_scores?.content?.score || 0)),
        feedback: result.rubric_scores?.content?.feedback || 'No feedback provided',
        evidence: result.rubric_scores?.content?.evidence || []
      },
      grammar: {
        score: Math.max(0, Math.min(30, result.rubric_scores?.grammar?.score || 0)),
        feedback: result.rubric_scores?.grammar?.feedback || 'No feedback provided',
        issues: result.rubric_scores?.grammar?.issues || []
      },
      coherence: {
        score: Math.max(0, Math.min(30, result.rubric_scores?.coherence?.score || 0)),
        feedback: result.rubric_scores?.coherence?.feedback || 'No feedback provided',
        analysis: result.rubric_scores?.coherence?.analysis || []
      },
      relevance: {
        score: Math.max(0, Math.min(20, result.rubric_scores?.relevance?.score || 0)),
        feedback: result.rubric_scores?.relevance?.feedback || 'No feedback provided',
        alignment: result.rubric_scores?.relevance?.alignment || []
      }
    },
    ai_summary: result.ai_summary || 'AI assessment completed',
    suggestions: result.suggestions || [],
    improvement_areas: result.improvement_areas || [],
    confidence_score: Math.max(0, Math.min(1, result.confidence_score || 0.5))
  }

  return validated
}

