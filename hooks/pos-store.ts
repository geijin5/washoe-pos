import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { Product, CartItem, Order, Category, CategoryMetadata, POSStats, POSSettings, NightlyReport, SettingsExport } from '@/types/pos';
import { defaultProducts } from '@/mocks/default-products';
// Removed sync service import as it's not used

const PRODUCTS_KEY = 'theatre_products';
const ORDERS_KEY = 'theatre_orders';
const SETTINGS_KEY = 'theatre_settings';

const DEFAULT_CATEGORIES: Category[] = ['box-office-tickets', 'after-closing-tickets', 'concessions', 'merchandise', 'beverages'];

const DEFAULT_SETTINGS: POSSettings = {
  creditCardFeePercent: 5.0, // Exactly 5.0% credit card fee
  categories: DEFAULT_CATEGORIES,
  trainingMode: false,
};

// Global settings key for cross-account consistency
const GLOBAL_SETTINGS_KEY = 'theatre_global_settings';

export const [POSProvider, usePOS] = createContextHook(() => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<POSSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all' | 'candy-counter-sales' | 'after-closing-tickets'>('all');

  // Load data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedProducts, storedOrders, storedSettings, globalSettings] = await Promise.all([
          AsyncStorage.getItem(PRODUCTS_KEY),
          AsyncStorage.getItem(ORDERS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(GLOBAL_SETTINGS_KEY),
        ]);

        if (storedProducts) {
          setProducts(JSON.parse(storedProducts));
        } else {
          // Initialize with default products
          setProducts(defaultProducts);
          await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts));
        }

        if (storedOrders) {
          setOrders(JSON.parse(storedOrders));
        }

        // Load settings with global credit card fee consistency
        let finalSettings = DEFAULT_SETTINGS;
        if (storedSettings) {
          finalSettings = JSON.parse(storedSettings);
        }
        
        // Apply global credit card fee if it exists (ensures consistency across all accounts)
        if (globalSettings) {
          const parsedGlobalSettings = JSON.parse(globalSettings);
          if (parsedGlobalSettings.creditCardFeePercent !== undefined) {
            finalSettings.creditCardFeePercent = parsedGlobalSettings.creditCardFeePercent;
            console.log(`Applied global credit card fee: ${parsedGlobalSettings.creditCardFeePercent}%`);
          }
        } else {
          // Initialize global settings with default credit card fee
          await AsyncStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify({
            creditCardFeePercent: DEFAULT_SETTINGS.creditCardFeePercent,
            lastUpdated: new Date().toISOString()
          }));
          console.log(`Initialized global credit card fee: ${DEFAULT_SETTINGS.creditCardFeePercent}%`);
        }
        
        setSettings(finalSettings);
        
        if (!storedSettings) {
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(finalSettings));
        }
      } catch (error) {
        console.error('Error loading POS data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save products when they change
  const saveProducts = useCallback(async (newProducts: Product[]) => {
    try {
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(newProducts));
      setProducts(newProducts);
    } catch (error) {
      console.error('Error saving products:', error);
    }
  }, []);

  // Save orders when they change
  const saveOrders = useCallback(async (newOrders: Order[]) => {
    try {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
      setOrders(newOrders);
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }, []);

  // Product management
  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    const updatedProducts = [...products, newProduct];
    saveProducts(updatedProducts);
  }, [products, saveProducts]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    saveProducts(updatedProducts);
  }, [products, saveProducts]);

  const deleteProduct = useCallback((id: string) => {
    const updatedProducts = products.filter(p => p.id !== id);
    saveProducts(updatedProducts);
  }, [products, saveProducts]);

  // Cart management
  const addToCart = useCallback((product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(currentCart =>
        currentCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Settings management with global credit card fee sync
  const updateSettings = useCallback(async (newSettings: Partial<POSSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // If credit card fee is being updated, sync it globally across all accounts
      if (newSettings.creditCardFeePercent !== undefined) {
        const globalSettings = {
          creditCardFeePercent: newSettings.creditCardFeePercent,
          lastUpdated: new Date().toISOString()
        };
        await AsyncStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(globalSettings));
        console.log(`Updated global credit card fee to ${newSettings.creditCardFeePercent}% - will apply to all accounts`);
      }
      
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal;
    return { subtotal, total };
  }, [cart]);

  // Calculate totals with credit card fee - Enhanced logging for verification
  const calculateTotalsWithFee = useCallback((paymentMethod: 'cash' | 'card') => {
    const subtotal = Math.round(cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * 100) / 100;
    const feePercent = settings.creditCardFeePercent;
    const creditCardFee = paymentMethod === 'card' ? Math.round(subtotal * (feePercent / 100) * 100) / 100 : 0;
    const total = Math.round((subtotal + creditCardFee) * 100) / 100;
    
    // Enhanced logging for fee calculation verification
    if (paymentMethod === 'card' && creditCardFee > 0) {
      console.log(`=== CREDIT CARD FEE CALCULATION ===`);
      console.log(`Subtotal: ${subtotal.toFixed(2)}`);
      console.log(`Fee Percentage: ${feePercent}%`);
      console.log(`Fee Amount: ${creditCardFee.toFixed(2)}`);
      console.log(`Total with Fee: ${total.toFixed(2)}`);
      console.log(`Verification: ${subtotal.toFixed(2)} * ${feePercent}% = ${(subtotal * feePercent / 100).toFixed(2)}`);
      console.log(`=== END FEE CALCULATION ===`);
    }
    
    return { subtotal, creditCardFee, total };
  }, [cart, settings.creditCardFeePercent]);

  // Checkout
  const checkout = useCallback((paymentMethod: 'cash' | 'card' = 'cash', userId?: string, userName?: string, department?: 'box-office' | 'candy-counter', isAfterClosing?: boolean, userRole?: string, showType?: '1st-show' | '2nd-show' | 'nightly-show' | 'matinee') => {
    if (cart.length === 0) return null;

    const totals = calculateTotalsWithFee(paymentMethod);
    const newOrder: Order = {
      id: Date.now().toString(),
      items: [...cart],
      subtotal: totals.subtotal,
      creditCardFee: totals.creditCardFee,
      total: totals.total,
      timestamp: new Date(),
      paymentMethod,
      userId,
      userName,
      department,
      isAfterClosing,
      userRole,
      showType,
    };

    // Debug logging for all sales to track department assignment and fees
    console.log('=== ORDER PROCESSED ===');
    console.log(`Training Mode: ${settings.trainingMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Order ID: ${newOrder.id}`);
    console.log(`User: ${userName} (${userRole})`);
    console.log(`Department: ${department}`);
    console.log(`Is After Closing: ${isAfterClosing}`);
    console.log(`Payment Method: ${paymentMethod}`);
    console.log(`Subtotal: ${totals.subtotal.toFixed(2)}`);
    console.log(`Credit Card Fee: ${totals.creditCardFee.toFixed(2)} (${settings.creditCardFeePercent}%)`);
    console.log(`Total: ${totals.total.toFixed(2)}`);
    console.log(`Items: ${cart.map(item => `${item.product.name} (${item.product.category}) x${item.quantity}`).join(', ')}`);
    console.log('==========================');
    
    // Additional logging for candy counter sales
    if (department === 'candy-counter') {
      console.log('*** CANDY COUNTER SALE CONFIRMED ***');
      console.log(`This order should appear in candy counter reports`);
    }

    // In training mode, don't save orders to persistent storage
    if (settings.trainingMode) {
      console.log('🎓 TRAINING MODE: Order processed but not saved to permanent records');
      clearCart();
      return newOrder;
    }

    const updatedOrders = [newOrder, ...orders];
    saveOrders(updatedOrders);
    clearCart();
    return newOrder;
  }, [cart, calculateTotalsWithFee, orders, saveOrders, clearCart, settings.trainingMode]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'candy-counter-sales') {
        // Candy Counter Sales: Popcorn (concessions), Pop (beverages), Candy (concessions), Misc (merchandise)
        // This includes concessions, beverages, and merchandise - everything except tickets
        filtered = filtered.filter(p => p.category !== 'tickets');
      } else if (selectedCategory === 'after-closing-tickets') {
        // After Closing: Only tickets (sold through candy counter)
        filtered = filtered.filter(p => p.category === 'tickets');
      } else {
        // Regular category filtering
        filtered = filtered.filter(p => p.category === selectedCategory);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // Available categories
  const availableCategories = useMemo(() => {
    const categories = settings.categories || DEFAULT_CATEGORIES;
    console.log('Available categories updated:', categories);
    return categories;
  }, [settings.categories]);

  const getCategoryMetadata = useCallback((categoryId: string): CategoryMetadata | undefined => {
    return settings.categoryMetadata?.find(m => m.id === categoryId);
  }, [settings.categoryMetadata]);

  // Helper function to check if a category is a ticket (including custom categories)
  const isTicketCategory = useCallback((categoryId: string) => {
    // Check hardcoded ticket categories
    if (categoryId === 'tickets' || categoryId === 'box-office-tickets' || categoryId === 'after-closing-tickets') {
      return true;
    }
    
    // Check custom category metadata
    const metadata = getCategoryMetadata(categoryId);
    return metadata?.isTicket === true;
  }, [getCategoryMetadata]);

  // Category management
  const addCategory = useCallback(async (category: Category, metadata?: CategoryMetadata) => {
    try {
      const currentCategories = settings.categories || DEFAULT_CATEGORIES;
      if (!currentCategories.includes(category)) {
        const updatedCategories = [...currentCategories, category];
        console.log(`Adding category: ${category}. Updated categories:`, updatedCategories);
        
        // Update category metadata if provided
        let updatedMetadata = settings.categoryMetadata || [];
        if (metadata) {
          updatedMetadata = [...updatedMetadata, metadata];
        }
        
        await updateSettings({ 
          categories: updatedCategories,
          categoryMetadata: updatedMetadata
        });
        console.log(`Category ${category} added successfully. Available categories updated.`);
      } else {
        console.log(`Category ${category} already exists in:`, currentCategories);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }, [settings.categories, settings.categoryMetadata, updateSettings]);

  const removeCategory = useCallback(async (category: Category) => {
    try {
      const currentCategories = settings.categories || DEFAULT_CATEGORIES;
      if (currentCategories.includes(category) && currentCategories.length > 1) {
        const updatedCategories = currentCategories.filter(c => c !== category);
        console.log(`Removing category: ${category}. Updated categories:`, updatedCategories);
        // Remove category metadata if it exists
        const updatedMetadata = (settings.categoryMetadata || []).filter(m => m.id !== category);
        
        await updateSettings({ 
          categories: updatedCategories,
          categoryMetadata: updatedMetadata
        });
        
        // Update products that use this category to use the first available category
        const productsWithCategory = products.filter(p => p.category === category);
        if (productsWithCategory.length > 0) {
          const newCategory = updatedCategories[0];
          console.log(`Moving ${productsWithCategory.length} products from ${category} to ${newCategory}`);
          const updatedProducts = products.map(p => 
            p.category === category ? { ...p, category: newCategory } : p
          );
          await saveProducts(updatedProducts);
        }
        console.log(`Category ${category} removed successfully. Available categories updated.`);
      } else {
        console.log(`Cannot remove category ${category}. Current categories:`, currentCategories);
      }
    } catch (error) {
      console.error('Error removing category:', error);
      throw error;
    }
  }, [settings.categories, settings.categoryMetadata, updateSettings, products, saveProducts]);

  // Settings export/import
  const exportSettings = useCallback((): SettingsExport => {
    const deviceId = `device_${Date.now()}`;
    return {
      type: 'pos_settings',
      version: '1.0.0',
      settings,
      products,
      categories: availableCategories,
      timestamp: new Date().toISOString(),
      deviceId,
      productCount: products.length,
      categoryCount: availableCategories.length,
    };
  }, [settings, products, availableCategories]);

  const importSettings = useCallback(async (settingsData: any): Promise<boolean> => {
    try {
      console.log('Importing POS settings...');
      
      // Validate the settings data structure
      if (!settingsData) {
        throw new Error('Settings data is empty or invalid.');
      }
      
      // Check if this is device configuration instead of settings
      if (settingsData.users && settingsData.passwords && !settingsData.products) {
        throw new Error('Wrong import type: This is a device configuration (user accounts). You need to use "Settings Sync" for products and categories only.');
      }
      
      // Validate required fields for POS settings
      if (!settingsData.settings) {
        throw new Error('Missing "settings" field. This doesn\'t appear to be a POS settings export.');
      }
      
      if (!settingsData.products || !Array.isArray(settingsData.products)) {
        throw new Error('Missing or invalid "products" field. Expected an array of products.');
      }
      
      if (!settingsData.categories || !Array.isArray(settingsData.categories)) {
        throw new Error('Missing or invalid "categories" field. Expected an array of categories.');
      }
      
      // Validate product structure
      for (let i = 0; i < settingsData.products.length; i++) {
        const product = settingsData.products[i];
        if (!product.id || !product.name || typeof product.price !== 'number') {
          throw new Error(`Invalid product at index ${i}. Missing required fields: id, name, or price.`);
        }
      }
      
      console.log('Importing settings from device:', settingsData.deviceId);
      console.log('Import timestamp:', settingsData.timestamp);
      console.log(`Found ${settingsData.products.length} products and ${settingsData.categories.length} categories`);
      
      // Update settings
      await updateSettings(settingsData.settings);
      
      // Replace all existing products with imported products (clear and import)
      console.log(`Clearing ${products.length} existing products and importing ${settingsData.products.length} new products`);
      await saveProducts(settingsData.products);
      
      console.log('POS settings imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      throw error; // Re-throw to show specific error message
    }
  }, [updateSettings, products, saveProducts]);

  // Helper function to determine if a role should be updated (higher priority roles take precedence)
  const shouldUpdateRole = useCallback((existingRole: string, newRole: string): boolean => {
    const rolePriority = { 'admin': 4, 'manager': 3, 'staff': 2, 'usher': 1 };
    const existingPriority = rolePriority[existingRole as keyof typeof rolePriority] || 0;
    const newPriority = rolePriority[newRole as keyof typeof rolePriority] || 0;
    return newPriority > existingPriority;
  }, []);

  // Helper function to validate real users (not test/demo/default accounts)
  const isValidRealUser = useCallback((userName: string): boolean => {
    if (!userName || typeof userName !== 'string') {
      console.log(`User validation: "${userName}" -> INVALID (empty or not string)`);
      return false;
    }
    
    const name = userName.toLowerCase().trim();
    
    // Only filter out very obvious test/demo patterns - be very inclusive for real users
    const invalidPatterns = [
      'test user',
      'demo user', 
      'default user',
      'guest user',
      'sample user',
      'example user',
      'temp user',
      'temporary user'
    ];
    
    // Only exclude if name exactly matches invalid patterns (very strict matching)
    const hasInvalidPattern = invalidPatterns.some(pattern => name === pattern);
    
    // Only exclude if name is completely empty or just numbers
    const isGeneric = name.length === 0 || /^\d+$/.test(name);
    
    // Accept ALL other names including admin, manager, cashier, staff names, etc.
    // This ensures all legitimate user accounts show up in reports
    const isRealName = name.length >= 1 && !hasInvalidPattern && !isGeneric;
    
    console.log(`User validation: "${userName}" -> ${isRealName ? 'VALID' : 'INVALID'} (hasInvalidPattern: ${hasInvalidPattern}, isGeneric: ${isGeneric})`);
    
    return isRealName;
  }, []);



  // Generate nightly report - Enhanced to capture ALL accounts with sales and handle mixed orders
  const generateNightlyReport = useCallback((date?: Date): NightlyReport => {
    const reportDate = date || new Date();
    
    // Use the same 2am cutoff logic as stats for consistency
    let businessDate = new Date(reportDate);
    
    // If we're generating a report for "today" and it's before 2am, 
    // we want the previous business day's data
    if (!date && reportDate.getHours() < 2) {
      businessDate.setDate(businessDate.getDate() - 1);
    }
    
    // Create a proper date string for the business date
    const year = businessDate.getFullYear();
    const month = String(businessDate.getMonth() + 1).padStart(2, '0');
    const day = String(businessDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log(`=== GENERATING LOCAL NIGHTLY REPORT ===`);
    console.log(`Report Date: ${reportDate.toISOString()}`);
    console.log(`Business Date: ${dateStr}`);
    console.log('Ensuring ALL local accounts with sales are included...');
    
    // Filter orders for the specific business date - ensure proper date comparison
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      
      // Apply same 2am cutoff logic to order dates
      let orderBusinessDate = new Date(orderDate);
      if (orderDate.getHours() < 2) {
        orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
      }
      
      const orderYear = orderBusinessDate.getFullYear();
      const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
      const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
      const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
      const matches = orderDateStr === dateStr;
      if (matches) {
        console.log(`Including order from ${orderDateStr}: ${order.total.toFixed(2)} by ${order.userName} (Show: ${order.showType || 'none'})`);
      }
      return matches;
    });
    
    console.log(`Found ${dayOrders.length} orders for ${dateStr}`);

    // Calculate totals with enhanced precision - ensure exact match with orders
    // Use Math.round to avoid floating point precision issues
    const totalSales = Math.round(dayOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const cashSales = Math.round(dayOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const cardSales = Math.round(dayOrders.filter(o => o.paymentMethod === 'card').reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const creditCardFees = Math.round(dayOrders.reduce((sum, order) => sum + (order.creditCardFee || 0), 0) * 100) / 100;
    
    // Verify cash + card = total (with enhanced precision)
    const calculatedTotal = Math.round((cashSales + cardSales) * 100) / 100;
    const totalDifference = Math.abs(calculatedTotal - totalSales);
    
    console.log(`=== TOTAL SALES VERIFICATION ===`);
    console.log(`Cash Sales: ${cashSales.toFixed(2)}`);
    console.log(`Card Sales: ${cardSales.toFixed(2)}`);
    console.log(`Calculated Total: ${calculatedTotal.toFixed(2)}`);
    console.log(`Actual Total: ${totalSales.toFixed(2)}`);
    console.log(`Difference: ${totalDifference.toFixed(4)}`);
    
    if (totalDifference > 0.01) {
      console.error(`❌ PAYMENT METHOD MISMATCH: Cash(${cashSales.toFixed(2)}) + Card(${cardSales.toFixed(2)}) = ${calculatedTotal.toFixed(2)} vs Total(${totalSales.toFixed(2)}) - Difference: ${totalDifference.toFixed(4)}`);
    } else {
      console.log(`✅ PAYMENT VERIFICATION PASSED: Totals match within acceptable tolerance`);
    }
    console.log(`=== END TOTAL VERIFICATION ===`);

    // Department breakdown - Enhanced to properly handle mixed orders (tickets + concessions)
    // For candy counter orders, we need to split mixed orders by item type
    console.log(`=== PROCESSING MIXED ORDERS FOR DEPARTMENT BREAKDOWN ===`);
    
    const boxOfficeOrders = dayOrders.filter(o => o.department === 'box-office');
    
    // Categorize orders based on department where tickets are sold
    // Box office department tickets go to box office section
    // Candy counter department tickets go to after-closing section
    // Candy counter orders without tickets go to candy counter section
    
    // Get all candy counter orders (regardless of isAfterClosing flag)
    const allCandyCounterOrders = dayOrders.filter(o => o.department === 'candy-counter');
    
    // Separate candy counter orders: tickets go to after-closing, other items stay in candy counter
    const candyCounterTicketOrders = allCandyCounterOrders.filter(order => 
      order.items.some(item => isTicketCategory(item.product.category))
    );
    
    const pureCandyCounterOrders = allCandyCounterOrders.filter(order => 
      !order.items.some(item => isTicketCategory(item.product.category))
    );
    
    // Box office orders are only from box office department
    const allBoxOfficeOrders = boxOfficeOrders;
    
    // After-closing orders are candy counter orders with tickets
    const allAfterClosingOrders = candyCounterTicketOrders;
    
    console.log(`=== MIXED ORDER FILTERING DEBUG ===`);
    console.log(`Total day orders: ${dayOrders.length}`);
    console.log(`All candy counter orders: ${allCandyCounterOrders.length}`);
    console.log(`Candy counter ticket orders (go to after-closing): ${candyCounterTicketOrders.length}`);
    console.log(`Pure candy counter orders (no tickets): ${pureCandyCounterOrders.length}`);
    console.log(`All box office orders (box office department only): ${allBoxOfficeOrders.length}`);
    console.log(`All after-closing orders (candy counter tickets): ${allAfterClosingOrders.length}`);
    
    // Log each pure candy counter order to see if it has mixed items
    pureCandyCounterOrders.forEach(order => {
      const ticketItems = order.items.filter(item => isTicketCategory(item.product.category));
      const nonTicketItems = order.items.filter(item => !isTicketCategory(item.product.category));
      const orderType = ticketItems.length > 0 && nonTicketItems.length > 0 ? 'MIXED' : 
                       ticketItems.length > 0 ? 'TICKETS_ONLY' : 'CONCESSIONS_ONLY';
      console.log(`  Order ${order.id} (${order.userName}): ${orderType} - ${ticketItems.length} tickets, ${nonTicketItems.length} other items`);
      if (orderType === 'MIXED') {
        console.log(`    🔄 MIXED ORDER DETECTED: This should be split between departments`);
        console.log(`    Ticket items: ${ticketItems.map(i => i.product.name).join(', ')}`);
        console.log(`    Other items: ${nonTicketItems.map(i => i.product.name).join(', ')}`);
      }
    });
    console.log(`=== END MIXED ORDER FILTERING DEBUG ===`);
    
    console.log(`Found ${pureCandyCounterOrders.length} pure candy counter orders to analyze for mixed content`);
    console.log(`Found ${allAfterClosingOrders.length} after-closing orders`);
    
    // Process mixed candy counter orders - split by item type
    let candyCounterSalesFromMixed = 0;
    let afterClosingSalesFromMixed = 0;
    let candyCounterOrdersFromMixed = 0;
    let afterClosingOrdersFromMixed = 0;
    
    // Track payment methods for mixed orders
    let candyCounterCashFromMixed = 0;
    let candyCounterCardFromMixed = 0;
    let afterClosingCashFromMixed = 0;
    let afterClosingCardFromMixed = 0;
    
    // Process candy counter ticket orders (these should be split if they have mixed content)
    candyCounterTicketOrders.forEach(order => {
      // Check if this order has both tickets and other items
      const ticketItems = order.items.filter(item => isTicketCategory(item.product.category));
      const nonTicketItems = order.items.filter(item => !isTicketCategory(item.product.category));
      
        console.log(`Analyzing order ${order.id}: ${ticketItems.length} after-closing ticket items, ${nonTicketItems.length} non-ticket items`);
      
      if (ticketItems.length > 0 && nonTicketItems.length > 0) {
        // Mixed order - split it
        console.log(`🔄 Mixed order detected: Order ${order.id} by ${order.userName}`);
        
        // Calculate ticket portion
        const ticketSubtotal = ticketItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const nonTicketSubtotal = nonTicketItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const totalSubtotal = ticketSubtotal + nonTicketSubtotal;
        
        // Calculate proportional fees and totals
        const ticketProportion = ticketSubtotal / totalSubtotal;
        const nonTicketProportion = nonTicketSubtotal / totalSubtotal;
        
        const ticketFee = Math.round((order.creditCardFee || 0) * ticketProportion * 100) / 100;
        const nonTicketFee = Math.round((order.creditCardFee || 0) * nonTicketProportion * 100) / 100;
        
        const ticketTotal = Math.round((ticketSubtotal + ticketFee) * 100) / 100;
        const nonTicketTotal = Math.round((nonTicketSubtotal + nonTicketFee) * 100) / 100;
        
        console.log(`  🎫 Ticket items: ${ticketItems.map(i => i.product.name).join(', ')} = ${ticketTotal.toFixed(2)} → AFTER CLOSING`);
        console.log(`  🍿 Non-ticket items: ${nonTicketItems.map(i => i.product.name).join(', ')} = ${nonTicketTotal.toFixed(2)} → CANDY COUNTER`);
        
        // Add ticket portion to after-closing with proper rounding
        afterClosingSalesFromMixed = Math.round((afterClosingSalesFromMixed + ticketTotal) * 100) / 100;
        afterClosingOrdersFromMixed += 1; // Count as one order for after-closing
        
        // Add non-ticket portion to candy counter with proper rounding
        candyCounterSalesFromMixed = Math.round((candyCounterSalesFromMixed + nonTicketTotal) * 100) / 100;
        candyCounterOrdersFromMixed += 1; // Count as one order for candy counter
        
        // Split payment methods proportionally
        if (order.paymentMethod === 'cash') {
          afterClosingCashFromMixed = Math.round((afterClosingCashFromMixed + ticketTotal) * 100) / 100;
          candyCounterCashFromMixed = Math.round((candyCounterCashFromMixed + nonTicketTotal) * 100) / 100;
        } else if (order.paymentMethod === 'card') {
          afterClosingCardFromMixed = Math.round((afterClosingCardFromMixed + ticketTotal) * 100) / 100;
          candyCounterCardFromMixed = Math.round((candyCounterCardFromMixed + nonTicketTotal) * 100) / 100;
        }
        
        console.log(`  ✅ Split result: After-closing +${ticketTotal.toFixed(2)}, Candy counter +${nonTicketTotal.toFixed(2)}`);
      } else if (ticketItems.length > 0) {
        // Pure ticket order in candy counter - move entirely to after-closing
        console.log(`🎫 Pure ticket order in candy counter detected: Order ${order.id} by ${order.userName} - moving to after-closing`);
        afterClosingSalesFromMixed = Math.round((afterClosingSalesFromMixed + order.total) * 100) / 100;
        afterClosingOrdersFromMixed += 1;
        
        if (order.paymentMethod === 'cash') {
          afterClosingCashFromMixed = Math.round((afterClosingCashFromMixed + order.total) * 100) / 100;
        } else if (order.paymentMethod === 'card') {
          afterClosingCardFromMixed = Math.round((afterClosingCardFromMixed + order.total) * 100) / 100;
        }
        
        console.log(`  ✅ Pure ticket order: After-closing +${order.total.toFixed(2)}`);
      } else {
        // Pure candy counter order (no tickets) - stays in candy counter
        console.log(`🍿 Pure candy counter order: Order ${order.id} by ${order.userName} - stays in candy counter`);
      }
    });
    
    console.log(`Mixed order processing complete:`);
    console.log(`  After-closing from mixed: ${afterClosingSalesFromMixed.toFixed(2)} (${afterClosingOrdersFromMixed} order portions)`);
    console.log(`  Candy counter from mixed: ${candyCounterSalesFromMixed.toFixed(2)} (${candyCounterOrdersFromMixed} order portions)`);
    console.log(`=== END MIXED ORDER PROCESSING ===`);
    
    console.log(`=== CANDY COUNTER DEBUG FOR REPORT ${dateStr} ===`);
    console.log(`Total orders for date: ${dayOrders.length}`);
    console.log(`Pure candy counter orders (no tickets): ${pureCandyCounterOrders.length}`);
    pureCandyCounterOrders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.total.toFixed(2)} by ${order.userName} (${order.userRole || 'unknown'})`);
    });
    console.log(`All box office orders (box office department only): ${allBoxOfficeOrders.length}`);
    allBoxOfficeOrders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.total.toFixed(2)} by ${order.userName} (${order.userRole || 'unknown'})`);
    });
    console.log(`All after-closing orders (candy counter tickets): ${allAfterClosingOrders.length}`);
    allAfterClosingOrders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.total.toFixed(2)} by ${order.userName} (${order.userRole || 'unknown'})`);
    });
    console.log(`After-closing order portions from mixed processing: ${afterClosingOrdersFromMixed}`);
    console.log('===============================================');
    
    console.log(`=== DEPARTMENT BREAKDOWN DEBUG FOR ${dateStr} ===`);
    console.log(`Total orders found: ${dayOrders.length}`);
    console.log(`Orders by department:`);
    dayOrders.forEach(order => {
      console.log(`  Order ${order.id}: dept=${order.department}, afterClosing=${order.isAfterClosing}, total=${order.total.toFixed(2)}, user=${order.userName}`);
    });
    console.log(`Filtered results:`);
    console.log(`  - Box Office orders (box office department only): ${allBoxOfficeOrders.length}`);
    console.log(`  - Pure Candy Counter orders (no tickets): ${pureCandyCounterOrders.length}`);
    console.log(`  - All After Closing orders (candy counter tickets): ${allAfterClosingOrders.length}`);
    console.log(`  - After Closing order portions (from mixed processing): ${afterClosingOrdersFromMixed}`);
    console.log('===============================================');
    
    // Calculate department sales with enhanced precision - include mixed order handling
    const boxOfficeSales = Math.round(allBoxOfficeOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    
    // Calculate candy counter sales - use the consolidated mixed order processing results
    const candyCounterSales = Math.round((candyCounterSalesFromMixed + pureCandyCounterOrders.reduce((sum, order) => sum + order.total, 0)) * 100) / 100;
    
    // Calculate after-closing sales - use the mixed order processing results
    const afterClosingSalesRaw = Math.round(allAfterClosingOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const afterClosingSales = Math.round(afterClosingSalesFromMixed * 100) / 100;
    console.log(`Total after-closing sales (from mixed order processing): ${afterClosingSales.toFixed(2)}`);
    
    console.log(`=== MIXED ORDER ADJUSTMENT SUMMARY ===`);
    console.log(`Candy Counter Sales (non-tickets only): ${candyCounterSales.toFixed(2)}`);
    console.log(`Box Office Raw: ${boxOfficeSales.toFixed(2)}`);
    console.log(`After Closing Raw: ${afterClosingSalesRaw.toFixed(2)}`);
    console.log(`After Closing Mixed Adjustments: +${afterClosingSalesFromMixed.toFixed(2)}`);
    console.log(`After Closing Final: ${afterClosingSales.toFixed(2)}`);
    console.log('===============================================');
    
    console.log(`=== DEPARTMENT SALES CALCULATION VERIFICATION ===`);
    console.log(`Box Office Sales: ${boxOfficeSales.toFixed(2)} from ${allBoxOfficeOrders.length} orders`);
    console.log(`Candy Counter Sales: ${candyCounterSales.toFixed(2)} from ${pureCandyCounterOrders.length} orders`);
    console.log(`After Closing Sales: ${afterClosingSales.toFixed(2)} from ${afterClosingOrdersFromMixed} order portions`);
    
    const departmentTotal = Math.round((boxOfficeSales + candyCounterSales + afterClosingSales) * 100) / 100;
    console.log(`Total Department Sales: ${departmentTotal.toFixed(2)}`);
    console.log(`Total Sales from Orders: ${totalSales.toFixed(2)}`);
    
    // Verify department totals match overall total with enhanced precision
    const departmentDifference = Math.abs(departmentTotal - totalSales);
    console.log(`Department Difference: ${departmentDifference.toFixed(6)}`);
    
    if (departmentDifference > 0.01) {
      console.error(`❌ DEPARTMENT MISMATCH: Department totals (${departmentTotal.toFixed(2)}) don't match order totals (${totalSales.toFixed(2)})`);
      console.error(`Difference: ${departmentDifference.toFixed(6)}`);
      
      // Additional debugging for department mismatch
      console.error(`=== DEPARTMENT MISMATCH DEBUG ===`);
      console.error(`Individual department calculations:`);
      console.error(`  Box Office: ${boxOfficeSales} (${allBoxOfficeOrders.length} orders)`);
      console.error(`  Candy Counter: ${candyCounterSales} (${pureCandyCounterOrders.length} orders)`);
      console.error(`  After Closing: ${afterClosingSales} (${afterClosingOrdersFromMixed} order portions)`);
      console.error(`  Sum: ${boxOfficeSales} + ${candyCounterSales} + ${afterClosingSales} = ${departmentTotal}`);
      console.error(`  Expected Total: ${totalSales}`);
      console.error(`=== END DEBUG ===`);
    } else {
      console.log(`✅ DEPARTMENT VERIFICATION PASSED: Department totals match order totals within tolerance`);
      console.log(`  Difference: ${departmentDifference.toFixed(6)}`);
    }
    console.log('===============================================');
    
    console.log(`=== ENHANCED SALES CALCULATION ===`);
    console.log(`Pure candy counter orders: ${pureCandyCounterOrders.length}`);
    console.log(`All box office orders (box office department only): ${allBoxOfficeOrders.length}`);
    console.log(`All after-closing orders (candy counter tickets): ${allAfterClosingOrders.length}`);
    console.log(`After-closing order portions (from mixed processing): ${afterClosingOrdersFromMixed}`);
    console.log(`Total box office sales: ${boxOfficeSales.toFixed(2)}`);
    console.log(`Total candy counter sales: ${candyCounterSales.toFixed(2)}`);
    console.log(`Total after-closing sales: ${afterClosingSales.toFixed(2)}`);
    console.log('=======================================');
    
    const departmentBreakdown = {
      'box-office': {
        sales: Math.round(boxOfficeSales * 100) / 100,
        orders: allBoxOfficeOrders.length,
      },
      'candy-counter': {
        sales: Math.round(candyCounterSales * 100) / 100,
        orders: pureCandyCounterOrders.length,
      },
      'after-closing': {
        sales: Math.round(afterClosingSales * 100) / 100,
        orders: afterClosingOrdersFromMixed,
      },
    };
    
    console.log(`=== FINAL DEPARTMENT BREAKDOWN FOR ${dateStr} ===`);
    console.log(`Box Office: ${departmentBreakdown['box-office'].sales.toFixed(2)} (${departmentBreakdown['box-office'].orders} orders)`);
    console.log(`Candy Counter: ${departmentBreakdown['candy-counter'].sales.toFixed(2)} (${departmentBreakdown['candy-counter'].orders} orders)`);
    console.log(`After Closing: ${departmentBreakdown['after-closing'].sales.toFixed(2)} (${departmentBreakdown['after-closing'].orders} order portions)`);
    const finalDepartmentTotal = Math.round((departmentBreakdown['box-office'].sales + departmentBreakdown['candy-counter'].sales + departmentBreakdown['after-closing'].sales) * 100) / 100;
    console.log(`Total Department Sales: ${finalDepartmentTotal.toFixed(2)}`);
    console.log(`Total Sales from Orders: ${totalSales.toFixed(2)}`);
    
    // Final verification that everything adds up correctly with proper tolerance
    const finalDifference = Math.abs(finalDepartmentTotal - totalSales);
    if (finalDifference > 0.02) { // Allow for small rounding differences
      console.error(`FINAL MISMATCH: Department breakdown (${finalDepartmentTotal.toFixed(2)}) doesn't match total sales (${totalSales.toFixed(2)})`);
      console.error(`Final difference: ${finalDifference.toFixed(4)}`);
    } else {
      console.log(`✓ FINAL VERIFICATION: All calculations match within acceptable tolerance`);
      console.log(`  Final difference: ${finalDifference.toFixed(4)}`);
    }
    console.log('===============================================');

    // Calculate payment breakdown by department - use consolidated mixed order processing results
    let boxOfficeCashSales = 0;
    let boxOfficeCardSales = 0;
    let candyCounterCashSales = candyCounterCashFromMixed;
    let candyCounterCardSales = candyCounterCardFromMixed;
    let afterClosingCashSales = afterClosingCashFromMixed;
    let afterClosingCardSales = afterClosingCardFromMixed;
    
    console.log(`Initial payment breakdown from mixed order processing:`);
    console.log(`  Box Office: Cash=${boxOfficeCashSales.toFixed(2)}, Card=${boxOfficeCardSales.toFixed(2)}`);
    console.log(`  Candy Counter: Cash=${candyCounterCashSales.toFixed(2)}, Card=${candyCounterCardSales.toFixed(2)}`);
    console.log(`  After Closing: Cash=${afterClosingCashSales.toFixed(2)}, Card=${afterClosingCardSales.toFixed(2)}`);
    
    console.log(`=== CALCULATING PAYMENT BREAKDOWN BY DEPARTMENT WITH MIXED ORDER HANDLING ===`);
    
    // Box Office orders with proper rounding (box office department only)
    boxOfficeOrders.forEach(order => {
      const orderTotal = Math.round(order.total * 100) / 100;
      if (order.paymentMethod === 'cash') {
        boxOfficeCashSales = Math.round((boxOfficeCashSales + orderTotal) * 100) / 100;
      } else if (order.paymentMethod === 'card') {
        boxOfficeCardSales = Math.round((boxOfficeCardSales + orderTotal) * 100) / 100;
      }
    });
    
    // Add pure candy counter orders (no after-closing tickets) to the consolidated results
    pureCandyCounterOrders.filter(order => {
      const ticketItems = order.items.filter(item => item.product.category === 'after-closing-tickets');
      const nonTicketItems = order.items.filter(item => item.product.category !== 'after-closing-tickets');
      return ticketItems.length === 0 && nonTicketItems.length > 0;
    }).forEach(order => {
      const orderTotal = Math.round(order.total * 100) / 100;
      if (order.paymentMethod === 'cash') {
        candyCounterCashSales = Math.round((candyCounterCashSales + orderTotal) * 100) / 100;
      } else if (order.paymentMethod === 'card') {
        candyCounterCardSales = Math.round((candyCounterCardSales + orderTotal) * 100) / 100;
      }
    });
    
    // After Closing orders - use the split amounts from mixed order processing
    console.log(`=== PROCESSING AFTER CLOSING ORDERS ===`);
    console.log(`Using split amounts from mixed order processing:`);
    console.log(`After Closing Cash Total: ${afterClosingCashSales.toFixed(2)} (from mixed processing)`);
    console.log(`After Closing Card Total: ${afterClosingCardSales.toFixed(2)} (from mixed processing)`);
    console.log(`After Closing Combined Total: ${(afterClosingCashSales + afterClosingCardSales).toFixed(2)}`);
    console.log(`Expected After Closing Total: ${afterClosingSales.toFixed(2)}`);
    const afterClosingPaymentDiff = Math.abs((afterClosingCashSales + afterClosingCardSales) - afterClosingSales);
    if (afterClosingPaymentDiff > 0.01) {
      console.error(`AFTER CLOSING PAYMENT MISMATCH: Cash+Card (${(afterClosingCashSales + afterClosingCardSales).toFixed(2)}) != Total (${afterClosingSales.toFixed(2)}) - Diff: ${afterClosingPaymentDiff.toFixed(4)}`);
    } else {
      console.log(`✓ After closing payment breakdown verified`);
    }
    console.log(`=== END AFTER CLOSING PROCESSING ===`);
    
    // Apply enhanced precision rounding to prevent floating point issues
    boxOfficeCashSales = Math.round(boxOfficeCashSales * 100) / 100;
    boxOfficeCardSales = Math.round(boxOfficeCardSales * 100) / 100;
    candyCounterCashSales = Math.round(candyCounterCashSales * 100) / 100;
    candyCounterCardSales = Math.round(candyCounterCardSales * 100) / 100;
    afterClosingCashSales = Math.round(afterClosingCashSales * 100) / 100;
    afterClosingCardSales = Math.round(afterClosingCardSales * 100) / 100;
    
    console.log(`=== PAYMENT BREAKDOWN BY DEPARTMENT VERIFICATION ===`);
    console.log(`Box Office Cash: ${boxOfficeCashSales.toFixed(2)}`);
    console.log(`Box Office Card: ${boxOfficeCardSales.toFixed(2)}`);
    console.log(`Candy Counter Cash: ${candyCounterCashSales.toFixed(2)}`);
    console.log(`Candy Counter Card: ${candyCounterCardSales.toFixed(2)}`);
    console.log(`After Closing Cash: ${afterClosingCashSales.toFixed(2)}`);
    console.log(`After Closing Card: ${afterClosingCardSales.toFixed(2)}`);
    
    const totalCashByDept = Math.round((boxOfficeCashSales + candyCounterCashSales + afterClosingCashSales) * 100) / 100;
    const totalCardByDept = Math.round((boxOfficeCardSales + candyCounterCardSales + afterClosingCardSales) * 100) / 100;
    
    console.log(`Total Cash by Department: ${totalCashByDept.toFixed(2)} (should match ${cashSales.toFixed(2)})`);
    console.log(`Total Card by Department: ${totalCardByDept.toFixed(2)} (should match ${cardSales.toFixed(2)})`);
    
    // Enhanced payment method verification with detailed logging
    const cashDifference = Math.abs(totalCashByDept - cashSales);
    const cardDifference = Math.abs(totalCardByDept - cardSales);
    
    console.log(`Cash Difference: ${cashDifference.toFixed(6)}`);
    console.log(`Card Difference: ${cardDifference.toFixed(6)}`);
    
    if (cashDifference > 0.01) {
      console.error(`❌ CASH PAYMENT MISMATCH: Department cash (${totalCashByDept.toFixed(2)}) doesn't match total cash (${cashSales.toFixed(2)}) - Difference: ${cashDifference.toFixed(6)}`);
    } else {
      console.log(`✅ CASH VERIFICATION PASSED: ${cashDifference.toFixed(6)} difference`);
    }
    
    if (cardDifference > 0.01) {
      console.error(`❌ CARD PAYMENT MISMATCH: Department card (${totalCardByDept.toFixed(2)}) doesn't match total card (${cardSales.toFixed(2)}) - Difference: ${cardDifference.toFixed(6)}`);
    } else {
      console.log(`✅ CARD VERIFICATION PASSED: ${cardDifference.toFixed(6)} difference`);
    }
    
    if (cashDifference <= 0.01 && cardDifference <= 0.01) {
      console.log(`✅ ALL PAYMENT VERIFICATION PASSED: All payment method totals accurate`);
    } else {
      console.error(`❌ PAYMENT VERIFICATION FAILED: Review calculation logic`);
    }
    console.log('===============================================');
    
    const paymentBreakdown = {
      boxOfficeCash: Math.round(boxOfficeCashSales * 100) / 100,
      boxOfficeCard: Math.round(boxOfficeCardSales * 100) / 100,
      candyCounterCash: Math.round(candyCounterCashSales * 100) / 100,
      candyCounterCard: Math.round(candyCounterCardSales * 100) / 100,
      afterClosingCash: Math.round(afterClosingCashSales * 100) / 100,
      afterClosingCard: Math.round(afterClosingCardSales * 100) / 100,
    };

    // ENHANCED User breakdown - Ensure ALL accounts with sales are captured
    // For staff performance, exclude after-closing sales from candy counter
    // Include ALL users (managers and ushers) who made sales, even multiple accounts on same device
    console.log('=== PROCESSING ALL LOCAL USER ACCOUNTS ===');
    
    const userMap = new Map<string, { userId: string; userName: string; sales: number; orders: number; userRole?: string }>();
    
    dayOrders.forEach(order => {
      // Include ALL orders with valid user data (real transactions)
      // Include both regular candy counter sales AND after-closing sales for ushers
      if (order.userId && order.userName && order.total > 0) {
        const orderType = order.isAfterClosing ? 'after-closing' : (order.department || 'regular');
        console.log(`Processing order from user: ${order.userName} (${order.userRole || 'unknown role'}) - ${order.total.toFixed(2)} [${orderType}]`);
        
        // Enhanced logging for manager/admin sales
        if (order.userRole === 'manager' || order.userRole === 'admin') {
          console.log(`🎯 MANAGER/ADMIN SALE: ${order.userName} (${order.userRole}) - ${order.total.toFixed(2)} in ${orderType}`);
        }
        
        // Use userId as the key to combine multiple sessions from same user
        const existing = userMap.get(order.userId) || {
          userId: order.userId,
          userName: order.userName,
          sales: 0,
          orders: 0,
          userRole: order.userRole,
        };
        existing.sales += order.total;
        existing.orders += 1;
        // Update role if not set or if current order has a higher priority role
        if (order.userRole && (!existing.userRole || shouldUpdateRole(existing.userRole, order.userRole))) {
          existing.userRole = order.userRole;
        }
        userMap.set(order.userId, existing);
      } else if (order.total > 0) {
        console.log(`Order without user info: ${order.total.toFixed(2)} - userId: ${order.userId || 'none'}, userName: ${order.userName || 'none'}`);
      }
    });
    
    console.log(`Raw user accounts found: ${userMap.size}`);
    userMap.forEach((user, userId) => {
      console.log(`Raw user: ${user.userName} (ID: ${userId}) - ${user.sales.toFixed(2)} (${user.orders} orders) - Role: ${user.userRole || 'unknown'}`);
    });
    
    // Filter out any test, demo, default, or system accounts but keep ALL real accounts
    const userBreakdown = Array.from(userMap.values()).filter(user => {
      const isValidName = isValidRealUser(user.userName);
      const hasSales = user.sales > 0;
      const isValid = isValidName && hasSales;
      
      if (isValid) {
        const roleIndicator = (user.userRole === 'manager' || user.userRole === 'admin') ? ' 🎯' : '';
        console.log(`✓ Valid user: ${user.userName} (${user.userRole || 'unknown'}) - ${user.sales.toFixed(2)} (${user.orders} orders)${roleIndicator}`);
      } else {
        const reason = !isValidName ? 'invalid name pattern' : !hasSales ? 'no sales' : 'unknown';
        console.log(`✗ Filtered out: ${user.userName} - ${user.sales.toFixed(2)} (reason: ${reason})`);
      }
      return isValid;
    });
    
    console.log(`Final local user accounts: ${userBreakdown.length}`);

    // Top products - only from actual sales
    const productMap = new Map<string, { productId: string; productName: string; quantitySold: number; revenue: number }>();
    dayOrders.forEach(order => {
      // Only include orders with valid transactions
      if (order.total > 0) {
        order.items.forEach(item => {
          const existing = productMap.get(item.product.id) || {
            productId: item.product.id,
            productName: item.product.name,
            quantitySold: 0,
            revenue: 0,
          };
          existing.quantitySold += item.quantity;
          existing.revenue += item.product.price * item.quantity;
          productMap.set(item.product.id, existing);
        });
      }
    });
    const topProducts = Array.from(productMap.values())
      .filter(product => product.revenue > 0) // Only products with actual revenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Show breakdown - separate each show's sales, orders, and payment methods
    const showBreakdown = {
      '1st-show': {
        sales: 0,
        orders: 0,
        cashSales: 0,
        cardSales: 0,
        creditCardFees: 0,
      },
      '2nd-show': {
        sales: 0,
        orders: 0,
        cashSales: 0,
        cardSales: 0,
        creditCardFees: 0,
      },
      'nightly-show': {
        sales: 0,
        orders: 0,
        cashSales: 0,
        cardSales: 0,
        creditCardFees: 0,
      },
      'matinee': {
        sales: 0,
        orders: 0,
        cashSales: 0,
        cardSales: 0,
        creditCardFees: 0,
      },
    };
    
    console.log(`=== CALCULATING SHOW BREAKDOWN ===`);
    console.log(`Processing ${boxOfficeOrders.length} box office orders for show breakdown`);
    
    // Process box office orders by show type with enhanced precision and payment method tracking
    boxOfficeOrders.forEach(order => {
      if (order.showType && showBreakdown[order.showType]) {
        // Round to avoid floating point precision issues
        const orderTotal = Math.round(order.total * 100) / 100;
        const orderCreditCardFee = Math.round((order.creditCardFee || 0) * 100) / 100;
        
        showBreakdown[order.showType].sales = Math.round((showBreakdown[order.showType].sales + orderTotal) * 100) / 100;
        showBreakdown[order.showType].orders += 1;
        showBreakdown[order.showType].creditCardFees = Math.round((showBreakdown[order.showType].creditCardFees + orderCreditCardFee) * 100) / 100;
        
        // Track actual payment methods for each show
        if (order.paymentMethod === 'cash') {
          showBreakdown[order.showType].cashSales = Math.round((showBreakdown[order.showType].cashSales + orderTotal) * 100) / 100;
        } else if (order.paymentMethod === 'card') {
          showBreakdown[order.showType].cardSales = Math.round((showBreakdown[order.showType].cardSales + orderTotal) * 100) / 100;
        }
        
        console.log(`${order.showType}: +${orderTotal.toFixed(2)} (${order.paymentMethod}) (Order ${order.id}) - Running total: ${showBreakdown[order.showType].sales.toFixed(2)}, Cash: ${showBreakdown[order.showType].cashSales.toFixed(2)}, Card: ${showBreakdown[order.showType].cardSales.toFixed(2)}`);
      } else {
        console.log(`Order ${order.id} missing showType or invalid showType: ${order.showType}`);
      }
    });
    
    // Verify show breakdown totals match box office totals with proper rounding
    const showBreakdownTotal = Math.round(Object.values(showBreakdown).reduce((sum, show) => sum + show.sales, 0) * 100) / 100;
    const boxOfficeTotal = Math.round(boxOfficeOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    
    console.log(`=== SHOW BREAKDOWN VERIFICATION ===`);
    console.log(`Show breakdown total: ${showBreakdownTotal.toFixed(2)}`);
    console.log(`Box office orders total: ${boxOfficeTotal.toFixed(2)}`);
    const showDifference = Math.abs(showBreakdownTotal - boxOfficeTotal);
    console.log(`Difference: ${showDifference.toFixed(4)}`);
    
    if (showDifference > 0.02) {
      console.error(`SHOW BREAKDOWN MISMATCH: Show totals don't match box office totals`);
    } else {
      console.log(`✓ SHOW VERIFICATION: Show breakdown matches box office totals within tolerance`);
    }
    
    console.log(`=== FINAL SHOW BREAKDOWN WITH PAYMENT METHODS ===`);
    console.log(`1st Show: ${showBreakdown['1st-show'].sales.toFixed(2)} (${showBreakdown['1st-show'].orders} orders) - Cash: ${showBreakdown['1st-show'].cashSales.toFixed(2)}, Card: ${showBreakdown['1st-show'].cardSales.toFixed(2)}, Fees: ${showBreakdown['1st-show'].creditCardFees.toFixed(2)}`);
    console.log(`2nd Show: ${showBreakdown['2nd-show'].sales.toFixed(2)} (${showBreakdown['2nd-show'].orders} orders) - Cash: ${showBreakdown['2nd-show'].cashSales.toFixed(2)}, Card: ${showBreakdown['2nd-show'].cardSales.toFixed(2)}, Fees: ${showBreakdown['2nd-show'].creditCardFees.toFixed(2)}`);
    console.log(`Nightly Show: ${showBreakdown['nightly-show'].sales.toFixed(2)} (${showBreakdown['nightly-show'].orders} orders) - Cash: ${showBreakdown['nightly-show'].cashSales.toFixed(2)}, Card: ${showBreakdown['nightly-show'].cardSales.toFixed(2)}, Fees: ${showBreakdown['nightly-show'].creditCardFees.toFixed(2)}`);
    console.log(`Matinee: ${showBreakdown['matinee'].sales.toFixed(2)} (${showBreakdown['matinee'].orders} orders) - Cash: ${showBreakdown['matinee'].cashSales.toFixed(2)}, Card: ${showBreakdown['matinee'].cardSales.toFixed(2)}, Fees: ${showBreakdown['matinee'].creditCardFees.toFixed(2)}`);
    
    // Verify show payment method totals match overall totals with proper rounding
    const totalShowCash = Math.round(Object.values(showBreakdown).reduce((sum, show) => sum + show.cashSales, 0) * 100) / 100;
    const totalShowCard = Math.round(Object.values(showBreakdown).reduce((sum, show) => sum + show.cardSales, 0) * 100) / 100;
    const totalShowFees = Math.round(Object.values(showBreakdown).reduce((sum, show) => sum + show.creditCardFees, 0) * 100) / 100;
    
    console.log(`Show totals verification:`);
    console.log(`  Total show cash: ${totalShowCash.toFixed(2)} (should match box office cash: ${boxOfficeCashSales.toFixed(2)})`);
    console.log(`  Total show card: ${totalShowCard.toFixed(2)} (should match box office card: ${boxOfficeCardSales.toFixed(2)})`);
    console.log(`  Total show fees: ${totalShowFees.toFixed(2)} (should match box office fees portion)`);
    
    // Verify show cash and card totals match box office totals
    const showCashDifference = Math.abs(totalShowCash - boxOfficeCashSales);
    const showCardDifference = Math.abs(totalShowCard - boxOfficeCardSales);
    
    if (showCashDifference > 0.02) {
      console.error(`SHOW CASH MISMATCH: Show cash (${totalShowCash.toFixed(2)}) doesn't match box office cash (${boxOfficeCashSales.toFixed(2)})`);
    }
    if (showCardDifference > 0.02) {
      console.error(`SHOW CARD MISMATCH: Show card (${totalShowCard.toFixed(2)}) doesn't match box office card (${boxOfficeCardSales.toFixed(2)})`);
    }
    if (showCashDifference <= 0.02 && showCardDifference <= 0.02) {
      console.log(`✓ SHOW PAYMENT VERIFICATION: Show payment totals match box office within tolerance`);
    }
    console.log('=======================================');

    // Enhanced comprehensive verification of all calculations
    console.log(`=== COMPREHENSIVE CALCULATION VERIFICATION ===`);
    
    // Calculate verification values with enhanced precision
    const cashPlusCard = Math.round((cashSales + cardSales) * 100) / 100;
    const departmentSum = Math.round((boxOfficeSales + candyCounterSales + afterClosingSales) * 100) / 100;
    const deptCashSum = Math.round((boxOfficeCashSales + candyCounterCashSales + afterClosingCashSales) * 100) / 100;
    const deptCardSum = Math.round((boxOfficeCardSales + candyCounterCardSales + afterClosingCardSales) * 100) / 100;
    const showSum = Math.round(Object.values(showBreakdown).reduce((sum, show) => sum + show.sales, 0) * 100) / 100;
    
    // Enhanced verification with tighter tolerances
    const verificationResults = {
      totalSalesMatch: Math.abs(cashPlusCard - totalSales) <= 0.01,
      departmentTotalsMatch: Math.abs(departmentSum - totalSales) <= 0.01,
      paymentBreakdownMatch: Math.abs(deptCashSum - cashSales) <= 0.01 && Math.abs(deptCardSum - cardSales) <= 0.01,
      showBreakdownMatch: boxOfficeOrders.length === 0 || Math.abs(showSum - boxOfficeSales) <= 0.01
    };
    
    // Detailed verification logging
    console.log(`Enhanced Verification Results:`);
    console.log(`  1. Total Sales (Cash + Card = Total): ${verificationResults.totalSalesMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     Cash: ${cashSales.toFixed(2)} + Card: ${cardSales.toFixed(2)} = ${cashPlusCard.toFixed(2)} vs Total: ${totalSales.toFixed(2)}`);
    console.log(`     Difference: ${Math.abs(cashPlusCard - totalSales).toFixed(6)}`);
    
    console.log(`  2. Department Totals: ${verificationResults.departmentTotalsMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     Box Office: ${boxOfficeSales.toFixed(2)} + Candy Counter: ${candyCounterSales.toFixed(2)} + After Closing: ${afterClosingSales.toFixed(2)} = ${departmentSum.toFixed(2)} vs Total: ${totalSales.toFixed(2)}`);
    console.log(`     Difference: ${Math.abs(departmentSum - totalSales).toFixed(6)}`);
    
    console.log(`  3. Payment Breakdown: ${verificationResults.paymentBreakdownMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     Dept Cash: ${deptCashSum.toFixed(2)} vs Total Cash: ${cashSales.toFixed(2)} (Diff: ${Math.abs(deptCashSum - cashSales).toFixed(6)})`);
    console.log(`     Dept Card: ${deptCardSum.toFixed(2)} vs Total Card: ${cardSales.toFixed(2)} (Diff: ${Math.abs(deptCardSum - cardSales).toFixed(6)})`);
    
    console.log(`  4. Show Breakdown: ${verificationResults.showBreakdownMatch ? '✅ PASS' : '❌ FAIL'}`);
    if (boxOfficeOrders.length > 0) {
      console.log(`     Show Total: ${showSum.toFixed(2)} vs Box Office: ${boxOfficeSales.toFixed(2)} (Diff: ${Math.abs(showSum - boxOfficeSales).toFixed(6)})`);
    } else {
      console.log(`     No box office orders to verify`);
    }
    
    const allVerificationsPassed = Object.values(verificationResults).every(result => result);
    console.log(`\n🎯 OVERALL VERIFICATION: ${allVerificationsPassed ? '✅ ALL CALCULATIONS ACCURATE' : '❌ CALCULATION ERRORS DETECTED'}`);
    
    if (!allVerificationsPassed) {
      console.error(`\n⚠️  CALCULATION ACCURACY ISSUES DETECTED`);
      console.error(`Failed verifications:`);
      if (!verificationResults.totalSalesMatch) console.error(`  - Total Sales calculation mismatch`);
      if (!verificationResults.departmentTotalsMatch) console.error(`  - Department totals mismatch`);
      if (!verificationResults.paymentBreakdownMatch) console.error(`  - Payment breakdown mismatch`);
      if (!verificationResults.showBreakdownMatch) console.error(`  - Show breakdown mismatch`);
      console.error(`Review the detailed differences above to identify calculation issues.`);
    } else {
      console.log(`✅ ALL CALCULATIONS VERIFIED: Report data is mathematically accurate`);
    }
    
    console.log(`=== LOCAL REPORT SUMMARY ===`);
    console.log(`Total Sales: ${totalSales.toFixed(2)}`);
    console.log(`Total Orders: ${dayOrders.length}`);
    console.log(`User Accounts: ${userBreakdown.length}`);
    console.log(`Calculation Accuracy: ${allVerificationsPassed ? 'Verified ✅' : 'Issues Detected ❌'}`);
    console.log(`=== END LOCAL SUMMARY ===`);

    return {
      date: dateStr,
      totalSales,
      totalOrders: dayOrders.length,
      cashSales,
      cardSales,
      creditCardFees,
      departmentBreakdown,
      showBreakdown,
      paymentBreakdown,
      userBreakdown,
      topProducts,
    };
  }, [orders, isValidRealUser, shouldUpdateRole]);

  // Save nightly report and prepare for new day
  const saveNightlyReportAndReset = useCallback(async () => {
    try {
      const now = new Date();
      
      // Adjust for 2am cutoff - if it's before 2am, consider it part of previous business day
      const businessDate = new Date(now);
      if (now.getHours() < 2) {
        businessDate.setDate(businessDate.getDate() - 1);
      }
      
      const year = businessDate.getFullYear();
      const month = String(businessDate.getMonth() + 1).padStart(2, '0');
      const day = String(businessDate.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      // Check if we need to process new day (save previous day's report and reset)
      const lastProcessDate = await AsyncStorage.getItem('last_nightly_process_date');
      
      if (lastProcessDate !== today) {
        console.log('=== NIGHTLY REPORT SAVE & RESET ===');
        console.log(`Current date: ${today}`);
        console.log(`Last process date: ${lastProcessDate || 'never'}`);
        
        // Always save the previous day's report if we have orders from that day
        if (lastProcessDate) {
          // Create proper date object for the previous day
          const previousDate = new Date(lastProcessDate + 'T12:00:00.000Z'); // Use noon to avoid timezone issues
          console.log(`Saving nightly report for ${lastProcessDate}...`);
          
          // Generate and save the previous day's report
          const previousDayReport = generateNightlyReport(previousDate);
          
          // Only save if there were actual sales/orders
          if (previousDayReport.totalOrders > 0 || previousDayReport.totalSales > 0) {
            const reportKey = `nightly_report_${lastProcessDate}`;
            const reportData = {
              ...previousDayReport,
              savedAt: new Date().toISOString(),
              deviceInfo: 'Local Device',
              isArchived: true
            };
            
            await AsyncStorage.setItem(reportKey, JSON.stringify(reportData));
            console.log(`✓ Saved nightly report for ${lastProcessDate}`);
            console.log(`  - Total Sales: ${previousDayReport.totalSales.toFixed(2)}`);
            console.log(`  - Total Orders: ${previousDayReport.totalOrders}`);
            console.log(`  - Users: ${previousDayReport.userBreakdown.length}`);
            
            // Keep a list of saved reports for easy access
            const savedReportsKey = 'saved_nightly_reports';
            const existingSavedReports = await AsyncStorage.getItem(savedReportsKey);
            const savedReports = existingSavedReports ? JSON.parse(existingSavedReports) : [];
            
            // Add new report to list if not already there
            if (!savedReports.includes(lastProcessDate)) {
              savedReports.push(lastProcessDate);
              savedReports.sort(); // Keep chronological order
              await AsyncStorage.setItem(savedReportsKey, JSON.stringify(savedReports));
              console.log(`✓ Added ${lastProcessDate} to saved reports list`);
            }
          } else {
            console.log(`No sales data for ${lastProcessDate}, skipping report save`);
          }
        }
        
        // Update last process date to today - this marks the start of a new day
        await AsyncStorage.setItem('last_nightly_process_date', today);
        
        // Clear any temporary data that should reset for the new day
        console.log('✓ New day started - ready for fresh sales data');
        console.log('✓ Nightly report processing complete for new day');
        console.log('=== NIGHTLY PROCESS COMPLETE ===');
      } else {
        // Same day - no action needed
        console.log(`Same day (${today}) - no nightly processing needed`);
      }
    } catch (error) {
      console.error('Error in nightly report save & reset:', error);
      // Don't throw error to prevent app crashes
    }
  }, [generateNightlyReport]);

  // Auto-clear nightly reports after 14 days and save daily reports
  const autoCleanOldReports = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      // Check if we need to clear old data (run once per day)
      const lastCleanDate = await AsyncStorage.getItem('last_auto_clean_date');
      
      if (lastCleanDate !== today) {
        console.log('=== DAILY REPORT MANAGEMENT & AUTO-CLEAN ===');
        console.log(`Current date: ${today}`);
        console.log(`Last clean date: ${lastCleanDate || 'never'}`);
        
        // Calculate cutoff date (14 days ago from today)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 14);
        const cutoffYear = cutoffDate.getFullYear();
        const cutoffMonth = String(cutoffDate.getMonth() + 1).padStart(2, '0');
        const cutoffDay = String(cutoffDate.getDate()).padStart(2, '0');
        const cutoffDateStr = `${cutoffYear}-${cutoffMonth}-${cutoffDay}`;
        
        console.log(`Auto-clearing reports older than ${cutoffDateStr} (keeping current + 14 days)`);
        
        // Keep only orders from the last 14 days + today (15 days total)
        const recentOrders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          const orderYear = orderDate.getFullYear();
          const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
          const orderDay = String(orderDate.getDate()).padStart(2, '0');
          const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
          const isRecent = orderDateStr >= cutoffDateStr;
          if (!isRecent) {
            console.log(`Clearing old order from ${orderDateStr}: ${order.total.toFixed(2)} (Show: ${order.showType || 'none'})`);
          }
          return isRecent;
        });
        
        const clearedCount = orders.length - recentOrders.length;
        
        if (clearedCount > 0) {
          // Save filtered orders
          await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(recentOrders));
          setOrders(recentOrders);
          
          console.log(`✓ Auto-cleared ${clearedCount} old orders (older than 14 days)`);
          console.log(`✓ Kept ${recentOrders.length} orders from current night + last 14 days`);
        } else {
          console.log('No old orders to clear');
        }
        
        // Clean up saved nightly reports older than 14 days
        const savedReportsKey = 'saved_nightly_reports';
        const existingSavedReports = await AsyncStorage.getItem(savedReportsKey);
        if (existingSavedReports) {
          const savedReports = JSON.parse(existingSavedReports);
          const recentSavedReports = savedReports.filter((reportDate: string) => reportDate >= cutoffDateStr);
          
          // Remove old report data files
          const removedReports = savedReports.filter((reportDate: string) => reportDate < cutoffDateStr);
          for (const reportDate of removedReports) {
            try {
              await AsyncStorage.removeItem(`nightly_report_${reportDate}`);
              console.log(`Removed old saved report: ${reportDate}`);
            } catch (error) {
              console.error(`Error removing old report ${reportDate}:`, error);
            }
          }
          
          // Update saved reports list
          await AsyncStorage.setItem(savedReportsKey, JSON.stringify(recentSavedReports));
          console.log(`✓ Cleaned up ${removedReports.length} old saved reports`);
        }
        
        // Save auto-clean log for reporting
        const cleanLog = {
          date: today,
          clearedCount,
          keptCount: recentOrders.length,
          cutoffDate: cutoffDateStr,
          timestamp: new Date().toISOString(),
          success: true
        };
        await AsyncStorage.setItem('last_auto_clean_log', JSON.stringify(cleanLog));
        
        // Update last clean date
        await AsyncStorage.setItem('last_auto_clean_date', today);
        console.log('✓ Daily management complete - system ready for new day');
        console.log('=== DAILY MANAGEMENT COMPLETE ===');
      } else {
        console.log(`Same day (${today}) - no auto-clean needed`);
      }
    } catch (error) {
      console.error('Error in daily report management:', error);
      // Save error log but don't crash the app
      try {
        const errorLog = {
          date: new Date().toISOString().split('T')[0],
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          success: false
        };
        await AsyncStorage.setItem('last_auto_clean_log', JSON.stringify(errorLog));
      } catch (logError) {
        console.error('Failed to save error log:', logError);
      }
    }
  }, [orders]);

  // Generate aggregated report from all network devices (for managers)
  const generateAggregatedReport = useCallback(async (date?: Date): Promise<NightlyReport> => {
    const reportDate = date || new Date();
    const dateStr = reportDate.toISOString().split('T')[0];
    
    console.log('=== GENERATING COMPREHENSIVE AGGREGATED REPORT ===');
    console.log(`Date: ${dateStr}`);
    console.log('Ensuring all devices and all accounts are included...');
    console.log('Using static IP addresses for reliable device identification...');
    
    try {
      // Import TabletUtils for device info with error handling
      let TabletUtils;
      let localDeviceInfo;
      try {
        const tabletUtilsModule = await import('@/constants/tablet-utils');
        TabletUtils = tabletUtilsModule.TabletUtils;
        localDeviceInfo = TabletUtils.getDeviceInfo();
        console.log('Successfully loaded TabletUtils and device info');
      } catch (error) {
        console.error('Error loading TabletUtils:', error);
        // Fallback device info
        localDeviceInfo = {
          deviceId: 'fallback-device',
          staticIP: '192.168.1.100',
          hash: 'fallback',
          ipIndex: 100
        };
        console.log('Using fallback device info');
      }
      
      // No network devices - local only
      const networkDevices: any[] = [];
      console.log('Network functionality disabled - local device only');
      
      // Log static IP information for each device
      networkDevices.forEach(device => {
        const terminalInfo = device.terminalNumber ? `Terminal ${device.terminalNumber}` : 'Unknown Terminal';
        console.log(`${terminalInfo} - ${device.name}: Static IP ${device.ip}`);
      });
      
      // Always get local report first - this includes ALL local accounts
      const localReport = generateNightlyReport(date);
      console.log(`Local device (Static IP: ${localDeviceInfo.staticIP}) - Sales: ${localReport.totalSales.toFixed(2)}, Orders: ${localReport.totalOrders}, Users: ${localReport.userBreakdown.length}`);
      
      // If no network devices, return enhanced local report
      if (networkDevices.length === 0) {
        console.log('No network devices configured, returning comprehensive local report');
        const filteredUserBreakdown = localReport.userBreakdown
          .filter(user => isValidRealUser(user.userName) && user.sales > 0)
          .map(user => ({
            ...user,
            deviceIp: localDeviceInfo.staticIP,
            deviceName: 'This Device (Local)'
          }));
        console.log(`Local comprehensive - Users: ${filteredUserBreakdown.length}, Sales: ${localReport.totalSales.toFixed(2)}`);
        return {
          ...localReport,
          userBreakdown: filteredUserBreakdown
        };
      }
      
      // No network devices to fetch from
      const networkDeviceData: any[] = [];
      console.log('No network devices to process - local only');
      
      // No network devices to validate
      const validDeviceData: any[] = [];
      const activeDeviceCount = 0;
      const totalDeviceCount = networkDevices.length + 1; // +1 for local device
      const activeDeviceCountWithLocal = activeDeviceCount + (localReport.totalSales > 0 ? 1 : 0);
      
      console.log(`Device Status Summary:`);
      console.log(`- Total configured devices: ${networkDevices.length} network + 1 local = ${totalDeviceCount}`);
      console.log(`- Successfully connected: ${validDeviceData.length} out of ${networkDevices.length} network devices`);
      console.log(`- Active devices (with sales): ${activeDeviceCountWithLocal} out of ${totalDeviceCount}`);
      
      // Log detailed device connection status with terminal numbers and static IPs
      networkDevices.forEach((device, index) => {
        const data = networkDeviceData[index];
        const terminalInfo = device.terminalNumber ? `Terminal ${device.terminalNumber}` : 'Unknown Terminal';
        if (data) {
          const isActive = data.totalSales > 0;
          const status = isActive ? 'ACTIVE' : 'INACTIVE (no sales)';
          console.log(`✓ ${terminalInfo} - ${device.name} (Static IP: ${device.ip}): ${data.totalSales.toFixed(2)} sales, ${data.totalOrders} orders, ${data.userBreakdown?.length || 0} users [${status}]`);
        } else {
          console.log(`✗ ${terminalInfo} - ${device.name} (Static IP: ${device.ip}): OFFLINE/UNREACHABLE`);
        }
      });
      
      // Log local device status
      const localIsActive = localReport.totalSales > 0;
      const localStatus = localIsActive ? 'ACTIVE' : 'INACTIVE (no sales)';
      console.log(`✓ Terminal 1 - This Device (Static IP: ${localDeviceInfo.staticIP}): ${localReport.totalSales.toFixed(2)} sales, ${localReport.totalOrders} orders, ${localReport.userBreakdown.length} users [${localStatus}]`);
      
      // Aggregate all financial data
      let aggregatedTotalSales = localReport.totalSales;
      let aggregatedTotalOrders = localReport.totalOrders;
      let aggregatedCashSales = localReport.cashSales;
      let aggregatedCardSales = localReport.cardSales;
      let aggregatedCreditCardFees = localReport.creditCardFees;
      
      // Aggregate department breakdowns
      let aggregatedBoxOfficeSales = localReport.departmentBreakdown['box-office']?.sales || 0;
      let aggregatedBoxOfficeOrders = localReport.departmentBreakdown['box-office']?.orders || 0;
      let aggregatedCandyCounterSales = localReport.departmentBreakdown['candy-counter']?.sales || 0;
      let aggregatedCandyCounterOrders = localReport.departmentBreakdown['candy-counter']?.orders || 0;
      let aggregatedAfterClosingSales = localReport.departmentBreakdown['after-closing']?.sales || 0;
      let aggregatedAfterClosingOrders = localReport.departmentBreakdown['after-closing']?.orders || 0;
      
      // No network devices to add data from
      console.log('No network device data to aggregate - using local data only');
      
      // ENHANCED USER AGGREGATION - Only include users from ACTIVE devices with sales
      console.log('=== AGGREGATING USER ACCOUNTS FROM ACTIVE DEVICES ONLY ===');
      
      // Start with local users (only accounts that have sales) - use static IP
      const allUsers = localReport.userBreakdown
        .filter(user => {
          const isValid = isValidRealUser(user.userName) && user.sales > 0;
          if (isValid) {
            console.log(`Local active user: ${user.userName} (${user.userRole || 'unknown role'}) - ${user.sales.toFixed(2)}`);
          } else {
            console.log(`Local filtered user: ${user.userName} - ${user.sales.toFixed(2)} (reason: ${!isValidRealUser(user.userName) ? 'invalid name' : 'no sales'})`);
          }
          return isValid;
        })
        .map(user => ({
          ...user,
          deviceIp: localDeviceInfo.staticIP,
          deviceName: 'This Device (Local)'
        }));
      
      // No network devices to process users from
      console.log('No network device users to process - using local users only');
      
      console.log(`Total users collected before deduplication: ${allUsers.length}`);
      
      // CRITICAL: Enhanced user deduplication that preserves multiple accounts per device
      // Only include users from active devices and filter out inactive users
      const userMap = new Map<string, { userId: string; userName: string; sales: number; orders: number; deviceIp?: string; deviceName?: string; userRole?: string }>();
      
      allUsers.forEach(user => {
        // Only process users with sales > 0 from active devices
        if (user.sales > 0) {
          // Create unique key that includes static device IP to show same user on different devices separately
          const uniqueKey = `${user.userName}_${user.deviceIp || localDeviceInfo.staticIP}_${user.deviceName || 'This Device'}`;
          
          const existing = userMap.get(uniqueKey);
          if (existing) {
            // Same user on same device - combine their sales (multiple sessions)
            console.log(`Combining sessions for active user ${user.userName} on ${user.deviceName} (${user.deviceIp}): ${existing.sales.toFixed(2)} + ${user.sales.toFixed(2)}`);
            existing.sales += user.sales;
            existing.orders += user.orders;
            // Update role if we get better role info
            if (user.userRole && (!existing.userRole || existing.userRole === 'usher')) {
              existing.userRole = user.userRole;
            }
          } else {
            // New active user or same user on different device
            console.log(`Adding active user entry: ${user.userName} on ${user.deviceName} (${user.deviceIp}) - ${user.sales.toFixed(2)}`);
            userMap.set(uniqueKey, {
              userId: user.userId,
              userName: user.userName,
              sales: user.sales,
              orders: user.orders,
              deviceIp: user.deviceIp,
              deviceName: user.deviceName,
              userRole: user.userRole
            });
          }
        } else {
          console.log(`Skipping inactive user: ${user.userName} on ${user.deviceName} - no sales`);
        }
      });
      
      // Final filter to ensure only users with sales > 0 are included
      const aggregatedUserBreakdown = Array.from(userMap.values()).filter(user => user.sales > 0);
      console.log(`Final aggregated active users: ${aggregatedUserBreakdown.length}`);
      
      // Log final user breakdown by active device only
      const usersByDevice = new Map<string, typeof aggregatedUserBreakdown>();
      aggregatedUserBreakdown.forEach(user => {
        const deviceKey = user.deviceName || 'Unknown Device';
        if (!usersByDevice.has(deviceKey)) {
          usersByDevice.set(deviceKey, []);
        }
        usersByDevice.get(deviceKey)!.push(user);
      });
      
      console.log(`=== FINAL AGGREGATED REPORT SUMMARY ===`);
      console.log(`Date: ${dateStr}`);
      console.log(`Network devices configured: ${networkDevices.length}`);
      console.log(`Network devices with data: ${validDeviceData.length}`);
      console.log(`Total devices (including local): ${totalDeviceCount}`);
      console.log(`Active devices (with sales): ${activeDeviceCountWithLocal}`);
      console.log(`TOTAL SALES: ${aggregatedTotalSales.toFixed(2)}`);
      console.log(`TOTAL ORDERS: ${aggregatedTotalOrders}`);
      console.log(`TOTAL UNIQUE USER ENTRIES: ${aggregatedUserBreakdown.length}`);
      
      console.log(`Department breakdown:`);
      console.log(`  - Box Office: ${aggregatedBoxOfficeSales.toFixed(2)} (${aggregatedBoxOfficeOrders} orders)`);
      console.log(`  - Candy Counter: ${aggregatedCandyCounterSales.toFixed(2)} (${aggregatedCandyCounterOrders} orders)`);
      console.log(`  - After Closing: ${aggregatedAfterClosingSales.toFixed(2)} (${aggregatedAfterClosingOrders} orders)`);
      
      console.log(`Users by device (ACTIVE DEVICES WITH SALES ONLY):`);
      usersByDevice.forEach((users, deviceName) => {
        const deviceTotal = users.reduce((sum, u) => sum + u.sales, 0);
        const activeUsers = users.filter(u => u.sales > 0);
        if (deviceTotal > 0 && activeUsers.length > 0) { // Only show devices with active users
          console.log(`  ${deviceName} (${deviceTotal.toFixed(2)} total, ${activeUsers.length} active users):`);
          activeUsers.forEach(u => {
            console.log(`    - ${u.userName} (${u.userRole || 'unknown'}): ${u.sales.toFixed(2)} (${u.orders} orders) [ACTIVE]`);
          });
        }
      });
      
      console.log(`Device breakdown (ACTIVE DEVICES WITH SALES ONLY):`);
      if (localReport.totalSales > 0) {
        const activeLocalUsers = localReport.userBreakdown.filter(u => isValidRealUser(u.userName) && u.sales > 0).length;
        console.log(`  - Terminal 1 - This Device (Static IP: ${localDeviceInfo.staticIP}): ${localReport.totalSales.toFixed(2)} (${localReport.totalOrders} orders, ${activeLocalUsers} active users) [ACTIVE]`);
      } else {
        console.log(`  - Terminal 1 - This Device (Static IP: ${localDeviceInfo.staticIP}): INACTIVE (no sales)`);
      }
      // No network devices to show
      console.log('No network devices configured');
      console.log(`=== END COMPREHENSIVE SUMMARY ===`);
      
      return {
        date: dateStr,
        totalSales: aggregatedTotalSales,
        totalOrders: aggregatedTotalOrders,
        cashSales: aggregatedCashSales,
        cardSales: aggregatedCardSales,
        creditCardFees: aggregatedCreditCardFees,
        departmentBreakdown: {
          'box-office': {
            sales: aggregatedBoxOfficeSales,
            orders: aggregatedBoxOfficeOrders,
          },
          'candy-counter': {
            sales: aggregatedCandyCounterSales,
            orders: aggregatedCandyCounterOrders,
          },
          'after-closing': {
            sales: aggregatedAfterClosingSales,
            orders: aggregatedAfterClosingOrders,
          },
        },
        userBreakdown: aggregatedUserBreakdown,
        topProducts: [] // Top products removed from aggregated reports
      };
    } catch (error) {
      console.error('Error generating aggregated report:', error);
      console.log('Falling back to comprehensive local report due to error');
      
      try {
        const localReport = generateNightlyReport(date);
        
        // Try to get device info, fallback if needed
        let localDeviceInfo;
        try {
          const { TabletUtils } = await import('@/constants/tablet-utils');
          localDeviceInfo = TabletUtils.getDeviceInfo();
        } catch (deviceError) {
          console.error('Error getting device info in fallback:', deviceError);
          localDeviceInfo = {
            deviceId: 'fallback-device',
            staticIP: '192.168.1.100',
            hash: 'fallback',
            ipIndex: 100
          };
        }
        
        // Still filter out default accounts from local report but ensure all real accounts are included
        const filteredUserBreakdown = localReport.userBreakdown.filter(user => 
          isValidRealUser(user.userName) && user.sales > 0
        ).map(user => ({
          ...user,
          deviceIp: localDeviceInfo.staticIP,
          deviceName: 'This Device (Local)'
        }));
        console.log(`Local fallback comprehensive - Users: ${filteredUserBreakdown.length}, Sales: ${localReport.totalSales.toFixed(2)}`);
        return {
          ...localReport,
          userBreakdown: filteredUserBreakdown
        };
      } catch (fallbackError) {
        console.error('Error in fallback report generation:', fallbackError);
        throw new Error(`Failed to generate aggregated report: ${error instanceof Error ? error.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'}`);
      }
    }
  }, [generateNightlyReport, isValidRealUser]);

  // Check for new day, save reports, and auto-clean old reports on app start and periodically
  useEffect(() => {
    console.log('=== INITIALIZING DAILY MANAGEMENT SYSTEM ===');
    
    // Run immediately on app start with a small delay to ensure everything is loaded
    const initTimeout = setTimeout(() => {
      console.log('Running initial daily management checks...');
      saveNightlyReportAndReset();
      autoCleanOldReports();
    }, 1000); // 1 second delay
    
    // Check every hour for new day and auto-clean
    const hourlyInterval = setInterval(() => {
      console.log('Running hourly daily management checks...');
      saveNightlyReportAndReset();
      autoCleanOldReports();
    }, 60 * 60 * 1000); // Every hour
    
    // Also check every 15 minutes for more responsive new day detection
    const frequentInterval = setInterval(() => {
      console.log('Running frequent new day check...');
      saveNightlyReportAndReset();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    // Check at 2am (or close to it) for immediate new day processing
    const twoAmCheck = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Run between 2:00 AM and 2:05 AM
      if (hours === 2 && minutes <= 5) {
        console.log('2am detected - running immediate new day processing...');
        saveNightlyReportAndReset();
        autoCleanOldReports();
      }
    }, 60 * 1000); // Every minute
    
    console.log('Daily management system initialized with multiple check intervals');
    
    return () => {
      clearTimeout(initTimeout);
      clearInterval(hourlyInterval);
      clearInterval(frequentInterval);
      clearInterval(twoAmCheck);
      console.log('Daily management system cleanup complete');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats - using 2am cutoff for business day
  const stats = useMemo((): POSStats => {
    const now = new Date();
    
    // Adjust for 2am cutoff - if it's before 2am, consider it part of previous business day
    const businessDate = new Date(now);
    if (now.getHours() < 2) {
      businessDate.setDate(businessDate.getDate() - 1);
    }
    
    const year = businessDate.getFullYear();
    const month = String(businessDate.getMonth() + 1).padStart(2, '0');
    const day = String(businessDate.getDate()).padStart(2, '0');
    const todayBusinessDate = `${year}-${month}-${day}`;

    const todaysOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      
      // Apply same 2am cutoff logic to order dates
      let orderBusinessDate = new Date(orderDate);
      if (orderDate.getHours() < 2) {
        orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
      }
      
      const orderYear = orderBusinessDate.getFullYear();
      const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
      const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
      const orderBusinessDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
      return orderBusinessDateStr === todayBusinessDate;
    });

    const totalSales = todaysOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = todaysOrders.length > 0 
      ? totalSales / todaysOrders.length 
      : 0;

    return {
      totalSales,
      ordersToday: todaysOrders.length,
      averageOrderValue,
    };
  }, [orders]);

  return {
    // State
    products,
    orders,
    cart,
    settings,
    isLoading,
    searchQuery,
    selectedCategory,
    filteredProducts,
    availableCategories,
    cartTotals,
    stats,

    // Actions
    setSearchQuery,
    setSelectedCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    checkout,
    updateSettings,
    calculateTotalsWithFee,
    generateNightlyReport,
    generateAggregatedReport,
    addCategory,
    removeCategory,
    getCategoryMetadata,
    isTicketCategory,
    exportSettings,
    importSettings,
    saveNightlyReportAndReset,
    autoCleanOldReports,
    
    // Get saved nightly reports
    getSavedNightlyReports: useCallback(async (): Promise<string[]> => {
      try {
        const savedReportsKey = 'saved_nightly_reports';
        const savedReports = await AsyncStorage.getItem(savedReportsKey);
        return savedReports ? JSON.parse(savedReports) : [];
      } catch (error) {
        console.error('Error getting saved nightly reports:', error);
        return [];
      }
    }, []),
    
    // Get specific saved nightly report
    getSavedNightlyReport: useCallback(async (date: string): Promise<NightlyReport | null> => {
      try {
        const reportKey = `nightly_report_${date}`;
        const reportData = await AsyncStorage.getItem(reportKey);
        return reportData ? JSON.parse(reportData) : null;
      } catch (error) {
        console.error('Error getting saved nightly report:', error);
        return null;
      }
    }, []),
    
    // Get auto-clean log
    getAutoCleanLog: useCallback(async () => {
      try {
        const cleanLog = await AsyncStorage.getItem('last_auto_clean_log');
        return cleanLog ? JSON.parse(cleanLog) : null;
      } catch (error) {
        console.error('Error getting auto-clean log:', error);
        return null;
      }
    }, []),
    

    
    // Clear nightly report data (admin only)
    clearNightlyReport: useCallback(async (date?: Date): Promise<boolean> => {
      try {
        const reportDate = date || new Date();
        
        // Use the same 2am cutoff logic for consistency
        let businessDate = new Date(reportDate);
        if (!date && reportDate.getHours() < 2) {
          businessDate.setDate(businessDate.getDate() - 1);
        }
        
        const year = businessDate.getFullYear();
        const month = String(businessDate.getMonth() + 1).padStart(2, '0');
        const day = String(businessDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        console.log(`Clearing nightly report data for business date ${dateStr}...`);
        
        // Filter out orders from the specified business date using same 2am cutoff logic
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          
          // Apply same 2am cutoff logic to order dates
          let orderBusinessDate = new Date(orderDate);
          if (orderDate.getHours() < 2) {
            orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
          }
          
          const orderYear = orderBusinessDate.getFullYear();
          const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
          const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
          const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
          return orderDateStr !== dateStr;
        });
        
        // Save filtered orders
        await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(filteredOrders));
        setOrders(filteredOrders);
        
        console.log(`Cleared ${orders.length - filteredOrders.length} orders from ${dateStr}`);
        return true;
      } catch (error) {
        console.error('Error clearing nightly report:', error);
        return false;
      }
    }, [orders]),
  };
});