import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { useTabletLayout } from '@/hooks/use-tablet-layout';
import { Order } from '@/types/pos';

const getShowDisplayName = (show: string): string => {
  switch (show) {
    case '1st-show': return '1st Show';
    case '2nd-show': return '2nd Show';
    case 'nightly-show': return 'Nightly Show';
    case 'matinee': return 'Matinee';
    default: return show;
  }
};

interface OrderSummaryModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

export function OrderSummaryModal({ visible, order, onClose }: OrderSummaryModalProps) {
  const { isTablet } = useTabletLayout();

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          isTablet ? styles.tabletContainer : styles.mobileContainer
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <CheckCircle size={32} color="#4CAF50" />
              <View style={styles.headerText}>
                <Text style={styles.title}>Order Complete!</Text>
                <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={TheatreColors.text} />
            </TouchableOpacity>
          </View>

          {/* Order Details */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Items Ordered */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items Ordered</Text>
              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => (
                  <View key={`${item.product.id}-${index}`} style={styles.orderItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product.name}</Text>
                      <Text style={styles.itemCategory}>{item.product.category}</Text>
                    </View>
                    <View style={styles.itemQuantity}>
                      <Text style={styles.quantityText}>×{item.quantity}</Text>
                    </View>
                    <View style={styles.itemPrice}>
                      <Text style={styles.priceText}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
                </View>
                
                {order.creditCardFee && order.creditCardFee > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Card Fee:</Text>
                    <Text style={styles.summaryValue}>${order.creditCardFee.toFixed(2)}</Text>
                  </View>
                )}
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
                </View>
                
                <View style={styles.paymentMethodRow}>
                  <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                  <Text style={styles.paymentMethodValue}>
                    {order.paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Transaction Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(order.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                {order.userName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cashier:</Text>
                    <Text style={styles.detailValue}>{order.userName}</Text>
                  </View>
                )}
                
                {order.department && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>
                      {order.department === 'box-office' ? 'Box Office' : 'Candy Counter'}
                      {order.isAfterClosing && ' (After Closing)'}
                    </Text>
                  </View>
                )}
                
                {order.showType && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Show:</Text>
                    <Text style={styles.detailValue}>
                      {getShowDisplayName(order.showType)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={onClose}
            >
              <Text style={styles.continueButtonText}>Continue to Next Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  tabletContainer: {
    width: '80%',
    maxWidth: 800,
  },
  mobileContainer: {
    width: '95%',
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
    backgroundColor: '#E8F5E8',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
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
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  itemsContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  itemInfo: {
    flex: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textTransform: 'capitalize',
  },
  itemQuantity: {
    flex: 1,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    backgroundColor: TheatreColors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemPrice: {
    flex: 1,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  summaryContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: TheatreColors.accent,
    backgroundColor: TheatreColors.surfaceLight,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    backgroundColor: TheatreColors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  detailLabel: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: TheatreColors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
});