import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CartItem as CartItemType } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const itemTotal = item.product.price * item.quantity;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.product.name}</Text>
        <Text style={styles.price}>
          ${item.product.price.toFixed(2)} × {item.quantity} = ${itemTotal.toFixed(2)}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onUpdateQuantity(item.quantity - 1)}
        >
          <Minus size={18} color={TheatreColors.text} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onUpdateQuantity(item.quantity + 1)}
        >
          <Plus size={18} color={TheatreColors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={onRemove}
        >
          <Trash2 size={18} color={TheatreColors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    padding: TabletUtils.getResponsivePadding(12, 16),
    borderRadius: 8,
    marginBottom: TabletUtils.getResponsivePadding(8, 12),
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  price: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: TheatreColors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TabletUtils.getResponsivePadding(8, 12),
  },
  button: {
    width: TabletUtils.getResponsivePadding(32, 40),
    height: TabletUtils.getResponsivePadding(32, 40),
    borderRadius: TabletUtils.getResponsivePadding(16, 20),
    backgroundColor: TheatreColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 8,
  },
  quantity: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: 'bold',
    color: TheatreColors.text,
    minWidth: TabletUtils.getResponsivePadding(24, 32),
    textAlign: 'center',
  },
});