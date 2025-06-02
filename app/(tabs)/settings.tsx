import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setUserProfile(data);
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const exportData = async () => {
    if (!user) return;

    setExportLoading(true);
    
    try {
      // Fetch all user entries
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csv = convertToCSV(entries || []);
      
      // Save to file
      const fileName = `twelve-export-${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csv);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert('Export Complete', 'File saved to: ' + filePath);
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const convertToCSV = (entries: any[]) => {
    if (entries.length === 0) return 'No data to export';

    // Headers
    const headers = ['Date', 'Score', 'Journal', 'Emotion', 'Focus Tomorrow'];
    let csv = headers.join(',') + '\n';

    // Data rows
    entries.forEach(entry => {
      const row = [
        entry.date,
        Math.round((entry.score || 0) * 100) + '%',
        `"${(entry.journal_text || '').replace(/"/g, '""')}"`,
        entry.emotion_summary || '',
        `"${(entry.focus_tomorrow || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{userProfile?.name || 'Not set'}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{userProfile?.email}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.label}>Timezone</Text>
              <Text style={styles.value}>{userProfile?.timezone || 'Not set'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Habits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habits</Text>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => {/* TODO: Navigate to habits management */}}
          >
            <Text style={styles.listItemText}>Manage Habits</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Daily Reminders</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E0E0E0', true: '#0A84FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemText}>Notification Times</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity 
            style={[styles.button, exportLoading && styles.buttonDisabled]}
            onPress={exportData}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Export Data (CSV)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Integrations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrations</Text>
          
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemText}>Connected Apps</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={[styles.buttonText, styles.signOutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Twelve v1.0.0</Text>
          <Text style={styles.tagline}>Your AI-Powered Habit Coach</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  profileInfo: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#0A84FF',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemText: {
    fontSize: 16,
    color: '#000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#000',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  signOutText: {
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#999',
  },
}); 