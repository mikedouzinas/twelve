import { useAuth } from '@/contexts/AuthContext';
import { GradingStyle, UserGoals } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ONBOARDING_QUESTIONS = [
  "Hi! I'm Twelve, your AI habit coach. What's your name?",
  "Nice to meet you, {name}! What's your main health or fitness goal right now?",
  "Do you have a daily calorie target? If yes, what is it?",
  "How many times per week would you like to work out?",
  "How strict would you like me to be with grading? (lenient, moderate, or strict)",
  "What time zone are you in?",
];

export default function OnboardingScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: ONBOARDING_QUESTIONS[0], isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    goals: {} as UserGoals,
    gradingStyle: {} as GradingStyle,
    timezone: '',
  });
  
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Process user input based on current step
    let nextMessage = '';
    const newUserData = { ...userData };

    switch (currentStep) {
      case 0: // Name
        newUserData.name = input;
        nextMessage = ONBOARDING_QUESTIONS[1].replace('{name}', input);
        break;
      case 1: // Main goal
        newUserData.goals.mainGoal = input;
        nextMessage = ONBOARDING_QUESTIONS[2];
        break;
      case 2: // Calorie target
        const calories = parseInt(input);
        if (!isNaN(calories)) {
          newUserData.goals.calorieLimit = calories;
        }
        nextMessage = ONBOARDING_QUESTIONS[3];
        break;
      case 3: // Workouts per week
        const workouts = parseInt(input);
        if (!isNaN(workouts)) {
          newUserData.goals.workoutsPerWeek = workouts;
        }
        nextMessage = ONBOARDING_QUESTIONS[4];
        break;
      case 4: // Grading style
        const style = input.toLowerCase();
        if (['lenient', 'moderate', 'strict'].includes(style)) {
          newUserData.gradingStyle.strictness = style as 'lenient' | 'moderate' | 'strict';
        }
        nextMessage = ONBOARDING_QUESTIONS[5];
        break;
      case 5: // Timezone
        newUserData.timezone = input;
        await completeOnboarding();
        return;
    }

    setUserData(newUserData);
    
    // Add bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: nextMessage,
        isUser: false,
      };
      setMessages(prev => [...prev, botMessage]);
      setCurrentStep(prev => prev + 1);
    }, 500);
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: userData.name,
          timezone: userData.timezone,
          grading_style: userData.gradingStyle,
          goals: userData.goals,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Create default habits
      const defaultHabits = [
        { habit_name: 'under1600', label: 'Stayed under 1600 calories' },
        { habit_name: 'workedOut', label: 'Completed workout' },
        { habit_name: 'goodSleep', label: 'Got 7+ hours of sleep' },
      ];

      const { error: habitsError } = await supabase
        .from('habits')
        .insert(
          defaultHabits.map(habit => ({
            user_id: user.id,
            ...habit,
            is_active: true,
          }))
        );

      if (habitsError) throw habitsError;

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert(
        'Error',
        'Failed to complete onboarding. Please try again.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Twelve</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentStep + 1) / ONBOARDING_QUESTIONS.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text style={[
              styles.messageText,
              message.isUser ? styles.userText : styles.botText,
            ]}>
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your answer..."
            placeholderTextColor="#999"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0A84FF',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8F8F8',
    borderRadius: 22,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#0A84FF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 