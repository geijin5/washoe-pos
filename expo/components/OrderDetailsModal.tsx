import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Order, CartItem } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { X, Calendar, DollarSign, User, Package } from 'lucide-react-native';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailsModal({ visible, order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrderItem = ({ item }: { item: CartItem }) => {
    const itemTotal = item.product.price * item.quantity;
    
    return (
      <View style={styles.orderItem}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemTotal}>${itemTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemPrice}>${item.product.price.toFixed(2)} each</Text>
          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        </View>
        {item.product.description && (
          <Text style={styles.itemDescription}>{item.product.description}</Text>
        )}
        <View style={styles.itemCategory}>
          <Text style={styles.categoryText}>{item.product.category}</Text>
        </View>
      </View>
    );
  };

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Order Details</Text>
            <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={TheatreColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            
            <View style={styles.infoRow}>
              <Calendar size={20} color={TheatreColors.textSecondary} />
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDate(order.timestamp)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <DollarSign size={20} color={TheatreColors.textSecondary} />
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>
                {order.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}
              </Text>
            </View>
            
            {order.userName && (
              <View style={styles.infoRow}>
                <User size={20} color={TheatreColors.textSecondary} />
                <Text style={styles.infoLabel}>Cashier</Text>
                <Text style={styles.infoValue}>
                  {order.userName} {order.userRole && `(${order.userRole})`}
                </Text>
              </View>
            )}
            
            {order.department && (
              <View style={styles.infoRow}>
                <Package size={20} color={TheatreColors.textSecondary} />
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>
                  {order.department === 'box-office' ? 'Box Office' : 'Candy Counter'}
                  {order.isAfterClosing && ' (After Closing)'}
                </Text>
              </View>
            )}
            
            {order.showType && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Show Type</Text>
                <Text style={styles.infoValue}>
                  {order.showType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            )}
          </View>

          {/* Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({totalItems})</Text>
            <FlatList
              data={order.items}
              keyExtractor={(item, index) => `${item.product.id}-${index}`}
              renderItem={renderOrderItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          </View>

          {/* Totals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            
            {order.creditCardFee && order.creditCardFee > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Credit Card Fee</Text>
                <Text style={styles.totalValue}>${order.creditCardFee.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalLabel}>Total</Text>
              <Text style={styles.finalTotalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  infoLabel: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  orderItem: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    flex: 1,
    marginRight: 12,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  itemQuantity: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  itemCategory: {
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: TheatreColors.accent,
    backgroundColor: TheatreColors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'capitalize',
  },
  itemSeparator: {
    height: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  finalTotal: {
    borderTopWidth: 2,
    borderTopColor: TheatreColors.accent,
    paddingTop: 12,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
});