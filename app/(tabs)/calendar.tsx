import { useAuth } from '@/contexts/AuthContext';
import { Entry } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DayData {
  date: string;
  score: number | null;
  entry?: Entry;
}

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMonthData();
    }
  }, [user, currentMonth]);

  const fetchMonthData = async () => {
    if (!user) return;

    setLoading(true);
    
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);

    if (data && !error) {
      // Create array of all days in month
      const daysInMonth = endOfMonth.getDate();
      const monthDays: DayData[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = date.toISOString().split('T')[0];
        const entry = data.find(e => e.date === dateString);
        
        monthDays.push({
          date: dateString,
          score: entry?.score ?? null,
          entry: entry,
        });
      }
      
      setMonthData(monthDays);
      
      // Calculate monthly average
      const validScores = data.filter(e => e.score !== null).map(e => e.score as number);
      if (validScores.length > 0) {
        const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
        setMonthlyAverage(avg);
      } else {
        setMonthlyAverage(null);
      }
    }
    
    setLoading(false);
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return '#D1D1D6'; // Grey for no data
    if (score >= 0.95) return '#32D74B'; // Green
    if (score >= 0.7) return '#FFD60A'; // Yellow
    if (score >= 0.5) return '#FF9F0A'; // Orange
    return '#FF453A'; // Red
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const openDayDetails = (day: DayData) => {
    if (day.entry) {
      setSelectedEntry(day.entry);
      setShowDetails(true);
    }
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth('prev')}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.monthName}>{monthName}</Text>
          <TouchableOpacity onPress={() => changeMonth('next')}>
            <Ionicons name="chevron-forward" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {monthlyAverage !== null && (
          <View style={styles.averageContainer}>
            <Text style={styles.averageLabel}>Monthly Average:</Text>
            <Text style={[styles.averageScore, { color: getScoreColor(monthlyAverage) }]}>
              {Math.round(monthlyAverage * 100)}%
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.weekDaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.dayCell} />
            ))}
            
            {/* Calendar days */}
            {monthData.map((day, index) => (
              <TouchableOpacity
                key={day.date}
                style={styles.dayCell}
                onPress={() => openDayDetails(day)}
                disabled={!day.entry}
              >
                <View style={[
                  styles.daySquare,
                  { backgroundColor: getScoreColor(day.score) }
                ]}>
                  <Text style={styles.dayNumber}>{index + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Score Legend</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#32D74B' }]} />
                <Text style={styles.legendText}>95-100</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FFD60A' }]} />
                <Text style={styles.legendText}>70-94</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9F0A' }]} />
                <Text style={styles.legendText}>50-69</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF453A' }]} />
                <Text style={styles.legendText}>&lt;50</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#D1D1D6' }]} />
                <Text style={styles.legendText}>No data</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Day Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Day Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {selectedEntry && (
              <>
                <Text style={styles.modalDate}>
                  {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                
                <View style={styles.modalScore}>
                  <Text style={styles.modalScoreLabel}>Score:</Text>
                  <Text style={[
                    styles.modalScoreValue,
                    { color: getScoreColor(selectedEntry.score) }
                  ]}>
                    {Math.round((selectedEntry.score || 0) * 100)}%
                  </Text>
                </View>

                {selectedEntry.journal_text && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Journal Entry</Text>
                    <Text style={styles.modalText}>{selectedEntry.journal_text}</Text>
                  </View>
                )}

                {selectedEntry.reasoning && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Analysis</Text>
                    <Text style={styles.modalText}>{selectedEntry.reasoning}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  averageLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  averageScore: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 14,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  daySquare: {
    flex: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  legend: {
    marginTop: 40,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  modalDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalScoreLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  modalScoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
}); 