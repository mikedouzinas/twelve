import { useAuth } from '@/contexts/AuthContext';
import { Habit, YesNoResults } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [journalText, setJournalText] = useState('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [yesNoResults, setYesNoResults] = useState<YesNoResults>({});
  const [loading, setLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchHabits();
      checkTodayEntry();
    }
  }, [user]);

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
      if (data.journal_text) setJournalText(data.journal_text);
      if (data.yes_no_results) setYesNoResults(data.yes_no_results as YesNoResults);
    }
  };

  const toggleHabit = (habitName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setYesNoResults(prev => ({
      ...prev,
      [habitName]: !prev[habitName],
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!journalText.trim() && Object.keys(yesNoResults).length === 0) {
      Alert.alert('Error', 'Please write something or check at least one habit');
      return;
    }

    setLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Save entry to database
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .upsert({
          user_id: user.id,
          date: today,
          journal_text: journalText,
          yes_no_results: yesNoResults,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // For MVP, generate a placeholder score
      const score = calculatePlaceholderScore(yesNoResults);
      
      // Update entry with score
      await supabase
        .from('entries')
        .update({
          score,
          reasoning: "Great job logging your day! Keep up the consistency.",
          focus_tomorrow: "Continue building on today's momentum.",
          emotion_summary: "positive",
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

  const calculatePlaceholderScore = (results: YesNoResults): number => {
    const totalHabits = Object.keys(results).length;
    const completedHabits = Object.values(results).filter(Boolean).length;
    return totalHabits > 0 ? completedHabits / totalHabits : 0.5;
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal Entry</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="Write about your day, thoughts, or anything else..."
            placeholderTextColor="#999"
            multiline
            value={journalText}
            onChangeText={setJournalText}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    paddingVertical: 24,
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
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
  journalInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    minHeight: 150,
    color: '#000',
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