import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { useAuth } from '@/hooks/auth-store';
import { Order } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { Calendar, DollarSign, Package, Search, TrendingUp } from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';

type PaymentFilter = 'all' | 'cash' | 'card' | 'split';

const PAYMENT_FILTERS: { id: PaymentFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cash', label: '💵 Cash' },
  { id: 'card', label: '💳 Card' },
  { id: 'split', label: '💵💳 Split' },
];

export default function OrdersScreen() {
  return (
    <RoleGuard requiredPermission="canViewOrders">
      <OrdersContent />
    </RoleGuard>
  );
}

function OrdersContent() {
  const { orders, stats } = usePOS();
  const { canAccess } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter by payment method, then by order number, cashier or item name
  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter(order => {
      if (paymentFilter !== 'all' && (order.paymentMethod || 'cash') !== paymentFilter) return false;
      if (!query) return true;
      return (
        order.id.slice(-6).includes(query) ||
        (order.userName || '').toLowerCase().includes(query) ||
        order.items.some(i => i.product.name.toLowerCase().includes(query))
      );
    });
  }, [orders, paymentFilter, searchQuery]);

  const handleOrderPress = (order: Order) => {
    // Input validation
    if (!order || !order.id) {
      console.warn('Invalid order data provided');
      return;
    }
    
    // Only allow managers and admins to view order details
    if (canAccess(['manager', 'admin'])) {
      setSelectedOrder(order);
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const itemCount = item.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <TouchableOpacity 
        style={[
          styles.orderCard,
          canAccess(['manager', 'admin']) && styles.orderCardClickable
        ]}
        onPress={() => handleOrderPress(item)}
        disabled={!canAccess(['manager', 'admin'])}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
          <Text style={styles.orderDate}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={styles.orderDetails}>
          <Text style={styles.orderItems}>{itemCount} items</Text>
          <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
        </View>
        <View style={styles.orderFooter}>
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.paymentMethod}>
              {item.paymentMethod === 'cash' ? '💵 Cash' : item.paymentMethod === 'split' ? '💵💳 Split' : '💳 Card'}
            </Text>
            {item.paymentMethod === 'split' && item.splitPayment && (
              <Text style={styles.splitDetail}>
                Cash ${item.splitPayment.cashAmount.toFixed(2)} · Card ${(item.splitPayment.cardAmount + item.splitPayment.cardFee).toFixed(2)} (fee ${item.splitPayment.cardFee.toFixed(2)})
              </Text>
            )}
            {item.paymentMethod === 'card' && !!item.creditCardFee && item.creditCardFee > 0 && (
              <Text style={styles.splitDetail}>Card fee ${item.creditCardFee.toFixed(2)}</Text>
            )}
            {item.userName && (
              <Text style={styles.cashierName}>by {item.userName}</Text>
            )}
          </View>
          {canAccess(['manager', 'admin']) && (
            <Text style={styles.tapToView}>Tap to view details</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Dashboard */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <DollarSign size={24} color={TheatreColors.accent} />
          <Text style={styles.statValue}>${stats.totalSales.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Today&apos;s Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Package size={24} color={TheatreColors.accent} />
          <Text style={styles.statValue}>{stats.ordersToday}</Text>
          <Text style={styles.statLabel}>Orders Today</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color={TheatreColors.accent} />
          <Text style={styles.statValue}>${stats.averageOrderValue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Average Order</Text>
        </View>
      </View>

      {/* Search and payment filter */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={TheatreColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order #, cashier or item"
            placeholderTextColor={TheatreColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filterChips}>
          {PAYMENT_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, paymentFilter === filter.id && styles.filterChipActive]}
              onPress={() => setPaymentFilter(filter.id)}
            >
              <Text style={[styles.filterChipText, paymentFilter === filter.id && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={visibleOrders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.ordersList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Calendar size={48} color={TheatreColors.textSecondary} />
            <Text style={styles.emptyText}>{orders.length === 0 ? 'No orders yet' : 'No matching orders'}</Text>
            <Text style={styles.emptySubtext}>
              {orders.length === 0 ? 'Complete your first sale to see it here' : 'Try a different search or payment filter'}
            </Text>
          </View>
        }
      />
      
      <OrderDetailsModal
        visible={modalVisible}
        order={selectedOrder}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: TheatreColors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: TheatreColors.text,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  filterChipActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  filterChipTextActive: {
    color: TheatreColors.background,
  },
  ordersList: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderCardClickable: {
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  orderDate: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderItems: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodContainer: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 14,
    color: TheatreColors.text,
    marginBottom: 2,
  },
  splitDetail: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    marginBottom: 2,
  },
  cashierName: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    fontStyle: 'italic',
  },
  tapToView: {
    fontSize: 12,
    color: TheatreColors.accent,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
});