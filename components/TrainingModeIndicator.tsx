import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { usePOS } from '@/hooks/pos-store';
import { TheatreColors } from '@/constants/theatre-colors';

export function TrainingModeIndicator() {
  const { isTrainingMode } = useAuth();
  const { settings } = usePOS();
  
  const isActive = isTrainingMode || settings.trainingMode;
  
  if (!isActive) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <GraduationCap size={20} color={TheatreColors.background} />
      <Text style={styles.text}>🎓 TRAINING MODE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  text: {
    color: TheatreColors.background,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
