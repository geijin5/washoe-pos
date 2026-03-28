import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { useAuth } from '@/hooks/auth-store';
import { Order } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { Calendar, DollarSign, Package, TrendingUp } from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';

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
              {item.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}
            </Text>
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

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.ordersList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Calendar size={48} color={TheatreColors.textSecondary} />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Complete your first sale to see it here</Text>
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