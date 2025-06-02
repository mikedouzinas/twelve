import { supabase } from './supabase';

interface JournalData {
  date: string;
  bodyweight_lb?: number;
  whoop_calories_burned?: number;
  calories?: number;
  protein_g?: number;
  meals?: Array<{ time: string; desc: string }>;
  exercise?: {
    resistance?: string;
    cardio?: string;
    steps?: number;
  };
  sleep_h?: number;
  stress_level_1_5?: number;
  notes?: string;
  yes_no_results?: Record<string, boolean>;
}

interface AnalysisResponse {
  score: number;
  reasoning: string;
  focusTomorrow: string;
  emotionSummary: string;
  recommendations: string[];
}

export async function analyzeJournalEntry(
  journal: JournalData,
  userGoals: any,
  history?: any[],
  integrations?: any
): Promise<AnalysisResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('analyzeEntry', {
      body: {
        journal,
        userGoals,
        history,
        integrations,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    return data as AnalysisResponse;
  } catch (error) {
    console.error('Failed to analyze journal entry:', error);
    
    // Return a fallback response
    return {
      score: 0.5,
      reasoning: "Analysis service temporarily unavailable. Your entry has been saved.",
      focusTomorrow: "Continue tracking your habits consistently.",
      emotionSummary: "neutral",
      recommendations: ["Keep up your daily tracking routine"],
    };
  }
}

export async function fetchUserHistory(userId: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('entries')
    .select('date, journal_text, score, yes_no_results')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch user history:', error);
    return [];
  }

  // Parse journal_text if it's JSON
  return data.map(entry => {
    try {
      const parsed = JSON.parse(entry.journal_text || '{}');
      return {
        ...entry,
        journal_data: parsed,
      };
    } catch {
      return entry;
    }
  });
} 