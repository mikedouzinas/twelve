import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface QuickInputButton {
  key: keyof JournalData;
  label: string;
  icon: string;
  type: 'number' | 'text';
  placeholder?: string;
}

const quickInputButtons: QuickInputButton[] = [
  { key: 'bodyweight_lb', label: 'Weight', icon: 'scale-outline', type: 'number', placeholder: 'lbs' },
  { key: 'calories', label: 'Calories', icon: 'restaurant-outline', type: 'number' },
  { key: 'protein_g', label: 'Protein', icon: 'nutrition-outline', type: 'number', placeholder: 'g' },
  { key: 'sleep_h', label: 'Sleep', icon: 'moon-outline', type: 'number', placeholder: 'hours' },
  { key: 'stress_level_1_5', label: 'Stress', icon: 'pulse-outline', type: 'number', placeholder: '1-5' },
  { key: 'whoop_calories_burned', label: 'Calories Burned', icon: 'flame-outline', type: 'number' },
];

interface ConversationalJournalProps {
  onDataChange: (data: JournalData) => void;
  initialData?: JournalData;
  userGoals?: any;
}

export function ConversationalJournal({ onDataChange, initialData = {}, userGoals }: ConversationalJournalProps) {
  const [journalData, setJournalData] = useState<JournalData>(initialData);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: "Hi! I'm your Twelve coach. Tell me about your day - what did you eat, how did you exercise, and how are you feeling?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [selectedField, setSelectedField] = useState<keyof JournalData | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onDataChange(journalData);
  }, [journalData]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showQuickInput ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showQuickInput]);

  const parseUserInput = (text: string) => {
    // Enhanced parsing logic
    const updatedData = { ...journalData };
    
    // Parse weight (various formats)
    const weightMatch = text.match(/(?:weigh(?:ed)?|weight|am)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)?/i);
    if (weightMatch) {
      updatedData.bodyweight_lb = parseFloat(weightMatch[1]);
    }

    // Parse calories (distinguish from burned calories)
    const calorieMatch = text.match(/(?:ate|consumed|had)\s*(?:about\s*)?(\d+)\s*(?:cal|calories|kcal)/i);
    if (calorieMatch) {
      updatedData.calories = parseInt(calorieMatch[1]);
    }
    
    // Parse calories burned
    const burnedMatch = text.match(/(?:burned|burnt)\s*(\d+)\s*(?:cal|calories|kcal)/i);
    if (burnedMatch) {
      updatedData.whoop_calories_burned = parseInt(burnedMatch[1]);
    }

    // Parse protein
    const proteinMatch = text.match(/(\d+)\s*(?:g|grams?)\s*(?:of\s*)?protein/i);
    if (proteinMatch) {
      updatedData.protein_g = parseInt(proteinMatch[1]);
    }

    // Parse sleep (various formats)
    const sleepMatch = text.match(/(?:slept|sleep|got)\s*(?:for\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    if (sleepMatch) {
      updatedData.sleep_h = parseFloat(sleepMatch[1]);
    }

    // Parse stress level
    const stressMatch = text.match(/stress\s*(?:level|is|was)?\s*(?:at\s*)?(\d)\s*(?:out\s*of\s*5)?/i);
    if (stressMatch) {
      updatedData.stress_level_1_5 = parseInt(stressMatch[1]);
    }

    // Parse meals with better detection
    if (!updatedData.meals) updatedData.meals = [];
    
    const mealPatterns = [
      { time: 'breakfast', pattern: /(?:breakfast|morning meal)[:\s]+([^.]+?)(?:\.|,|;|$)/i },
      { time: 'lunch', pattern: /(?:lunch|midday meal)[:\s]+([^.]+?)(?:\.|,|;|$)/i },
      { time: 'dinner', pattern: /(?:dinner|evening meal)[:\s]+([^.]+?)(?:\.|,|;|$)/i },
      { time: 'snack', pattern: /(?:snack|snacked on)[:\s]+([^.]+?)(?:\.|,|;|$)/i },
    ];

    mealPatterns.forEach(({ time, pattern }) => {
      const match = text.match(pattern);
      if (match && !updatedData.meals!.some(m => m.time === time)) {
        updatedData.meals!.push({ time, desc: match[1].trim() });
      }
    });

    // Parse exercise with better detection
    if (!updatedData.exercise) updatedData.exercise = {};
    
    // Rest day detection
    if (text.toLowerCase().includes('rest day') || text.toLowerCase().includes('no workout')) {
      updatedData.exercise.resistance = 'Rest day';
    } else {
      // Resistance training detection
      const resistanceKeywords = ['lift', 'weights', 'strength', 'push', 'pull', 'legs', 'chest', 'back', 'arms'];
      if (resistanceKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        const exerciseMatch = text.match(/(?:workout|exercise|trained)[:\s]+([^.]+?)(?:\.|,|;|$)/i);
        updatedData.exercise.resistance = exerciseMatch ? exerciseMatch[1].trim() : 'Weight training';
      }
      
      // Cardio detection
      const cardioMatch = text.match(/(?:ran|run|walk|walked|jog|jogged|bike|biked|swim|swam)\s*(?:for\s*)?(\d+)\s*(?:min|minutes?|mile|miles?|km)?/i);
      if (cardioMatch) {
        updatedData.exercise.cardio = cardioMatch[0];
      }
    }

    // Parse steps
    const stepsMatch = text.match(/(\d{1,5})\s*steps/i);
    if (stepsMatch) {
      if (!updatedData.exercise) updatedData.exercise = {};
      updatedData.exercise.steps = parseInt(stepsMatch[1]);
    }

    // Store any additional notes
    if (!updatedData.notes) {
      updatedData.notes = text;
    }

    return updatedData;
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Parse the input and update journal data
    const updatedData = parseUserInput(inputText);
    setJournalData(updatedData);

    // Generate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: generateAIResponse(inputText, updatedData),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 500);

    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const generateAIResponse = (userText: string, data: JournalData): string => {
    // More intelligent responses based on context
    const missingFields = [];
    const warnings = [];
    const positives = [];

    // Check calories
    if (!data.calories) {
      missingFields.push('total calories consumed');
    } else if (userGoals?.calorieLimit) {
      const diff = data.calories - userGoals.calorieLimit;
      if (Math.abs(diff) < 100) {
        positives.push('staying close to your calorie target');
      } else if (diff > 200) {
        warnings.push(`going ${diff} calories over your target`);
      }
    }

    // Check protein
    if (!data.protein_g) {
      missingFields.push('protein intake');
    } else if (userGoals?.proteinGoal && data.protein_g < userGoals.proteinGoal) {
      warnings.push(`only getting ${data.protein_g}g of protein (target: ${userGoals.proteinGoal}g)`);
    }

    // Check sleep
    if (!data.sleep_h) {
      missingFields.push('sleep duration');
    } else if (data.sleep_h < 7) {
      warnings.push(`only getting ${data.sleep_h} hours of sleep`);
    } else {
      positives.push(`getting ${data.sleep_h} hours of quality sleep`);
    }

    // Check exercise
    if (!data.exercise || (!data.exercise.resistance && !data.exercise.cardio)) {
      missingFields.push('exercise details');
    } else if (data.exercise.resistance && data.exercise.resistance !== 'Rest day') {
      positives.push('completing your workout');
    }

    // Check meals
    if (!data.meals || data.meals.length === 0) {
      missingFields.push('what you ate for your meals');
    }

    // Generate response
    let response = '';

    if (positives.length > 0) {
      response += `Great job ${positives.join(' and ')}! `;
    }

    if (warnings.length > 0) {
      response += `I noticed you're ${warnings.join(' and ')}. `;
    }

    if (missingFields.length > 0) {
      response += `Could you also tell me about your ${missingFields.join(', ')}?`;
    } else {
      response += "You've logged everything! ";
      
      // Provide a contextual tip
      if (data.sleep_h && data.sleep_h < 7) {
        response += "Try to get to bed 30 minutes earlier tonight for better recovery.";
      } else if (data.stress_level_1_5 && data.stress_level_1_5 > 3) {
        response += "Consider adding some meditation or breathing exercises to manage stress.";
      } else {
        response += "Keep up the excellent work!";
      }
    }

    return response;
  };

  const handleQuickInput = (field: keyof JournalData, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const numValue = parseFloat(value);
    let updatedData = { ...journalData };

    switch (field) {
      case 'bodyweight_lb':
      case 'calories':
      case 'protein_g':
      case 'sleep_h':
      case 'stress_level_1_5':
      case 'whoop_calories_burned':
        updatedData[field] = isNaN(numValue) ? undefined : numValue;
        break;
    }

    setJournalData(updatedData);
    setSelectedField(null);
  };

  const getFieldValue = (field: keyof JournalData): string => {
    const value = journalData[field];
    return value !== undefined ? value.toString() : '';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Current Entry Summary */}
      <View style={styles.entrySummary}>
        <Text style={styles.summaryTitle}>Today's Entry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
          {journalData.bodyweight_lb && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Weight</Text>
              <Text style={styles.summaryValue}>{journalData.bodyweight_lb} lbs</Text>
            </View>
          )}
          {journalData.calories && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Calories</Text>
              <Text style={styles.summaryValue}>{journalData.calories}</Text>
            </View>
          )}
          {journalData.protein_g && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Protein</Text>
              <Text style={styles.summaryValue}>{journalData.protein_g}g</Text>
            </View>
          )}
          {journalData.sleep_h && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Sleep</Text>
              <Text style={styles.summaryValue}>{journalData.sleep_h}h</Text>
            </View>
          )}
          {journalData.meals && journalData.meals.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Meals</Text>
              <Text style={styles.summaryValue}>{journalData.meals.length} logged</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Chat Messages */}
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
              message.type === 'user' ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text style={[
              styles.messageText,
              message.type === 'user' ? styles.userMessageText : styles.aiMessageText,
            ]}>
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Quick Input Buttons */}
      <Animated.View
        style={[
          styles.quickInputContainer,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            }],
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickInputButtons.map((button) => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.quickButton,
                selectedField === button.key && styles.quickButtonSelected,
              ]}
              onPress={() => setSelectedField(selectedField === button.key ? null : button.key)}
            >
              <Ionicons 
                name={button.icon as any} 
                size={20} 
                color={selectedField === button.key ? '#FFFFFF' : '#0A84FF'} 
              />
              <Text style={[
                styles.quickButtonText,
                selectedField === button.key && styles.quickButtonTextSelected,
              ]}>
                {button.label}
              </Text>
              {getFieldValue(button.key) && (
                <Text style={[
                  styles.quickButtonValue,
                  selectedField === button.key && styles.quickButtonTextSelected,
                ]}>
                  {getFieldValue(button.key)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Selected Field Input */}
      {selectedField && (
        <View style={styles.fieldInputContainer}>
          <TextInput
            style={styles.fieldInput}
            placeholder={`Enter ${quickInputButtons.find(b => b.key === selectedField)?.label}`}
            placeholderTextColor="#999"
            value={getFieldValue(selectedField)}
            onChangeText={(value) => handleQuickInput(selectedField, value)}
            keyboardType="numeric"
            autoFocus
          />
          <TouchableOpacity
            style={styles.fieldInputDone}
            onPress={() => setSelectedField(null)}
          >
            <Ionicons name="checkmark" size={20} color="#0A84FF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowQuickInput(!showQuickInput)}
        >
          <Ionicons 
            name={showQuickInput ? "close" : "add-circle-outline"} 
            size={24} 
            color="#0A84FF" 
          />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Tell me about your day..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  entrySummary: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryScroll: {
    flexDirection: 'row',
  },
  summaryItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0A84FF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#000000',
  },
  quickInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  quickButtonSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#0A84FF',
    marginLeft: 6,
  },
  quickButtonTextSelected: {
    color: '#FFFFFF',
  },
  quickButtonValue: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    margin: 16,
    borderRadius: 20,
    padding: 4,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
  },
  fieldInputDone: {
    padding: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  toggleButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}); 