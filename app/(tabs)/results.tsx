import { Entry } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultsScreen() {
  const { entryId } = useLocalSearchParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const scoreAnimation = useSharedValue(0);

  useEffect(() => {
    if (entryId) {
      fetchEntry(entryId as string);
    }
  }, [entryId]);

  useEffect(() => {
    if (entry?.score !== null && entry?.score !== undefined) {
      scoreAnimation.value = withDelay(300, withSpring(entry.score * 100));
    }
  }, [entry]);

  const fetchEntry = async (id: string) => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();

    if (data && !error) {
      setEntry(data);
    }
    setLoading(false);
  };

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreAnimation.value > 0 ? 1 : 0 }],
  }));

  const getScoreColor = (score: number) => {
    if (score >= 0.95) return '#32D74B'; // Green
    if (score >= 0.7) return '#FFD60A'; // Yellow
    if (score >= 0.5) return '#FF9F0A'; // Orange
    return '#FF453A'; // Red
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Entry not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scorePercentage = Math.round((entry.score || 0) * 100);
  const scoreColor = getScoreColor(entry.score || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>

        <Animated.View 
          entering={FadeIn.delay(200)}
          style={styles.scoreContainer}
        >
          <Animated.View style={[styles.scoreCircle, scoreStyle]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {scorePercentage}
            </Text>
            <Text style={styles.scoreLabel}>Daily Score</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View 
          entering={FadeIn.delay(400)}
          style={styles.feedbackContainer}
        >
          {entry.reasoning && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Analysis</Text>
              <Text style={styles.feedbackText}>{entry.reasoning}</Text>
            </View>
          )}

          {entry.focus_tomorrow && (
            <View style={styles.section}>
              <View style={styles.focusHeader}>
                <Ionicons name="flag" size={20} color="#0A84FF" />
                <Text style={styles.sectionTitle}>Tomorrow's Focus</Text>
              </View>
              <View style={styles.focusPill}>
                <Text style={styles.focusText}>{entry.focus_tomorrow}</Text>
              </View>
            </View>
          )}

          {entry.recommendations && Array.isArray(entry.recommendations) && entry.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {(entry.recommendations as string[]).map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#0A84FF" />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View 
          entering={FadeIn.delay(600)}
          style={styles.footer}
        >
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => {/* TODO: Implement share */}}
          >
            <Ionicons name="share-outline" size={24} color="#0A84FF" />
            <Text style={styles.shareButtonText}>Share Progress</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 16,
    marginRight: -16,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  feedbackContainer: {
    marginTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  focusPill: {
    backgroundColor: '#E8F3FF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
  },
  focusText: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: '500',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0A84FF',
  },
  shareButtonText: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: '600',
  },
}); 