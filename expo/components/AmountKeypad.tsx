import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { TheatreColors } from '@/constants/theatre-colors';

// On-screen number pad for cash amounts. Used instead of the system keyboard so entry
// works the same on every device and nothing covers the screen.

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];
const MAX_WHOLE_DIGITS = 6;

// Keep amounts numeric: digits and one decimal point, max two decimal places
export const sanitizeAmount = (text: string): string => {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
};

interface AmountKeypadProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function AmountKeypad({ value, onChange, compact }: AmountKeypadProps) {
  const handleKey = (key: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && value.includes('.')) return;
    const next = sanitizeAmount(key === '.' && value === '' ? '0.' : value + key);
    if (next.split('.')[0].length > MAX_WHOLE_DIGITS) return;
    // Drop leading zeros ("05" -> "5") but keep "0." for cents
    onChange(next.length > 1 && next.startsWith('0') && next[1] !== '.' ? next.slice(1) : next);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map(key => (
        <TouchableOpacity
          key={key}
          style={[styles.key, compact && styles.keyCompact, key === 'back' && styles.keyBack]}
          onPress={() => handleKey(key)}
          onLongPress={key === 'back' ? () => onChange('') : undefined}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={key === 'back' ? 'Backspace (hold to clear)' : key}
        >
          {key === 'back' ? (
            <Delete size={compact ? 20 : 24} color={TheatreColors.text} />
          ) : (
            <Text style={[styles.keyText, compact && styles.keyTextCompact]}>{key}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 12,
  },
  key: {
    width: '31.5%',
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: TheatreColors.background,
    borderWidth: 1.5,
    borderColor: TheatreColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCompact: {
    minHeight: 48,
  },
  keyBack: {
    backgroundColor: TheatreColors.surfaceLight,
  },
  keyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  keyTextCompact: {
    fontSize: 20,
  },
});
