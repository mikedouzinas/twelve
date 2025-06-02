import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export function TabBarIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons size={24} name={name} color={color} />;
} 