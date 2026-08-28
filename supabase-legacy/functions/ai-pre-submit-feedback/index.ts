// Pre-submit AI Feedback Edge Function (Updated with Gemini API)
// Purpose: Provide students with AI feedback and suggestions before final submission

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { geminiService, AIUtils } from '../_shared/gemini.ts'

interface PreSubmitRequest {
  student_id: string
  assignment_id: string
  draft_text: string
}

interface PreSubmitFeedback {
  overall_score: number
  word_count: number
  feedback_sections: {
    content: { score: number; feedback: string; suggestions: string[] }
    grammar: { score: number; feedback: string; suggestions: string[] }
    coherence: { score: number; feedback: string; suggestions: string[] }
    relevance: { score: number; feedback: string; suggestions: string[] }
  }
  general_suggestions: string[]
  priority_improvements: string[]
  confidence_level: number
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
    const { student_id, assignment_id, draft_text }: PreSubmitRequest = await req.json()

    if (!student_id || !assignment_id || !draft_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get assignment details and check if AI pre-check is enabled
    const { data: assignment, error: assignmentError } = await supabaseClient
      .from('assignments')
      .select(`
        id,
        title,
        description,
        requirements,
        lesson_id,
        enable_ai_pre_check,
        ai_feedback_enabled,
        word_limit_min,
        word_limit_max,
        courses!inner(teacher_id)
      `)
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return new Response(
        JSON.stringify({ error: 'Assignment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if student is enrolled in this course
    const { data: enrollment } = await supabaseClient
      .from('enrollments')
      .select('id')
      .eq('student_id', student_id)
      .eq('course_id', assignment.courses.id)
      .single()

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: 'Student not enrolled in this course' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if AI pre-check is enabled for this assignment
    if (!assignment.enable_ai_pre_check || !assignment.ai_feedback_enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI pre-submit feedback is not enabled for this assignment',
          assignment_id,
          enabled: false
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const wordCount = draft_text.trim().split(/\s+/).filter(word => word.length > 0).length

    // Get lesson content for context
    let lessonContent = ''
    let learningObjectives = []
    let lessonAnalysis = null
    
    if (assignment.lesson_id) {
      const { data: lesson } = await supabaseClient
        .from('lessons')
        .select('content, title, learning_objectives')
        .eq('id', assignment.lesson_id)
        .single()

      if (lesson) {
        lessonContent = lesson.content || ''
        learningObjectives = lesson.learning_objectives || []
      }

      // Get processed lesson analysis
      const { data: analysis } = await supabaseClient
        .from('lesson_content_analysis')
        .select('*')
        .eq('lesson_id', assignment.lesson_id)
        .order('processed_at', { ascending: false })
        .limit(1)
        .single()

      lessonAnalysis = analysis
    }

    // Generate AI feedback
    const feedback = await generatePreSubmitFeedback({
      draft_text,
      wordCount,
      lessonContent,
      learningObjectives,
      lessonAnalysis,
      assignmentRequirements: assignment.requirements || '',
      wordLimits: {
        min: assignment.word_limit_min,
        max: assignment.word_limit_max
      }
    })

    // Save feedback to database for tracking
    const feedbackData = {
      student_id,
      assignment_id,
      draft_text: draft_text.substring(0, 2000), // Store first 2000 chars for privacy
      word_count: wordCount,
      pre_check_score: feedback.overall_score,
      pre_check_feedback: feedback,
      improvement_suggestions: {
        general_suggestions: feedback.general_suggestions,
        priority_improvements: feedback.priority_improvements
      }
    }

    const { data: savedFeedback, error: saveError } = await supabaseClient
      .from('ai_pre_submit_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving pre-submit feedback:', saveError)
    }

    // Update usage statistics
    await supabaseClient.rpc('increment_ai_feedback_usage', {
      p_assignment_id: assignment_id,
      p_student_id: student_id
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          feedback,
          word_count: wordCount,
          feedback_generated_at: new Date().toISOString(),
          saved_feedback_id: savedFeedback?.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Pre-submit AI Feedback Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'AI pre-submit feedback failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Pre-submit Feedback Generation Logic using Gemini
async function generatePreSubmitFeedback(params: {
  draft_text: string
  wordCount: number
  lessonContent: string
  learningObjectives: any[]
  lessonAnalysis: any
  assignmentRequirements: string
  wordLimits: { min?: number; max?: number }
}): Promise<PreSubmitFeedback> {
  const { 
    draft_text, 
    wordCount, 
    lessonContent, 
    learningObjectives, 
    lessonAnalysis,
    assignmentRequirements,
    wordLimits 
  } = params

  try {
    // Check if Gemini API is configured
    const apiStatus = geminiService.getStatus()
    if (!apiStatus.configured) {
      console.warn('Gemini API not configured, using fallback feedback generation')
      return generateFallbackPreSubmitFeedback(params)
    }

    // Create feedback prompt
    const prompt = AIUtils.createPreSubmitFeedbackPrompt({
      draft: draft_text,
      lessonContent,
      learningObjectives: learningObjectives.map(obj => obj.title || obj),
      requirements: assignmentRequirements,
      wordLimits
    })

    // Get AI feedback from Gemini
    const aiFeedback = await geminiService.generateJSON<PreSubmitFeedback>(prompt,
      'You are a helpful writing assistant. Always respond with valid JSON only.'
    )

    // Validate and normalize the result
    return validatePreSubmitFeedback(aiFeedback)

  } catch (error) {
    console.error('Gemini API feedback generation failed, using fallback:', error)
    return generateFallbackPreSubmitFeedback(params)
  }
}

// Fallback feedback generation when Gemini API is not available
function generateFallbackPreSubmitFeedback(params: {
  draft_text: string
  wordCount: number
  lessonContent: string
  learningObjectives: any[]
  assignmentRequirements: string
  wordLimits: { min?: number; max?: number }
}): PreSubmitFeedback {
  const { draft_text, wordCount, lessonContent, assignmentRequirements, wordLimits } = params

  // Simple analysis (fallback)
  const words = draft_text.toLowerCase().split(/\s+/)
  const lessonWords = lessonContent.toLowerCase().split(/\s+/)

  // Content analysis
  const commonWords = words.filter(word => lessonWords.includes(word) && word.length > 3)
  const contentCoverage = Math.min(commonWords.length / Math.max(words.length * 0.15, 1), 1)
  const contentScore = Math.min(contentCoverage * 16 + 4, 20)

  // Grammar analysis
  const sentences = draft_text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const doubleSpaces = (draft_text.match(/  /g) || []).length
  const missingPeriods = sentences.filter(s => !/[.!?]$/.test(s.trim())).length
  const totalErrors = doubleSpaces + missingPeriods
  const errorRate = totalErrors / Math.max(words.length, 1)
  const grammarScore = Math.max(30 - (errorRate * 200), 15)

  // Coherence analysis
  const paragraphs = draft_text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const hasMultipleParagraphs = paragraphs.length > 1
  const coherenceScore = hasMultipleParagraphs ? 25 : 18

  // Relevance analysis
  const reqLower = assignmentRequirements.toLowerCase()
  const requirementKeywords = reqLower.split(/\s+/).filter(word => word.length > 3)
  const requirementMatches = requirementKeywords.filter(keyword => draft_text.toLowerCase().includes(keyword)).length
  const relevanceScore = Math.min(requirementMatches * 2 + 8, 20)

  // Word count analysis
  let wordCountFeedback = `Current word count: ${wordCount} words.`
  if (wordLimits?.min && wordCount < wordLimits.min) {
    wordCountFeedback += ` Below minimum of ${wordLimits.min} words.`
  } else if (wordLimits?.max && wordCount > wordLimits.max) {
    wordCountFeedback += ` Exceeds maximum of ${wordLimits.max} words.`
  }

  // Calculate overall score
  const overallScore = (contentScore * 0.2) + (grammarScore * 0.3) + (coherenceScore * 0.3) + (relevanceScore * 0.2)

  // Generate suggestions
  const generalSuggestions = [
    contentScore < 16 ? "Focus on demonstrating deeper understanding of lesson concepts" : null,
    grammarScore < 24 ? "Spend extra time on grammar and proofreading" : null,
    coherenceScore < 24 ? "Work on organizing your ideas more clearly" : null,
    relevanceScore < 16 ? "Ensure all content directly relates to the lesson and assignment" : null,
    "Proofread your work one final time before submission"
  ].filter(Boolean) as string[]

  const priorityImprovements = [
    contentScore < 14 ? "Content Depth and Understanding" : null,
    grammarScore < 20 ? "Grammar and Mechanics" : null,
    coherenceScore < 20 ? "Organization and Flow" : null,
    relevanceScore < 14 ? "Focus and Relevance" : null
  ].filter(Boolean) as string[]

  return {
    overall_score: Math.round(overallScore * 100) / 100,
    word_count: wordCount,
    feedback_sections: {
      content: {
        score: Math.round(contentScore * 100) / 100,
        feedback: `Content coverage: ${Math.round(contentCoverage * 100)}%. ${contentCoverage > 0.3 ? 'Good integration of lesson concepts.' : 'Consider adding more references to lesson content.'}`,
        suggestions: contentCoverage < 0.3 ? ["Include more specific examples from the lesson", "Reference specific learning objectives"] : ["Use lesson-specific terminology where appropriate"]
      },
      grammar: {
        score: Math.round(grammarScore * 100) / 100,
        feedback: `Found ${totalErrors} potential grammar issues. ${errorRate < 0.02 ? 'Grammar looks good overall.' : 'Consider reviewing for grammar issues.'}`,
        suggestions: [doubleSpaces > 0 ? "Remove double spaces between words" : null, missingPeriods > 0 ? "Check sentence endings for proper punctuation" : null, "Read through aloud to catch any awkward phrasing"].filter(Boolean) as string[]
      },
      coherence: {
        score: coherenceScore,
        feedback: hasMultipleParagraphs ? "Good paragraph structure. Consider adding transition words." : "Consider breaking into multiple paragraphs for better organization.",
        suggestions: hasMultipleParagraphs ? ["Add transition words (however, therefore, for example)", "Use topic sentences to introduce each paragraph"] : ["Break your writing into multiple paragraphs", "Organize ideas with clear topic sentences"]
      },
      relevance: {
        score: Math.round(relevanceScore * 100) / 100,
        feedback: `Addresses ${requirementMatches} requirement keywords. ${requirementMatches > 2 ? 'Good alignment with requirements.' : 'Review assignment requirements to ensure all aspects are covered.'}`,
        suggestions: requirementMatches < 3 ? ["Review and address all parts of the assignment question", "Connect your points more directly to the lesson material"] : ["Ensure every paragraph relates to the learning objectives", "Use specific examples from the lesson material"]
      }
    },
    general_suggestions: generalSuggestions,
    priority_improvements: priorityImprovements.length > 0 ? priorityImprovements : ["General Polish and Review"],
    confidence_level: 0.65
  }
}

// Validate and normalize pre-submit feedback
function validatePreSubmitFeedback(feedback: any): PreSubmitFeedback {
  return {
    overall_score: Math.max(0, Math.min(100, feedback.overall_score || 0)),
    word_count: feedback.word_count || 0,
    feedback_sections: {
      content: {
        score: Math.max(0, Math.min(20, feedback.feedback_sections?.content?.score || 0)),
        feedback: feedback.feedback_sections?.content?.feedback || 'No feedback available',
        suggestions: feedback.feedback_sections?.content?.suggestions || []
      },
      grammar: {
        score: Math.max(0, Math.min(30, feedback.feedback_sections?.grammar?.score || 0)),
        feedback: feedback.feedback_sections?.grammar?.feedback || 'No feedback available',
        suggestions: feedback.feedback_sections?.grammar?.suggestions || []
      },
      coherence: {
        score: Math.max(0, Math.min(30, feedback.feedback_sections?.coherence?.score || 0)),
        feedback: feedback.feedback_sections?.coherence?.feedback || 'No feedback available',
        suggestions: feedback.feedback_sections?.coherence?.suggestions || []
      },
      relevance: {
        score: Math.max(0, Math.min(20, feedback.feedback_sections?.relevance?.score || 0)),
        feedback: feedback.feedback_sections?.relevance?.feedback || 'No feedback available',
        suggestions: feedback.feedback_sections?.relevance?.suggestions || []
      }
    },
    general_suggestions: feedback.general_suggestions || [],
    priority_improvements: feedback.priority_improvements || [],
    confidence_level: Math.max(0, Math.min(1, feedback.confidence_level || 0.5))
  }
}

