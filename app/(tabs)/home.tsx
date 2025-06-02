import { ConversationalJournal } from '@/components/ConversationalJournal';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeJournalEntry, fetchUserHistory } from '@/lib/api';
import { Habit, YesNoResults } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface JournalData {
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
}

export default function HomeScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [yesNoResults, setYesNoResults] = useState<YesNoResults>({});
  const [loading, setLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [journalData, setJournalData] = useState<JournalData>({});
  const [userGoals, setUserGoals] = useState<any>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchHabits();
      checkTodayEntry();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('goals, grading_style')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setUserGoals(data.goals);
    }
  };

  const fetchHabits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (data && !error) {
      setHabits(data);
      // Initialize yes/no results
      const initialResults: YesNoResults = {};
      data.forEach(habit => {
        initialResults[habit.habit_name] = false;
      });
      setYesNoResults(initialResults);
    }
  };

  const checkTodayEntry = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data) {
      setTodayEntry(data);
      if (data.yes_no_results) setYesNoResults(data.yes_no_results as YesNoResults);
      // Parse stored journal data if exists
      if (data.journal_text) {
        try {
          const parsedData = JSON.parse(data.journal_text);
          if (typeof parsedData === 'object') {
            setJournalData(parsedData);
          }
        } catch (e) {
          // If not JSON, it's legacy plain text
        }
      }
    }
  };

  const toggleHabit = (habitName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setYesNoResults(prev => ({
      ...prev,
      [habitName]: !prev[habitName],
    }));
  };

  const validateJournalData = (data: JournalData): string[] => {
    const missingFields: string[] = [];
    
    // Check required fields based on user goals
    if (userGoals?.calorieLimit && !data.calories) {
      missingFields.push('calories');
    }
    if (userGoals?.proteinGoal && !data.protein_g) {
      missingFields.push('protein');
    }
    if (!data.sleep_h) {
      missingFields.push('sleep hours');
    }
    if (!data.exercise || (!data.exercise.resistance && !data.exercise.cardio)) {
      missingFields.push('exercise details');
    }
    if (!data.meals || data.meals.length === 0) {
      missingFields.push('meal information');
    }
    
    return missingFields;
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate journal data
    const missingFields = validateJournalData(journalData);
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please provide the following information before submitting:\n\n${missingFields.map(f => `• ${f}`).join('\n')}\n\nYou can either type it in the journal or use the quick input buttons.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Prepare the structured data for GPT
      const structuredEntry = {
        date: today,
        ...journalData,
        yes_no_results: yesNoResults,
      };

      // Save entry to database
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .upsert({
          user_id: user.id,
          date: today,
          journal_text: JSON.stringify(structuredEntry), // Store as JSON
          yes_no_results: yesNoResults,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      let analysisResult;
      
      // Try to use the edge function if available
      const USE_EDGE_FUNCTION = process.env.EXPO_PUBLIC_USE_EDGE_FUNCTIONS === 'true';
      
      if (USE_EDGE_FUNCTION) {
        // Fetch user history for context
        const history = await fetchUserHistory(user.id, 7);
        
        // Call the edge function for AI analysis
        analysisResult = await analyzeJournalEntry(
          structuredEntry,
          userGoals,
          history,
          {} // integrations placeholder
        );
      } else {
        // Use placeholder scoring for MVP
        analysisResult = {
          score: calculatePlaceholderScore(yesNoResults, journalData),
          reasoning: generatePlaceholderReasoning(journalData, yesNoResults, userGoals),
          focusTomorrow: generatePlaceholderFocus(journalData, userGoals),
          emotionSummary: "positive",
          recommendations: ["Keep tracking your habits daily", "Stay consistent with your goals"],
        };
      }
      
      // Update entry with analysis results
      await supabase
        .from('entries')
        .update({
          score: analysisResult.score,
          reasoning: analysisResult.reasoning,
          focus_tomorrow: analysisResult.focusTomorrow,
          emotion_summary: analysisResult.emotionSummary,
          recommendations: analysisResult.recommendations,
        })
        .eq('id', entryData.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to results
      router.push({
        pathname: '/(tabs)/results',
        params: { entryId: entryData.id },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
      console.error('Error submitting entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlaceholderScore = (results: YesNoResults, journal: JournalData): number => {
    let score = 0;
    let totalWeight = 0;

    // Habits score (30% weight)
    const totalHabits = Object.keys(results).length;
    const completedHabits = Object.values(results).filter(Boolean).length;
    if (totalHabits > 0) {
      score += (completedHabits / totalHabits) * 0.3;
      totalWeight += 0.3;
    }

    // Nutrition score (30% weight)
    if (userGoals?.calorieLimit && journal.calories) {
      const calorieDeviation = Math.abs(journal.calories - userGoals.calorieLimit) / userGoals.calorieLimit;
      const calorieScore = Math.max(0, 1 - calorieDeviation);
      score += calorieScore * 0.3;
      totalWeight += 0.3;
    }

    // Sleep score (20% weight)
    if (journal.sleep_h) {
      const sleepScore = Math.min(journal.sleep_h / 8, 1); // 8 hours is optimal
      score += sleepScore * 0.2;
      totalWeight += 0.2;
    }

    // Exercise score (20% weight)
    if (journal.exercise && (journal.exercise.resistance || journal.exercise.cardio)) {
      score += 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? score / totalWeight : 0.5;
  };

  const generatePlaceholderReasoning = (journal: JournalData, habits: YesNoResults, goals: any): string => {
    const completedHabits = Object.values(habits).filter(Boolean).length;
    const totalHabits = Object.keys(habits).length;
    
    let reasoning = `You completed ${completedHabits} out of ${totalHabits} habits today. `;
    
    if (journal.calories && goals?.calorieLimit) {
      const diff = journal.calories - goals.calorieLimit;
      if (Math.abs(diff) < 100) {
        reasoning += `Great job staying close to your calorie target! `;
      } else if (diff > 0) {
        reasoning += `You went over your calorie target by ${diff} calories. `;
      } else {
        reasoning += `You were under your calorie target by ${Math.abs(diff)} calories. `;
      }
    }
    
    if (journal.sleep_h) {
      if (journal.sleep_h >= 7) {
        reasoning += `Excellent sleep duration of ${journal.sleep_h} hours. `;
      } else {
        reasoning += `Try to get more sleep - you only got ${journal.sleep_h} hours. `;
      }
    }
    
    return reasoning;
  };

  const generatePlaceholderFocus = (journal: JournalData, goals: any): string => {
    if (journal.sleep_h && journal.sleep_h < 7) {
      return "Prioritize getting to bed earlier tonight for better recovery.";
    }
    if (!journal.exercise || (!journal.exercise.resistance && !journal.exercise.cardio)) {
      return "Make sure to get some form of exercise tomorrow.";
    }
    return "Keep up the great work and stay consistent with your habits!";
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.date}>{dateString}</Text>
          <Text style={styles.greeting}>
            {todayEntry ? 'Update your entry' : "How was your day?"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          {habits.map(habit => (
            <TouchableOpacity
              key={habit.id}
              style={styles.habitRow}
              onPress={() => toggleHabit(habit.habit_name)}
            >
              <Text style={styles.habitLabel}>{habit.label}</Text>
              <View style={[
                styles.checkbox,
                yesNoResults[habit.habit_name] && styles.checkboxChecked
              ]}>
                {yesNoResults[habit.habit_name] && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.journalSection}>
          <Text style={styles.sectionTitle}>Journal & Daily Log</Text>
          <ConversationalJournal
            onDataChange={setJournalData}
            initialData={journalData}
            userGoals={userGoals}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {todayEntry ? 'Update Entry' : 'Submit Entry'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  journalSection: {
    flex: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  habitLabel: {
    fontSize: 16,
    color: '#000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#0A84FF',
    borderRadius: 25,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 