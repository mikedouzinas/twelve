import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JournalData {
  date: string
  bodyweight_lb?: number
  whoop_calories_burned?: number
  calories?: number
  protein_g?: number
  meals?: Array<{ time: string; desc: string }>
  exercise?: {
    resistance?: string
    cardio?: string
    steps?: number
  }
  sleep_h?: number
  stress_level_1_5?: number
  notes?: string
  yes_no_results?: Record<string, boolean>
}

interface AnalysisRequest {
  journal: JournalData
  userGoals: any
  history?: any[]
  integrations?: any
}

interface AnalysisResponse {
  score: number
  reasoning: string
  focusTomorrow: string
  emotionSummary: string
  recommendations: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { journal, userGoals, history, integrations } = await req.json() as AnalysisRequest

    // Validate request
    if (!journal) {
      throw new Error('Journal data is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Prepare the prompt for GPT-4
    const systemPrompt = `You are Twelve, an AI Habit & Health Coach. Your role is to analyze daily journal entries and provide structured feedback.

OBJECTIVE: Help the user stay aligned with their self-defined goals through daily habit tracking, structured scoring, and personalized feedback. Be direct and clear. No fluff, no coddling — just actionable, adaptive coaching based on the user's data.

USER GOALS:
${JSON.stringify(userGoals, null, 2)}

SCORING RUBRIC:
- Calories: Weight 30% - Score based on deviation from target (within 100 cal = 10/10)
- Protein: Weight 20% - Score based on hitting minimum target
- Exercise: Weight 20% - Full points for any resistance or cardio work
- Sleep: Weight 20% - 7.5+ hours = 10/10, reduce proportionally
- Habits: Weight 10% - Percentage of yes/no habits completed

Adjust scoring based on user's strictness preference and previous patterns.

OUTPUT FORMAT:
Return a JSON object with:
{
  "score": 0.0-1.0 (normalized),
  "reasoning": "Clear explanation of score breakdown",
  "focusTomorrow": "One specific action for tomorrow",
  "emotionSummary": "positive|neutral|negative",
  "recommendations": ["specific", "actionable", "tips"]
}`

    const userPrompt = `Analyze this journal entry:

${JSON.stringify(journal, null, 2)}

Previous 7 days context:
${JSON.stringify(history || [], null, 2)}

Integration data:
${JSON.stringify(integrations || {}, null, 2)}`

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const openAIData = await openAIResponse.json()
    const analysisResult = JSON.parse(openAIData.choices[0].message.content) as AnalysisResponse

    // Validate the response format
    if (typeof analysisResult.score !== 'number' || 
        !analysisResult.reasoning || 
        !analysisResult.focusTomorrow ||
        !analysisResult.emotionSummary ||
        !Array.isArray(analysisResult.recommendations)) {
      throw new Error('Invalid response format from AI')
    }

    // Ensure score is between 0 and 1
    analysisResult.score = Math.max(0, Math.min(1, analysisResult.score))

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in analyzeEntry function:', error)
    
    // Return a fallback response in case of error
    const fallbackResponse: AnalysisResponse = {
      score: 0.5,
      reasoning: "Unable to fully analyze your entry at this time. Your data has been saved.",
      focusTomorrow: "Continue tracking your habits and journal entries.",
      emotionSummary: "neutral",
      recommendations: ["Keep logging your daily activities", "Stay consistent with your tracking"]
    }
    
    return new Response(
      JSON.stringify({ error: error.message, ...fallbackResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 even on error to allow fallback handling
      }
    )
  }
}) 