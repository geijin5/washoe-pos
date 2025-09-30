import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { ProductCard } from '@/components/ProductCard';
import { CategoryFilter } from '@/components/CategoryFilter';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';
import { useTabletLayout } from '@/hooks/use-tablet-layout';
import { Search, ShoppingCart, X, Ticket, Candy, Smartphone, TabletSmartphone, Grid3X3, List } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { PaymentScreen } from '@/components/PaymentScreen';
import { OrderSummaryModal } from '@/components/OrderSummaryModal';
import * as Haptics from 'expo-haptics';

type Department = 'box-office' | 'candy-counter' | null;
type ShowType = '1st-show' | '2nd-show' | 'nightly-show' | 'matinee' | null;

const getShowDisplayName = (show: string): string => {
  switch (show) {
    case '1st-show': return '1st Show';
    case '2nd-show': return '2nd Show';
    case 'nightly-show': return 'Nightly Show';
    case 'matinee': return 'Matinee';
    default: return show;
  }
};

export default function POSScreen() {
  const { user } = useAuth();
  const { isTablet, isLandscape, isFoldable, foldableState, deviceType, getProductGridColumns, getCartWidth } = useTabletLayout();
  const {
    filteredProducts,
    cart,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    checkout,
    calculateTotalsWithFee,
    settings,
    getCategoryMetadata,
    isTicketCategory,
  } = usePOS();

  const [showCart, setShowCart] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showChangeDisplay, setShowChangeDisplay] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number | null>(null);

  // All hooks must be called before any conditional returns
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products based on department selection
  const departmentFilteredProducts = React.useMemo(() => {
    if (!selectedDepartment) return filteredProducts;
    
    if (selectedDepartment === 'box-office') {
      const boxOfficeProducts = filteredProducts.filter(product => {
        // Check if it's a custom category marked as box office ticket
        const categoryMetadata = getCategoryMetadata(product.category);
        const isBoxOffice = categoryMetadata?.isBoxOfficeTicket === true;
        console.log(`🔍 Box Office Check - Product: ${product.name}, Category: ${product.category}, Metadata:`, categoryMetadata, `isBoxOffice: ${isBoxOffice}`);
        return isBoxOffice;
      });
      console.log(`📊 Box Office Products Found: ${boxOfficeProducts.length} out of ${filteredProducts.length} total products`);
      return boxOfficeProducts;
    } else if (selectedDepartment === 'candy-counter') {
      // Candy counter includes all products except box office tickets
      // But includes after-closing tickets and custom categories with after-closing checkbox
      const candyCounterProducts = filteredProducts.filter(product => {
        // Check custom category metadata
        const categoryMetadata = getCategoryMetadata(product.category);
        
        // Exclude custom categories marked as box office ticket only
        if (categoryMetadata?.isBoxOfficeTicket === true && !categoryMetadata?.isAfterClosingTicket) return false;
        
        // Include everything else (including after-closing tickets and after-closing categories)
        return true;
      });
      console.log(`📊 Candy Counter Products Found: ${candyCounterProducts.length} out of ${filteredProducts.length} total products`);
      return candyCounterProducts;
    }
    
    return filteredProducts;
  }, [filteredProducts, selectedDepartment, getCategoryMetadata]);

  const handleAddToCart = async (product: any) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    addToCart(product);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const handlePayment = async (method: 'cash' | 'card', cashAmount?: string) => {
    // Determine if this order contains tickets (which go to after-closing when sold in candy counter)
    const hasTickets = cart.some(item => isTicketCategory(item.product.category));
    
    // For mixed orders (tickets + other items), we need to handle them specially
    // The order will be processed as a candy counter order, but the report generation will split it
    const hasOtherItems = cart.some(item => !isTicketCategory(item.product.category));
    const isMixedOrder = hasTickets && hasOtherItems;
    
    // Pass show information for box office orders
    const showType = selectedDepartment === 'box-office' && selectedShow ? selectedShow as '1st-show' | '2nd-show' | 'nightly-show' | 'matinee' : undefined;
    
    const cashAmountTendered = method === 'cash' && cashAmount ? parseFloat(cashAmount) : undefined;
    const order = checkout(method, user?.id, user?.name, selectedDepartment || undefined, hasTickets, user?.role, showType, cashAmountTendered);
    if (order) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Store the completed order and show the order summary modal
      setCompletedOrder(order);
      setShowPayment(false);
      setShowCart(false);
      setShowOrderSummary(true);
    }
  };

  const handleOrderSummaryClose = () => {
    setShowOrderSummary(false);
    
    // Show change display if it was a cash payment with change
    if (completedOrder?.paymentMethod === 'cash' && completedOrder?.cashAmountTendered && completedOrder.cashAmountTendered > completedOrder.total) {
      const change = completedOrder.cashAmountTendered - completedOrder.total;
      setChangeAmount(change);
      setShowChangeDisplay(true);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setShowChangeDisplay(false);
        setChangeAmount(null);
      }, 10000);
    }
    
    setCompletedOrder(null);
  };

  // Show box office show selection
  if ((user?.role === 'usher' || user?.role === 'manager' || user?.role === 'admin') && selectedDepartment === 'box-office' && !selectedShow) {
    const showLayout = TabletUtils.getDepartmentCardLayout();
    
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.departmentSelection}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.departmentTitle}>Select Show</Text>
          <Text style={styles.departmentSubtitle}>Choose which show you're selling tickets for</Text>
          
          <View style={[
            styles.departmentOptions,
            { 
              flexDirection: 'column',
              maxWidth: showLayout.maxWidth as any,
              gap: showLayout.gap
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.departmentCard,
                styles.showCard
              ]}
              onPress={() => setSelectedShow('1st-show')}
            >
              <View style={styles.departmentIcon}>
                <Ticket size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>1st Show</Text>
              <Text style={styles.departmentDescription}>Evening performance - First showing</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.departmentCard,
                styles.showCard
              ]}
              onPress={() => setSelectedShow('2nd-show')}
            >
              <View style={styles.departmentIcon}>
                <Ticket size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>2nd Show</Text>
              <Text style={styles.departmentDescription}>Evening performance - Second showing</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.departmentCard,
                styles.showCard
              ]}
              onPress={() => setSelectedShow('nightly-show')}
            >
              <View style={styles.departmentIcon}>
                <Ticket size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>Nightly Show</Text>
              <Text style={styles.departmentDescription}>Regular evening performance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.departmentCard,
                styles.showCard
              ]}
              onPress={() => setSelectedShow('matinee')}
            >
              <View style={styles.departmentIcon}>
                <Ticket size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>Matinee</Text>
              <Text style={styles.departmentDescription}>Afternoon performance</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDepartment(null)}
          >
            <Text style={styles.backButtonText}>← Back to Department Selection</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Show department selection for ushers, managers, and admins
  if ((user?.role === 'usher' || user?.role === 'manager' || user?.role === 'admin') && !selectedDepartment) {
    const departmentLayout = TabletUtils.getDepartmentCardLayout();
    
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.departmentSelection}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.departmentTitle}>Select Your Department</Text>
          <Text style={styles.departmentSubtitle}>Choose which area you'll be working in today</Text>
          
          <View style={[
            styles.departmentOptions,
            { 
              flexDirection: departmentLayout.direction,
              maxWidth: departmentLayout.maxWidth as any,
              gap: departmentLayout.gap
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.departmentCard,
                { flex: departmentLayout.direction === 'row' ? 1 : 0 }
              ]}
              onPress={() => setSelectedDepartment('box-office')}
            >
              <View style={styles.departmentIcon}>
                <Ticket size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>Box Office</Text>
              <Text style={styles.departmentDescription}>Ticket sales and admissions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.departmentCard,
                { flex: departmentLayout.direction === 'row' ? 1 : 0 }
              ]}
              onPress={() => setSelectedDepartment('candy-counter')}
            >
              <View style={styles.departmentIcon}>
                <Candy size={TabletUtils.getResponsiveFontSize(48, 64, 72)} color={TheatreColors.accent} />
              </View>
              <Text style={styles.departmentName}>Candy Counter</Text>
              <Text style={styles.departmentDescription}>Concessions, beverages, merchandise & tickets</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Training Mode Banner */}
      {settings.trainingMode && (
        <View style={styles.trainingModeBanner}>
          <Text style={styles.trainingModeText}>
            🎓 TRAINING MODE - Transactions will not be saved to reports
          </Text>
        </View>
      )}
      
      {/* Change Display */}
      {showChangeDisplay && changeAmount !== null && (
        <View style={styles.changeDisplayBanner}>
          <Text style={styles.changeDisplayText}>
            💰 Change Due: ${changeAmount.toFixed(2)}
          </Text>
          <TouchableOpacity 
            style={styles.changeDisplayCloseButton}
            onPress={() => {
              setShowChangeDisplay(false);
              setChangeAmount(null);
            }}
          >
            <X size={20} color={TheatreColors.background} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Tablet Layout: Cart on left, Products on right */}
      {isTablet ? (
        <View style={styles.tabletLayout}>
          {/* Cart Sidebar - Always visible on left for tablets */}
          <View style={[
            styles.cartContainer,
            styles.tabletCartContainer,
            {
              width: getCartWidth(),
              minWidth: deviceType === 'foldable-unfolded' ? 450 : 400,
              maxWidth: TabletUtils.getMaxCartWidth()
            }
          ]}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartHeaderItem}>Item</Text>
              <Text style={styles.cartHeaderQty}>Qty</Text>
              <Text style={styles.cartHeaderTotal}>Total</Text>
            </View>

            <ScrollView style={styles.cartItems}>
              {showOrderSummary && completedOrder ? (
                // Show order summary in cart area
                <View style={styles.orderSummaryInCart}>
                  <View style={styles.orderSummaryHeader}>
                    <Text style={styles.orderSummaryTitle}>Order Complete!</Text>
                    <Text style={styles.orderSummaryId}>#{completedOrder.id.slice(-6)}</Text>
                  </View>
                  
                  <View style={styles.orderSummaryItems}>
                    <Text style={styles.orderSummarySectionTitle}>Items Ordered:</Text>
                    {completedOrder.items.map((item: any, index: number) => (
                      <View key={`${item.product.id}-${index}`} style={styles.orderSummaryItem}>
                        <Text style={styles.orderSummaryItemName}>{item.product.name}</Text>
                        <Text style={styles.orderSummaryItemQty}>×{item.quantity}</Text>
                        <Text style={styles.orderSummaryItemPrice}>
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.orderSummaryTotals}>
                    <View style={styles.orderSummaryTotalRow}>
                      <Text style={styles.orderSummaryTotalLabel}>Total:</Text>
                      <Text style={styles.orderSummaryTotalValue}>${completedOrder.total.toFixed(2)}</Text>
                    </View>
                    <View style={styles.orderSummaryPaymentRow}>
                      <Text style={styles.orderSummaryPaymentLabel}>Payment:</Text>
                      <Text style={styles.orderSummaryPaymentValue}>
                        {completedOrder.paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}
                      </Text>
                    </View>
                    
                    {/* Cash Amount Tendered and Change Due */}
                    {completedOrder.paymentMethod === 'cash' && completedOrder.cashAmountTendered && (
                      <>
                        <View style={styles.orderSummaryCashRow}>
                          <Text style={styles.orderSummaryCashLabel}>Cash Tendered:</Text>
                          <Text style={styles.orderSummaryCashValue}>
                            ${completedOrder.cashAmountTendered.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.orderSummaryChangeRow}>
                          <Text style={styles.orderSummaryChangeLabel}>Change Due:</Text>
                          <Text style={styles.orderSummaryChangeValue}>
                            ${(completedOrder.cashAmountTendered - completedOrder.total).toFixed(2)}
                          </Text>
                        </View>
                      </>
                    )}
                    
                    {selectedShow && (
                      <View style={styles.orderSummaryShowRow}>
                        <Text style={styles.orderSummaryShowLabel}>Show:</Text>
                        <Text style={styles.orderSummaryShowValue}>
                          {getShowDisplayName(selectedShow)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.orderSummaryCloseButton}
                    onPress={handleOrderSummaryClose}
                  >
                    <Text style={styles.orderSummaryCloseButtonText}>Start Next Order</Text>
                  </TouchableOpacity>
                </View>
              ) : cart.length === 0 ? (
                <View style={styles.emptyCartMessage}>
                  <Text style={styles.emptyCartText}>No items in cart</Text>
                </View>
              ) : (
                cart.map(item => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                    <View style={styles.cartQtyContainer}>
                      <TouchableOpacity 
                        style={styles.qtyButton}
                        onPress={() => updateCartQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.cartQty}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.qtyButton}
                        onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartTotal}>${(item.quantity * item.product.price).toFixed(2)}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {cart.length > 0 && !showOrderSummary && (
              <View style={styles.cartFooter}>
                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={handleCheckout}
                >
                  <Text style={styles.checkoutButtonText}>Checkout</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.clearCartButton}
                  onPress={() => {
                    Alert.alert('Clear Cart', 'Remove all items from cart?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: clearCart },
                    ]);
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear Cart</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Main Content - Products section on the right */}
          <View style={[
            styles.mainContent,
            styles.tabletRightSideContent
          ]}>
            {/* Search Bar and View Toggle */}
            <View style={styles.searchAndToggleContainer}>
              <View style={styles.searchContainer}>
                <Search size={20} color={TheatreColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Product Name"
                  placeholderTextColor={TheatreColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color={TheatreColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
                  onPress={() => setViewMode('list')}
                >
                  <List size={20} color={viewMode === 'list' ? TheatreColors.background : TheatreColors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Grid3X3 size={20} color={viewMode === 'grid' ? TheatreColors.background : TheatreColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Foldable Device Status Indicator */}
            {isFoldable && (
              <View style={styles.foldableStatusContainer}>
                <View style={styles.foldableStatusInfo}>
                  {deviceType === 'foldable-unfolded' ? (
                    <TabletSmartphone size={20} color={TheatreColors.accent} />
                  ) : (
                    <Smartphone size={20} color={TheatreColors.accent} />
                  )}
                  <Text style={styles.foldableStatusText}>
                    Z Fold 7 - {foldableState === 'unfolded' ? 'Unfolded Mode' : 'Folded Mode'}
                  </Text>
                </View>
                <Text style={styles.foldableOptimizedText}>Optimized</Text>
              </View>
            )}

            {/* Department Header for Ushers, Managers, and Admins */}
            {(user?.role === 'usher' || user?.role === 'manager' || user?.role === 'admin') && selectedDepartment && (
              <View style={styles.departmentHeader}>
                <View style={styles.departmentInfo}>
                  {selectedDepartment === 'box-office' ? (
                    <Ticket size={24} color={TheatreColors.accent} />
                  ) : (
                    <Candy size={24} color={TheatreColors.accent} />
                  )}
                  <Text style={styles.departmentHeaderText}>
                    {selectedDepartment === 'box-office' ? (
                      selectedShow ? `Box Office - ${getShowDisplayName(selectedShow)}` : 'Box Office'
                    ) : 'Candy Counter'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeDepartmentButton}
                  onPress={() => {
                    if (selectedDepartment === 'box-office' && selectedShow) {
                      setSelectedShow(null);
                    } else {
                      setSelectedDepartment(null);
                      setSelectedShow(null);
                    }
                  }}
                >
                  <Text style={styles.changeDepartmentText}>
                    {selectedDepartment === 'box-office' && selectedShow ? 'Change Show' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Products Grid/List */}
            <FlatList
              data={departmentFilteredProducts}
              keyExtractor={item => item.id}
              numColumns={viewMode === 'grid' ? getProductGridColumns() : 1}
              key={`${viewMode}-${getProductGridColumns()}-${isLandscape}-${deviceType}`}
              columnWrapperStyle={viewMode === 'grid' && getProductGridColumns() > 1 ? styles.row : undefined}
              contentContainerStyle={[
                viewMode === 'grid' ? styles.productList : styles.productListView,
                { paddingBottom: TabletUtils.getResponsivePadding(160, 180, 200, 220) }
              ]}
              renderItem={({ item }) => (
                viewMode === 'grid' ? (
                  <View style={[
                    styles.productWrapper, 
                    { 
                      width: `${(100 / getProductGridColumns()) - 2}%`,
                      maxWidth: TabletUtils.getResponsivePadding(200, 220, 240, 260)
                    }
                  ]}>
                    <ProductCard
                      product={item}
                      onPress={() => handleAddToCart(item)}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.productListItem}
                    onPress={() => handleAddToCart(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productListContent}>
                      <View style={styles.productListInfo}>
                        <Text style={styles.productListName}>{item.name}</Text>
                        <Text style={styles.productListCategory}>{item.category}</Text>
                      </View>
                      <Text style={styles.productListPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No products found</Text>
                </View>
              }
            />
            
            {/* Category Filter at Bottom */}
            <View style={styles.bottomCategoryFilter}>
              <CategoryFilter
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                selectedDepartment={selectedDepartment}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Phone Layout: Traditional modal cart */
        <View style={styles.container}>
          {/* Training Mode Banner for Phone */}
          {settings.trainingMode && (
            <View style={styles.trainingModeBanner}>
              <Text style={styles.trainingModeText}>
                🎓 TRAINING MODE - Practice only
              </Text>
            </View>
          )}
          
          {/* Main POS View */}
          <View style={styles.mainContent}>
            {/* Search Bar and View Toggle */}
            <View style={styles.searchAndToggleContainer}>
              <View style={styles.searchContainer}>
                <Search size={20} color={TheatreColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor={TheatreColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color={TheatreColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
                  onPress={() => setViewMode('list')}
                >
                  <List size={20} color={viewMode === 'list' ? TheatreColors.background : TheatreColors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Grid3X3 size={20} color={viewMode === 'grid' ? TheatreColors.background : TheatreColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Filter */}
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              selectedDepartment={selectedDepartment}
            />

            {/* Department Header for Ushers, Managers, and Admins */}
            {(user?.role === 'usher' || user?.role === 'manager' || user?.role === 'admin') && selectedDepartment && (
              <View style={styles.departmentHeader}>
                <View style={styles.departmentInfo}>
                  {selectedDepartment === 'box-office' ? (
                    <Ticket size={24} color={TheatreColors.accent} />
                  ) : (
                    <Candy size={24} color={TheatreColors.accent} />
                  )}
                  <Text style={styles.departmentHeaderText}>
                    {selectedDepartment === 'box-office' ? (
                      selectedShow ? `Box Office - ${getShowDisplayName(selectedShow)}` : 'Box Office'
                    ) : 'Candy Counter'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeDepartmentButton}
                  onPress={() => {
                    if (selectedDepartment === 'box-office' && selectedShow) {
                      setSelectedShow(null);
                    } else {
                      setSelectedDepartment(null);
                      setSelectedShow(null);
                    }
                  }}
                >
                  <Text style={styles.changeDepartmentText}>
                    {selectedDepartment === 'box-office' && selectedShow ? 'Change Show' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Products Grid/List */}
            <FlatList
              data={departmentFilteredProducts}
              keyExtractor={item => item.id}
              numColumns={viewMode === 'grid' ? TabletUtils.getProductGridColumns() : 1}
              key={`${viewMode}-${TabletUtils.getProductGridColumns()}-${isLandscape}-${TabletUtils.getDeviceType()}`}
              columnWrapperStyle={viewMode === 'grid' && TabletUtils.getProductGridColumns() > 1 ? styles.row : undefined}
              contentContainerStyle={[
                viewMode === 'grid' ? styles.productList : styles.productListView,
                { paddingBottom: TabletUtils.getResponsivePadding(100, 120, 140) }
              ]}
              renderItem={({ item }) => (
                viewMode === 'grid' ? (
                  <View style={[
                    styles.productWrapper, 
                    { 
                      width: `${(100 / TabletUtils.getProductGridColumns()) - 2}%`,
                      maxWidth: TabletUtils.getResponsivePadding(200, 250, 300)
                    }
                  ]}>
                    <ProductCard
                      product={item}
                      onPress={() => handleAddToCart(item)}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.productListItem}
                    onPress={() => handleAddToCart(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productListContent}>
                      <View style={styles.productListInfo}>
                        <Text style={styles.productListName}>{item.name}</Text>
                        <Text style={styles.productListCategory}>{item.category}</Text>
                      </View>
                      <Text style={styles.productListPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No products found</Text>
                </View>
              }
            />
          </View>

          {/* Cart Modal for phones */}
          {showCart && (
            <View style={[
              styles.cartContainer,
              styles.phoneCartContainer,
              {
                width: getCartWidth(),
                maxWidth: TabletUtils.getMaxCartWidth()
              }
            ]}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>Cart ({cartCount} items)</Text>
                <TouchableOpacity onPress={() => setShowCart(false)}>
                  <X size={24} color={TheatreColors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.cartItems}>
                {cart.map(item => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                    <View style={styles.cartQtyContainer}>
                      <TouchableOpacity 
                        style={styles.qtyButton}
                        onPress={() => updateCartQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.cartQty}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.qtyButton}
                        onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartTotal}>${(item.quantity * item.product.price).toFixed(2)}</Text>
                  </View>
                ))}
              </ScrollView>

              {cart.length > 0 && (
                <View style={styles.cartFooter}>
                  <TouchableOpacity 
                    style={styles.checkoutButton}
                    onPress={handleCheckout}
                  >
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.clearCartButton}
                    onPress={() => {
                      Alert.alert('Clear Cart', 'Remove all items from cart?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear', style: 'destructive', onPress: clearCart },
                      ]);
                    }}
                  >
                    <Text style={styles.clearButtonText}>Clear Cart</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Floating Cart Button - Only for phones */}
      {!isTablet && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => setShowCart(!showCart)}
        >
          <ShoppingCart size={24} color={TheatreColors.background} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      
      {/* Payment Screen Modal */}
      {showPayment && (
        <PaymentScreen
          cart={cart}
          onClose={() => setShowPayment(false)}
          onPayment={handlePayment}
          creditCardFeePercent={settings.creditCardFeePercent}
          department={selectedDepartment || undefined}
          selectedShow={selectedShow || undefined}
        />
      )}
      
      {/* Order Summary Modal - Only for mobile */}
      {!isTablet && (
        <OrderSummaryModal
          visible={showOrderSummary}
          order={completedOrder}
          onClose={handleOrderSummaryClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  mainContent: {
    flex: 1,
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: TabletUtils.getResponsivePadding(16, 24),
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    paddingHorizontal: TabletUtils.getResponsivePadding(16, 20),
    paddingVertical: TabletUtils.getResponsivePadding(12, 16),
    borderRadius: 12,
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: TheatreColors.accent,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: TheatreColors.text,
  },

  productList: {
    paddingHorizontal: TabletUtils.getResponsivePadding(16, 24, 32),
  },
  productListView: {
    paddingHorizontal: TabletUtils.getResponsivePadding(16, 24, 32),
  },
  productListItem: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productListInfo: {
    flex: 1,
  },
  productListName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  productListCategory: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    textTransform: 'capitalize',
  },
  productListPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  row: {
    justifyContent: 'space-between',
  },
  productWrapper: {
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
    marginHorizontal: '1%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletRightSideContent: {
    flex: 1,
  },
  tabletCartContainer: {
    position: 'relative',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: TheatreColors.background,
    borderRightWidth: 1,
    borderRightColor: TheatreColors.surface,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  phoneCartContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: TheatreColors.background,
    borderLeftWidth: 1,
    borderLeftColor: TheatreColors.surface,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cartContainer: {
    backgroundColor: TheatreColors.background,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
    backgroundColor: '#4A90E2',
  },
  cartHeaderItem: {
    flex: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
    textAlign: 'left',
  },
  cartHeaderQty: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
    textAlign: 'center',
  },
  cartHeaderTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
    textAlign: 'center',
  },

  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  cartItems: {
    flex: 1,
    padding: TabletUtils.getResponsivePadding(8, 12, 16),
  },
  emptyCartMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCartText: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  cartItemName: {
    flex: 2,
    fontSize: 14,
    color: TheatreColors.text,
    paddingRight: 8,
  },
  cartQtyContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: TheatreColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  cartQty: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  cartTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    textAlign: 'center',
  },

  cartFooter: {
    padding: TabletUtils.getResponsivePadding(12, 16, 20),
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  cartSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  checkoutButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  clearCartButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 14,
    color: TheatreColors.error,
    fontWeight: '600',
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: TabletUtils.getResponsivePadding(24, 32),
    right: TabletUtils.getResponsivePadding(24, 32),
    width: TabletUtils.getResponsivePadding(64, 72),
    height: TabletUtils.getResponsivePadding(64, 72),
    borderRadius: TabletUtils.getResponsivePadding(32, 36),
    backgroundColor: TheatreColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: TheatreColors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    backgroundColor: TheatreColors.background,
    gap: 8,
  },
  paymentMethodButtonActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  paymentMethodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  paymentMethodButtonTextActive: {
    color: TheatreColors.background,
  },
  departmentSelection: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TabletUtils.getResponsivePadding(16, 24, 32),
    minHeight: '100%',
  },
  departmentTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(28, 36),
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  departmentSubtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 20),
    color: TheatreColors.textSecondary,
    marginBottom: TabletUtils.getResponsivePadding(48, 64),
    textAlign: 'center',
  },
  departmentOptions: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  departmentCard: {
    backgroundColor: TheatreColors.surface,
    borderRadius: TabletUtils.getResponsivePadding(16, 20, 24),
    padding: TabletUtils.getResponsivePadding(24, 32, 40),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: TabletUtils.getResponsivePadding(180, 220, 260),
    justifyContent: 'center',
  },
  departmentIcon: {
    width: TabletUtils.getResponsivePadding(80, 100),
    height: TabletUtils.getResponsivePadding(80, 100),
    borderRadius: TabletUtils.getResponsivePadding(40, 50),
    backgroundColor: TheatreColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
  },
  departmentName: {
    fontSize: TabletUtils.getResponsiveFontSize(20, 24),
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  departmentDescription: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    lineHeight: TabletUtils.getResponsiveFontSize(20, 24),
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  departmentHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  changeDepartmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.accent,
  },
  changeDepartmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  bottomCategoryFilter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TheatreColors.background,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
    paddingVertical: 8,
  },
  cashAmountButton: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  cashAmountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  cashInputContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  changeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  changeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  payButtonDisabled: {
    backgroundColor: TheatreColors.surface,
    opacity: 0.6,
  },
  payButtonTextDisabled: {
    color: TheatreColors.textSecondary,
  },
  quickAmountContainer: {
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
    borderRadius: 8,
    paddingVertical: 14,
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
  foldableStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.surfaceLight,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  foldableStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foldableStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  foldableOptimizedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    backgroundColor: TheatreColors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  showCard: {
    width: '100%',
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
  },
  backButton: {
    marginTop: TabletUtils.getResponsivePadding(32, 40),
    paddingHorizontal: TabletUtils.getResponsivePadding(24, 32),
    paddingVertical: TabletUtils.getResponsivePadding(12, 16),
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
  },
  backButtonText: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: '600',
    color: TheatreColors.accent,
    textAlign: 'center',
  },
  // Order Summary in Cart Styles
  orderSummaryInCart: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  orderSummaryHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
  },
  orderSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  orderSummaryId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  orderSummaryItems: {
    marginBottom: 16,
  },
  orderSummarySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  orderSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  orderSummaryItemName: {
    flex: 2,
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '500',
  },
  orderSummaryItemQty: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '600',
  },
  orderSummaryItemPrice: {
    flex: 1,
    fontSize: 14,
    color: '#1B5E20',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  orderSummaryTotals: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
  },
  orderSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  orderSummaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  orderSummaryPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryPaymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  orderSummaryPaymentValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderSummaryShowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryShowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  orderSummaryShowValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderSummaryCashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryCashLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  orderSummaryCashValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderSummaryChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryChangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  orderSummaryChangeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  orderSummaryCloseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSummaryCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  trainingModeBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 2,
    borderBottomColor: '#FFEAA7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingModeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
  },
  changeDisplayBanner: {
    backgroundColor: '#4CAF50',
    borderBottomWidth: 2,
    borderBottomColor: '#388E3C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  changeDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
    flex: 1,
    textAlign: 'center',
  },
  changeDisplayCloseButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});