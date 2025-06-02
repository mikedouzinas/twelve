export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string | null
          timezone: string | null
          grading_style: Json | null
          goals: Json | null
          push_token: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          name?: string | null
          timezone?: string | null
          grading_style?: Json | null
          goals?: Json | null
          push_token?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string | null
          timezone?: string | null
          grading_style?: Json | null
          goals?: Json | null
          push_token?: string | null
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
          date: string
          journal_text: string | null
          yes_no_results: Json | null
          score: number | null
          reasoning: string | null
          emotion_summary: string | null
          focus_tomorrow: string | null
          recommendations: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          journal_text?: string | null
          yes_no_results?: Json | null
          score?: number | null
          reasoning?: string | null
          emotion_summary?: string | null
          focus_tomorrow?: string | null
          recommendations?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          journal_text?: string | null
          yes_no_results?: Json | null
          score?: number | null
          reasoning?: string | null
          emotion_summary?: string | null
          focus_tomorrow?: string | null
          recommendations?: Json | null
          created_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          habit_name: string
          label: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_name: string
          label: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit_name?: string
          label?: string
          is_active?: boolean
          created_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          date: string
          type: string
          message: string
          sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          type: string
          message: string
          sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          type?: string
          message?: string
          sent?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Utility types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Entry = Database['public']['Tables']['entries']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']

// Type for goals stored in JSON
export interface UserGoals {
  calorieLimit?: number
  workoutsPerWeek?: number
  [key: string]: any
}

// Type for grading style stored in JSON
export interface GradingStyle {
  strictness?: 'lenient' | 'moderate' | 'strict'
  weights?: {
    habits?: number
    journal?: number
    consistency?: number
  }
  [key: string]: any
}

// Type for yes/no results
export interface YesNoResults {
  [habitName: string]: boolean
}

// Type for entry analysis response
export interface AnalysisResponse {
  score: number
  reasoning: string
  focusTomorrow: string
  emotionSummary: string
  recommendations: string[]
} 