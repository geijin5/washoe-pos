import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { X, DollarSign, CreditCard } from 'lucide-react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { useTabletLayout } from '@/hooks/use-tablet-layout';
import { CartItem } from '@/types/pos';
import * as Haptics from 'expo-haptics';

interface PaymentScreenProps {
  cart: CartItem[];
  onClose: () => void;
  onPayment: (method: 'cash' | 'card', cashAmount?: string) => void;
  creditCardFeePercent: number;
  department?: 'box-office' | 'candy-counter';
}

export function PaymentScreen({
  cart,
  onClose,
  onPayment,
  creditCardFeePercent,
  department
}: PaymentScreenProps) {
  const { isTablet } = useTabletLayout();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [showCashInput, setShowCashInput] = useState(false);

  // Calculate totals based on selected payment method and department breakdown
  const totals = React.useMemo(() => {
    // Separate items by category
    const ticketItems = cart.filter(item => item.product.category === 'tickets');
    const nonTicketItems = cart.filter(item => item.product.category !== 'tickets');
    
    const ticketSubtotal = ticketItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const nonTicketSubtotal = nonTicketItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const subtotal = ticketSubtotal + nonTicketSubtotal;
    
    const creditCardFee = paymentMethod === 'card' ? subtotal * (creditCardFeePercent / 100) : 0;
    const total = subtotal + creditCardFee;
    
    // Determine if tickets are being sold through candy counter (after closing)
    const isAfterClosing = department === 'candy-counter' && ticketItems.length > 0;
    
    return { 
      subtotal, 
      creditCardFee, 
      total,
      ticketSubtotal,
      nonTicketSubtotal,
      hasTicketItems: ticketItems.length > 0,
      hasNonTicketItems: nonTicketItems.length > 0,
      isAfterClosing
    };
  }, [cart, paymentMethod, creditCardFeePercent, department]);

  const handlePaymentMethodChange = async (method: 'cash' | 'card') => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPaymentMethod(method);
  };

  const handleQuickAmount = async (amount: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCashAmount(amount.toString());
  };

  const handleExactChange = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCashAmount(totals.total.toFixed(2));
  };

  const handlePayment = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onPayment(paymentMethod, cashAmount);
  };

  const canProceed = paymentMethod === 'card' || 
    (paymentMethod === 'cash' && cashAmount && parseFloat(cashAmount) >= totals.total);

  const change = cashAmount && parseFloat(cashAmount) >= totals.total 
    ? parseFloat(cashAmount) - totals.total 
    : 0;

  const isTabletFullscreen = isTablet;

  if (isTabletFullscreen) {
    return (
      <View style={styles.overlay}>
        <View style={styles.tabletContainer}>
          {/* Header */}
          <View style={styles.tabletHeader}>
            <Text style={styles.tabletTitle}>Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={28} color={TheatreColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabletContent}>
            {/* Left Column - Cart */}
            <View style={styles.tabletLeftColumn}>
              <Text style={styles.tabletSectionTitle}>Order Summary</Text>
              <ScrollView style={styles.tabletCartScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.tabletOrderItems}>
                  {cart.map((item, index) => (
                    <View key={`${item.product.id}-${index}`} style={styles.tabletOrderItem}>
                      <Text style={styles.tabletItemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.tabletItemQuantity}>×{item.quantity}</Text>
                      <Text style={styles.tabletItemPrice}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Middle Column - Calculations */}
            <View style={styles.tabletMiddleColumn}>
              <Text style={styles.tabletSectionTitle}>Payment Calculations</Text>
              
              <ScrollView 
                style={styles.tabletCalculationsScroll} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.tabletCalculationsScrollContent}
              >
                {/* Department Breakdown - Compact */}
                <View style={styles.tabletCalculationsContainerCompact}>
                {/* Box Office Section - Only show if department is box-office */}
                {department === 'box-office' && totals.hasTicketItems && (
                  <View style={styles.tabletCalculationSectionCompact}>
                    <Text style={styles.tabletCalculationTitleCompact}>Box Office</Text>
                    <View style={styles.tabletCalculationRowCompact}>
                      <Text style={styles.tabletCalculationLabelCompact}>Tickets:</Text>
                      <Text style={styles.tabletCalculationValueCompact}>${totals.ticketSubtotal.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
                
                {/* Candy Counter Section - Show concessions */}
                {department === 'candy-counter' && totals.hasNonTicketItems && (
                  <View style={styles.tabletCalculationSectionCompact}>
                    <Text style={styles.tabletCalculationTitleCompact}>Candy Counter</Text>
                    <View style={styles.tabletCalculationRowCompact}>
                      <Text style={styles.tabletCalculationLabelCompact}>Concessions:</Text>
                      <Text style={styles.tabletCalculationValueCompact}>${totals.nonTicketSubtotal.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
                
                {/* After Closing Section - Show tickets sold through candy counter */}
                {totals.isAfterClosing && (
                  <View style={styles.tabletCalculationSectionCompact}>
                    <Text style={styles.tabletCalculationTitleCompact}>After Closing</Text>
                    <View style={styles.tabletCalculationRowCompact}>
                      <Text style={styles.tabletCalculationLabelCompact}>Tickets:</Text>
                      <Text style={styles.tabletCalculationValueCompact}>${totals.ticketSubtotal.toFixed(2)}</Text>
                    </View>
                    {paymentMethod === 'card' && (
                      <View style={styles.tabletCalculationRowCompact}>
                        <Text style={styles.tabletCalculationLabelCompact}>Card Fees:</Text>
                        <Text style={styles.tabletCalculationValueCompact}>${(totals.ticketSubtotal * (creditCardFeePercent / 100)).toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Summary Calculations - Compact */}
              <View style={styles.tabletSummaryContainerCompact}>
                <View style={styles.tabletSummaryRowCompact}>
                  <Text style={styles.tabletSummaryLabelCompact}>Subtotal:</Text>
                  <Text style={styles.tabletSummaryValueCompact}>${totals.subtotal.toFixed(2)}</Text>
                </View>
                
                {paymentMethod === 'card' && totals.creditCardFee > 0 && (
                  <View style={styles.tabletSummaryRowCompact}>
                    <Text style={styles.tabletSummaryLabelCompact}>Card Fee ({creditCardFeePercent}%):</Text>
                    <Text style={styles.tabletSummaryValueCompact}>${totals.creditCardFee.toFixed(2)}</Text>
                  </View>
                )}
                
                <View style={[styles.tabletSummaryRowCompact, styles.tabletTotalSummaryRowCompact]}>
                  <Text style={styles.tabletTotalSummaryLabelCompact}>TOTAL:</Text>
                  <Text style={styles.tabletTotalSummaryValueCompact}>${totals.total.toFixed(2)}</Text>
                </View>
              </View>

                {/* Change Display - Compact */}
                {change > 0 && (
                  <View style={styles.tabletChangeDisplayContainerCompact}>
                    <View style={styles.tabletChangeDisplayRowCompact}>
                      <Text style={styles.tabletChangeDisplayLabelCompact}>Change Due:</Text>
                      <Text style={styles.tabletChangeDisplayAmountCompact}>${change.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Right Column - Payment Options */}
            <View style={styles.tabletRightColumn}>
              {/* Payment Method Selection */}
              <View style={styles.tabletPaymentMethodSection}>
                <Text style={styles.tabletSectionTitle}>Payment Method</Text>
                <View style={styles.tabletPaymentMethodsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tabletPaymentMethodButton,
                      paymentMethod === 'cash' && styles.tabletPaymentMethodActive
                    ]}
                    onPress={() => handlePaymentMethodChange('cash')}
                  >
                    <DollarSign 
                      size={28} 
                      color={paymentMethod === 'cash' ? TheatreColors.background : TheatreColors.text} 
                    />
                    <Text style={[
                      styles.tabletPaymentMethodText,
                      paymentMethod === 'cash' && styles.tabletPaymentMethodTextActive
                    ]}>Cash</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.tabletPaymentMethodButton,
                      paymentMethod === 'card' && styles.tabletPaymentMethodActive
                    ]}
                    onPress={() => handlePaymentMethodChange('card')}
                  >
                    <CreditCard 
                      size={28} 
                      color={paymentMethod === 'card' ? TheatreColors.background : TheatreColors.text} 
                    />
                    <Text style={[
                      styles.tabletPaymentMethodText,
                      paymentMethod === 'card' && styles.tabletPaymentMethodTextActive
                    ]}>Card</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cash Payment Options */}
              {paymentMethod === 'cash' && (
                <View style={styles.tabletCashSection}>
                  <Text style={styles.tabletSectionTitle}>Cash Amount</Text>
                  
                  {/* Quick Amount Buttons - Compact Grid */}
                  <View style={styles.tabletQuickAmountsCompact}>
                    <Text style={styles.tabletQuickAmountLabel}>Quick Amount:</Text>
                    <View style={styles.tabletQuickAmountButtonsGrid}>
                      {[5, 10, 20, 50, 100].map(amount => (
                        <TouchableOpacity
                          key={amount}
                          style={[
                            styles.tabletQuickAmountButtonCompact,
                            parseFloat(cashAmount) === amount && styles.tabletQuickAmountButtonActive
                          ]}
                          onPress={() => handleQuickAmount(amount)}
                        >
                          <Text style={[
                            styles.tabletQuickAmountButtonTextCompact,
                            parseFloat(cashAmount) === amount && styles.tabletQuickAmountButtonTextActive
                          ]}>${amount}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Exact Change Button - Compact */}
                  <TouchableOpacity 
                    style={[
                      styles.tabletExactChangeButtonCompact,
                      parseFloat(cashAmount) === totals.total && styles.tabletExactChangeButtonActive
                    ]}
                    onPress={handleExactChange}
                  >
                    <Text style={[
                      styles.tabletExactChangeButtonTextCompact,
                      parseFloat(cashAmount) === totals.total && styles.tabletExactChangeButtonTextActive
                    ]}>Exact Change (${totals.total.toFixed(2)})</Text>
                  </TouchableOpacity>
                  
                  {/* Custom Amount Input - Compact */}
                  <TouchableOpacity 
                    style={styles.tabletCustomAmountButtonCompact}
                    onPress={() => setShowCashInput(!showCashInput)}
                  >
                    <Text style={styles.tabletCustomAmountButtonTextCompact}>
                      {showCashInput ? 'Hide Custom' : 'Custom Amount'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showCashInput && (
                    <View style={styles.tabletCashInputContainerCompact}>
                      <Text style={styles.tabletCashInputLabelCompact}>Cash Received:</Text>
                      <TextInput
                        style={styles.tabletCashInputCompact}
                        placeholder="Enter amount"
                        placeholderTextColor={TheatreColors.textSecondary}
                        value={cashAmount}
                        onChangeText={setCashAmount}
                        keyboardType="decimal-pad"
                        autoFocus
                        returnKeyType="done"
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Payment Button - Fixed at bottom */}
              <View style={styles.tabletFooter}>
                <TouchableOpacity 
                  style={[
                    styles.tabletPayButton,
                    !canProceed && styles.tabletPayButtonDisabled
                  ]}
                  onPress={handlePayment}
                  disabled={!canProceed}
                >
                  <Text style={[
                    styles.tabletPayButtonText,
                    !canProceed && styles.tabletPayButtonTextDisabled
                  ]}>
                    {paymentMethod === 'cash' 
                      ? (!cashAmount ? 'Select Cash Amount' : 
                         parseFloat(cashAmount) < totals.total ? 'Insufficient Cash' : 
                         'Complete Cash Payment')
                      : 'Pay with Card'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Mobile/Portrait layout (improved for phone screens)
  return (
    <View style={styles.overlay}>
      <View style={styles.mobileContainer}>
        {/* Header */}
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileTitle}>Payment</Text>
          <TouchableOpacity onPress={onClose} style={styles.mobileCloseButton}>
            <X size={24} color={TheatreColors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.mobileScrollContent} 
          contentContainerStyle={styles.mobileScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary - Compact */}
          <View style={styles.mobileSection}>
            <Text style={styles.mobileSectionTitle}>Order Summary</Text>
            <View style={styles.mobileOrderItems}>
              {cart.map((item, index) => (
                <View key={`${item.product.id}-${index}`} style={styles.mobileOrderItem}>
                  <View style={styles.mobileItemInfo}>
                    <Text style={styles.mobileItemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.mobileItemQuantity}>×{item.quantity}</Text>
                  </View>
                  <Text style={styles.mobileItemPrice}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment Calculations - Compact */}
          <View style={styles.mobileSection}>
            <Text style={styles.mobileSectionTitle}>Payment Breakdown</Text>
            
            <View style={styles.mobileBreakdown}>
              {/* Department Breakdown - Simplified for mobile */}
              {/* Box Office - Only show if department is box-office */}
              {department === 'box-office' && totals.hasTicketItems && (
                <View style={styles.mobileBreakdownRow}>
                  <Text style={styles.mobileBreakdownLabel}>Box Office:</Text>
                  <Text style={styles.mobileBreakdownValue}>${totals.ticketSubtotal.toFixed(2)}</Text>
                </View>
              )}
              
              {/* Candy Counter - Show concessions */}
              {department === 'candy-counter' && totals.hasNonTicketItems && (
                <View style={styles.mobileBreakdownRow}>
                  <Text style={styles.mobileBreakdownLabel}>Candy Counter:</Text>
                  <Text style={styles.mobileBreakdownValue}>${totals.nonTicketSubtotal.toFixed(2)}</Text>
                </View>
              )}
              
              {/* After Closing - Show tickets sold through candy counter */}
              {totals.isAfterClosing && (
                <>
                  <View style={styles.mobileBreakdownRow}>
                    <Text style={styles.mobileBreakdownLabel}>After Closing:</Text>
                    <Text style={styles.mobileBreakdownValue}>${totals.ticketSubtotal.toFixed(2)}</Text>
                  </View>
                  {paymentMethod === 'card' && (
                    <View style={styles.mobileBreakdownRow}>
                      <Text style={styles.mobileBreakdownLabel}>After Closing Card Fees:</Text>
                      <Text style={styles.mobileBreakdownValue}>${(totals.ticketSubtotal * (creditCardFeePercent / 100)).toFixed(2)}</Text>
                    </View>
                  )}
                </>
              )}
              
              {/* Subtotal */}
              <View style={[styles.mobileBreakdownRow, styles.mobileSubtotalRow]}>
                <Text style={styles.mobileBreakdownLabel}>Subtotal:</Text>
                <Text style={styles.mobileBreakdownValue}>${totals.subtotal.toFixed(2)}</Text>
              </View>
              
              {/* Credit Card Fee */}
              {paymentMethod === 'card' && totals.creditCardFee > 0 && (
                <View style={styles.mobileBreakdownRow}>
                  <Text style={styles.mobileBreakdownLabel}>
                    Card Fee ({creditCardFeePercent}%):
                  </Text>
                  <Text style={styles.mobileBreakdownValue}>
                    ${totals.creditCardFee.toFixed(2)}
                  </Text>
                </View>
              )}
              
              {/* Total */}
              <View style={[styles.mobileBreakdownRow, styles.mobileTotalRow]}>
                <Text style={styles.mobileTotalLabel}>TOTAL:</Text>
                <Text style={styles.mobileTotalValue}>${totals.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection - Improved for mobile */}
          <View style={styles.mobileSection}>
            <Text style={styles.mobileSectionTitle}>Payment Method</Text>
            <View style={styles.mobilePaymentMethods}>
              <TouchableOpacity
                style={[
                  styles.mobilePaymentMethodButton,
                  paymentMethod === 'cash' && styles.mobilePaymentMethodActive
                ]}
                onPress={() => handlePaymentMethodChange('cash')}
              >
                <DollarSign 
                  size={24} 
                  color={paymentMethod === 'cash' ? TheatreColors.background : TheatreColors.text} 
                />
                <Text style={[
                  styles.mobilePaymentMethodText,
                  paymentMethod === 'cash' && styles.mobilePaymentMethodTextActive
                ]}>Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.mobilePaymentMethodButton,
                  paymentMethod === 'card' && styles.mobilePaymentMethodActive
                ]}
                onPress={() => handlePaymentMethodChange('card')}
              >
                <CreditCard 
                  size={24} 
                  color={paymentMethod === 'card' ? TheatreColors.background : TheatreColors.text} 
                />
                <Text style={[
                  styles.mobilePaymentMethodText,
                  paymentMethod === 'card' && styles.mobilePaymentMethodTextActive
                ]}>Card</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cash Payment Options - Optimized for mobile */}
          {paymentMethod === 'cash' && (
            <View style={styles.mobileSection}>
              <Text style={styles.mobileSectionTitle}>Cash Amount</Text>
              
              {/* Quick Amount Buttons - Better mobile layout */}
              <View style={styles.mobileQuickAmounts}>
                <Text style={styles.mobileQuickAmountLabel}>Quick Amount:</Text>
                <View style={styles.mobileQuickAmountButtons}>
                  {[5, 10, 20, 50, 100].map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.mobileQuickAmountButton,
                        parseFloat(cashAmount) === amount && styles.mobileQuickAmountButtonActive
                      ]}
                      onPress={() => handleQuickAmount(amount)}
                    >
                      <Text style={[
                        styles.mobileQuickAmountButtonText,
                        parseFloat(cashAmount) === amount && styles.mobileQuickAmountButtonTextActive
                      ]}>${amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Exact Change Button */}
              <TouchableOpacity 
                style={[
                  styles.mobileExactChangeButton,
                  parseFloat(cashAmount) === totals.total && styles.mobileExactChangeButtonActive
                ]}
                onPress={handleExactChange}
              >
                <Text style={[
                  styles.mobileExactChangeButtonText,
                  parseFloat(cashAmount) === totals.total && styles.mobileExactChangeButtonTextActive
                ]}>Exact Change (${totals.total.toFixed(2)})</Text>
              </TouchableOpacity>
              
              {/* Custom Amount Input */}
              <TouchableOpacity 
                style={styles.mobileCustomAmountButton}
                onPress={() => setShowCashInput(!showCashInput)}
              >
                <Text style={styles.mobileCustomAmountButtonText}>
                  {showCashInput ? 'Hide Custom Amount' : 'Enter Custom Amount'}
                </Text>
              </TouchableOpacity>
              
              {showCashInput && (
                <View style={styles.mobileCashInputContainer}>
                  <Text style={styles.mobileCashInputLabel}>Cash Received:</Text>
                  <TextInput
                    style={styles.mobileCashInput}
                    placeholder="Enter amount"
                    placeholderTextColor={TheatreColors.textSecondary}
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                    returnKeyType="done"
                  />
                </View>
              )}
              
              {/* Change Display */}
              {change > 0 && (
                <View style={styles.mobileChangeContainer}>
                  <Text style={styles.mobileChangeLabel}>Change Due:</Text>
                  <Text style={styles.mobileChangeAmount}>${change.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Fixed Payment Button at Bottom */}
        <View style={styles.mobileFooter}>
          <TouchableOpacity 
            style={[
              styles.mobilePayButton,
              !canProceed && styles.mobilePayButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={!canProceed}
          >
            <Text style={[
              styles.mobilePayButtonText,
              !canProceed && styles.mobilePayButtonTextDisabled
            ]}>
              {paymentMethod === 'cash' 
                ? (!cashAmount ? 'Select Cash Amount' : 
                   parseFloat(cashAmount) < totals.total ? 'Insufficient Cash' : 
                   'Complete Cash Payment')
                : 'Pay with Card'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  // Mobile-specific styles for better phone experience
  mobileContainer: {
    backgroundColor: TheatreColors.background,
    borderRadius: 20,
    width: '95%',
    height: '95%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  mobileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  mobileCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  mobileScrollContent: {
    flex: 1,
  },
  mobileScrollContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  mobileSection: {
    marginBottom: 16,
  },
  mobileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  mobileOrderItems: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 12,
    maxHeight: 120,
  },
  mobileOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  mobileItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileItemName: {
    flex: 1,
    fontSize: 16,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  mobileItemQuantity: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    fontWeight: '600',
    minWidth: 30,
  },
  mobileItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    minWidth: 80,
    textAlign: 'right',
  },
  mobileBreakdown: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 12,
  },
  mobileBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mobileBreakdownLabel: {
    fontSize: 16,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  mobileBreakdownValue: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  mobileSubtotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  mobileTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: TheatreColors.accent,
    backgroundColor: TheatreColors.surfaceLight,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mobileTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  mobileTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  mobilePaymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  mobilePaymentMethodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mobilePaymentMethodActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  mobilePaymentMethodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  mobilePaymentMethodTextActive: {
    color: TheatreColors.background,
  },
  mobileQuickAmounts: {
    marginBottom: 8,
  },
  mobileQuickAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  mobileQuickAmountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileQuickAmountButton: {
    flex: 1,
    minWidth: '18%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileQuickAmountButtonActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  mobileQuickAmountButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  mobileQuickAmountButtonTextActive: {
    color: TheatreColors.background,
  },
  mobileExactChangeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  mobileExactChangeButtonActive: {
    backgroundColor: '#45a049',
    borderColor: '#45a049',
  },
  mobileExactChangeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  mobileExactChangeButtonTextActive: {
    color: TheatreColors.background,
  },
  mobileCustomAmountButton: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  mobileCustomAmountButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  mobileCashInputContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mobileCashInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  mobileCashInput: {
    backgroundColor: TheatreColors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    textAlign: 'center',
    minHeight: 56,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mobileChangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  mobileChangeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mobileChangeAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mobileFooter: {
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
  },
  mobilePayButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minHeight: 56,
  },
  mobilePayButtonDisabled: {
    backgroundColor: TheatreColors.surface,
    opacity: 0.6,
  },
  mobilePayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  mobilePayButtonTextDisabled: {
    color: TheatreColors.textSecondary,
  },
  // Tablet full-screen styles
  tabletContainer: {
    backgroundColor: TheatreColors.background,
    width: '95%',
    height: '95%',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  tabletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  tabletTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  tabletContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  tabletLeftColumn: {
    flex: 0.7,
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 12,
  },
  tabletMiddleColumn: {
    flex: 0.9,
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 12,
    maxHeight: '100%',
  },
  tabletRightColumn: {
    flex: 1.1,
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  tabletSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  tabletCartScroll: {
    flex: 1,
  },
  tabletOrderItems: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  tabletOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  tabletItemName: {
    flex: 2,
    fontSize: 14,
    color: TheatreColors.text,
  },
  tabletItemQuantity: {
    flex: 1,
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  tabletItemPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    textAlign: 'right',
  },
  tabletCalculationsContainer: {
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabletCalculationsContainerCompact: {
    backgroundColor: TheatreColors.background,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabletCalculationsScroll: {
    flex: 1,
  },
  tabletCalculationsScrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  tabletCalculationSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  tabletCalculationSectionCompact: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  tabletCalculationHeader: {
    marginBottom: 8,
  },
  tabletCalculationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    textAlign: 'center',
  },
  tabletCalculationTitleCompact: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    textAlign: 'center',
    marginBottom: 3,
  },
  tabletCalculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabletCalculationRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  tabletCalculationLabel: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  tabletCalculationLabelCompact: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  tabletCalculationValue: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletCalculationValueCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletSummaryContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
  },
  tabletSummaryContainerCompact: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  tabletSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabletSummaryRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  tabletSummaryLabel: {
    fontSize: 18,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  tabletSummaryLabelCompact: {
    fontSize: 13,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  tabletSummaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletSummaryValueCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletTotalSummaryRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: TheatreColors.accent,
  },
  tabletTotalSummaryRowCompact: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: TheatreColors.accent,
  },
  tabletTotalSummaryLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  tabletTotalSummaryLabelCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  tabletTotalSummaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  tabletTotalSummaryValueCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  tabletChangeDisplayContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tabletChangeDisplayContainerCompact: {
    backgroundColor: '#E8F5E8',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  tabletChangeDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabletChangeDisplayRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabletChangeDisplayLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tabletChangeDisplayLabelCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tabletChangeDisplayAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tabletChangeDisplayAmountCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tabletSection: {
    marginBottom: 24,
  },
  tabletPaymentMethodSection: {
    marginBottom: 16,
  },
  tabletCashSection: {
    flex: 1,
    marginBottom: 16,
  },
  tabletPaymentMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tabletPaymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    backgroundColor: TheatreColors.background,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabletPaymentMethodActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  tabletPaymentMethodText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  tabletPaymentMethodTextActive: {
    color: TheatreColors.background,
  },
  tabletQuickAmounts: {
    marginBottom: 16,
  },
  tabletQuickAmountsCompact: {
    marginBottom: 12,
  },
  tabletQuickAmountLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  tabletQuickAmountButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  tabletQuickAmountButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabletQuickAmountButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    backgroundColor: TheatreColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletQuickAmountButtonCompact: {
    flex: 1,
    minWidth: '18%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    backgroundColor: TheatreColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletQuickAmountButtonActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  tabletQuickAmountButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  tabletQuickAmountButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  tabletQuickAmountButtonTextActive: {
    color: TheatreColors.background,
  },
  tabletExactChangeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tabletExactChangeButtonCompact: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tabletExactChangeButtonActive: {
    backgroundColor: '#45a049',
    borderColor: '#45a049',
  },
  tabletExactChangeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  tabletExactChangeButtonTextCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  tabletExactChangeButtonTextActive: {
    color: TheatreColors.background,
  },
  tabletCustomAmountButton: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
  },
  tabletCustomAmountButtonCompact: {
    backgroundColor: TheatreColors.background,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
  },
  tabletCustomAmountButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletCustomAmountButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  tabletCashInputContainer: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tabletCashInputContainerCompact: {
    backgroundColor: TheatreColors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  tabletCashInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  tabletCashInputLabelCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 6,
  },
  tabletCashInput: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    textAlign: 'center',
  },
  tabletCashInputCompact: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    textAlign: 'center',
    minHeight: 44,
  },
  tabletFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
    marginTop: 'auto',
  },
  tabletPayButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minHeight: 56,
  },
  tabletPayButtonDisabled: {
    backgroundColor: TheatreColors.surfaceLight,
    opacity: 0.6,
  },
  tabletPayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  tabletPayButtonTextDisabled: {
    color: TheatreColors.textSecondary,
  },
  departmentSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  departmentSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 8,
  },
  mobileDepartmentSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  mobileDepartmentSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 6,
  },
  subtotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  closeButton: {
    padding: 8,
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
    marginBottom: 12,
  },
  orderItems: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  itemName: {
    flex: 2,
    fontSize: 16,
    color: TheatreColors.text,
  },
  itemQuantity: {
    flex: 1,
    fontSize: 16,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    textAlign: 'right',
  },
  breakdown: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
    gap: 12,
  },
  paymentMethodActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  paymentMethodText: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  paymentMethodTextActive: {
    color: TheatreColors.background,
  },
  quickAmounts: {
    marginBottom: 16,
  },
  quickAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '18%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  quickAmountButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  quickAmountButtonTextActive: {
    color: TheatreColors.background,
  },
  exactChangeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  exactChangeButtonActive: {
    backgroundColor: '#45a049',
    borderColor: '#45a049',
  },
  exactChangeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  exactChangeButtonTextActive: {
    color: TheatreColors.background,
  },
  customAmountButton: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  customAmountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  cashInputContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cashInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  cashInput: {
    backgroundColor: TheatreColors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    textAlign: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  changeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  changeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  payButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: TheatreColors.surface,
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  payButtonTextDisabled: {
    color: TheatreColors.textSecondary,
  },
});