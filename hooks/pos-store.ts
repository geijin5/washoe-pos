import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { Product, CartItem, Order, Category, POSStats, POSSettings, NightlyReport, SettingsExport } from '@/types/pos';
import { defaultProducts } from '@/mocks/default-products';
import { syncService, SyncData } from '@/services/sync-service';

const PRODUCTS_KEY = 'theatre_products';
const ORDERS_KEY = 'theatre_orders';
const SETTINGS_KEY = 'theatre_settings';

const DEFAULT_CATEGORIES: Category[] = ['tickets', 'concessions', 'merchandise', 'beverages'];

const DEFAULT_SETTINGS: POSSettings = {
  creditCardFeePercent: 5.0, // 5.0% default credit card fee
  categories: DEFAULT_CATEGORIES,
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

  // Calculate totals with credit card fee
  const calculateTotalsWithFee = useCallback((paymentMethod: 'cash' | 'card') => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const creditCardFee = paymentMethod === 'card' ? subtotal * (settings.creditCardFeePercent / 100) : 0;
    const total = subtotal + creditCardFee;
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

    // Debug logging for all sales to track department assignment
    console.log('=== ORDER PROCESSED ===');
    console.log(`Order ID: ${newOrder.id}`);
    console.log(`User: ${userName} (${userRole})`);
    console.log(`Department: ${department}`);
    console.log(`Is After Closing: ${isAfterClosing}`);
    console.log(`Payment Method: ${paymentMethod}`);
    console.log(`Total: ${totals.total.toFixed(2)}`);
    console.log(`Items: ${cart.map(item => `${item.product.name} (${item.product.category}) x${item.quantity}`).join(', ')}`);
    console.log('==========================');
    
    // Additional logging for candy counter sales
    if (department === 'candy-counter') {
      console.log('*** CANDY COUNTER SALE CONFIRMED ***');
      console.log(`This order should appear in candy counter reports`);
    }

    const updatedOrders = [newOrder, ...orders];
    saveOrders(updatedOrders);
    clearCart();
    return newOrder;
  }, [cart, calculateTotalsWithFee, orders, saveOrders, clearCart]);

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

  // Category management
  const addCategory = useCallback(async (category: Category) => {
    try {
      const currentCategories = settings.categories || DEFAULT_CATEGORIES;
      if (!currentCategories.includes(category)) {
        const updatedCategories = [...currentCategories, category];
        console.log(`Adding category: ${category}. Updated categories:`, updatedCategories);
        await updateSettings({ categories: updatedCategories });
        console.log(`Category ${category} added successfully. Available categories updated.`);
      } else {
        console.log(`Category ${category} already exists in:`, currentCategories);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }, [settings.categories, updateSettings]);

  const removeCategory = useCallback(async (category: Category) => {
    try {
      const currentCategories = settings.categories || DEFAULT_CATEGORIES;
      if (currentCategories.includes(category) && currentCategories.length > 1) {
        const updatedCategories = currentCategories.filter(c => c !== category);
        console.log(`Removing category: ${category}. Updated categories:`, updatedCategories);
        await updateSettings({ categories: updatedCategories });
        
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
  }, [settings.categories, updateSettings, products, saveProducts]);

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

  // Helper function to validate real users (not test/demo/default accounts)
  const isValidRealUser = useCallback((userName: string): boolean => {
    if (!userName || typeof userName !== 'string') {
      console.log(`User validation: "${userName}" -> INVALID (empty or not string)`);
      return false;
    }
    
    const name = userName.toLowerCase().trim();
    
    // Filter out common test/demo/default account patterns but be more lenient
    const invalidPatterns = [
      'test user',
      'demo user',
      'default user',
      'guest user',
      'sample user',
      'example user',
      'temp user',
      'temporary user',
      'system user',
      'pos user',
      'staff member',
      'test account',
      'demo account'
    ];
    
    // Check if name exactly matches invalid patterns (more specific matching)
    const hasInvalidPattern = invalidPatterns.some(pattern => name === pattern || name.includes(pattern));
    
    // Check if name is too generic (single character, numbers only, etc.)
    const isGeneric = name.length < 1 || /^\d+$/.test(name);
    
    // Allow real names including admin, manager, cashier roles - be more permissive
    const isRealName = name.length >= 1 && !hasInvalidPattern && !isGeneric;
    
    console.log(`User validation: "${userName}" -> ${isRealName ? 'VALID' : 'INVALID'} (hasInvalidPattern: ${hasInvalidPattern}, isGeneric: ${isGeneric})`);
    
    return isRealName;
  }, []);



  // Generate nightly report - Enhanced to capture ALL accounts with sales
  const generateNightlyReport = useCallback((date?: Date): NightlyReport => {
    const reportDate = date || new Date();
    const dateStr = reportDate.toISOString().split('T')[0];
    
    console.log(`=== GENERATING LOCAL NIGHTLY REPORT ===`);
    console.log(`Date: ${dateStr}`);
    console.log('Ensuring ALL local accounts with sales are included...');
    
    // Filter orders for the specific date
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      return orderDate.toISOString().split('T')[0] === dateStr;
    });
    
    console.log(`Found ${dayOrders.length} orders for ${dateStr}`);

    // Calculate totals with proper precision
    const totalSales = Math.round(dayOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const cashSales = Math.round(dayOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const cardSales = Math.round(dayOrders.filter(o => o.paymentMethod === 'card').reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const creditCardFees = Math.round(dayOrders.reduce((sum, order) => sum + (order.creditCardFee || 0), 0) * 100) / 100;

    // Department breakdown - Enhanced to properly separate mixed orders (tickets + concessions)
    const boxOfficeOrders = dayOrders.filter(o => o.department === 'box-office');
    const candyCounterOrders = dayOrders.filter(o => o.department === 'candy-counter' && !o.isAfterClosing);
    const afterClosingOrders = dayOrders.filter(o => o.department === 'candy-counter' && o.isAfterClosing);
    
    console.log(`=== CANDY COUNTER DEBUG FOR REPORT ${dateStr} ===`);
    console.log(`Total orders for date: ${dayOrders.length}`);
    console.log(`Candy counter orders (non-after-closing): ${candyCounterOrders.length}`);
    candyCounterOrders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.total.toFixed(2)} by ${order.userName} (${order.userRole || 'unknown'})`);
    });
    console.log(`After closing orders: ${afterClosingOrders.length}`);
    afterClosingOrders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.total.toFixed(2)} by ${order.userName} (${order.userRole || 'unknown'})`);
    });
    console.log('===============================================');
    
    console.log(`=== DEPARTMENT BREAKDOWN DEBUG FOR ${dateStr} ===`);
    console.log(`Total orders found: ${dayOrders.length}`);
    console.log(`Orders by department:`);
    dayOrders.forEach(order => {
      console.log(`  Order ${order.id}: dept=${order.department}, afterClosing=${order.isAfterClosing}, total=${order.total.toFixed(2)}, user=${order.userName}`);
    });
    console.log(`Filtered results:`);
    console.log(`  - Box Office orders: ${boxOfficeOrders.length}`);
    console.log(`  - Candy Counter orders (concessions): ${candyCounterOrders.length}`);
    console.log(`  - After Closing orders (tickets): ${afterClosingOrders.length}`);
    console.log('===============================================');
    
    // Enhanced calculation to properly separate tickets and concessions in mixed orders
    let afterClosingTicketSales = 0;
    let candyCounterConcessionSales = 0;
    
    // Process regular candy counter orders (pure concessions)
    candyCounterOrders.forEach(order => {
      const orderTotal = order.total;
      candyCounterConcessionSales += orderTotal;
      console.log(`Pure candy counter order ${order.id}: ${orderTotal.toFixed(2)} (user: ${order.userName})`);
    });
    
    // Process after-closing orders (mixed tickets + concessions sold through candy counter)
    afterClosingOrders.forEach(order => {
      console.log(`Processing mixed after-closing order ${order.id} by ${order.userName}:`);
      
      let ticketSalesInOrder = 0;
      let concessionSalesInOrder = 0;
      
      // Separate tickets from concessions within the same order
      order.items.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        if (item.product.category === 'tickets') {
          ticketSalesInOrder += itemTotal;
          console.log(`  - Ticket: ${item.product.name} x${item.quantity} = ${itemTotal.toFixed(2)}`);
        } else {
          concessionSalesInOrder += itemTotal;
          console.log(`  - Concession: ${item.product.name} x${item.quantity} = ${itemTotal.toFixed(2)}`);
        }
      });
      
      // Distribute card fees proportionally
      const orderSubtotal = order.subtotal || (ticketSalesInOrder + concessionSalesInOrder);
      const cardFee = order.creditCardFee || 0;
      
      if (orderSubtotal > 0) {
        const ticketFeeShare = cardFee * (ticketSalesInOrder / orderSubtotal);
        const concessionFeeShare = cardFee * (concessionSalesInOrder / orderSubtotal);
        
        // Add to respective totals (including proportional card fees)
        afterClosingTicketSales += ticketSalesInOrder + ticketFeeShare;
        candyCounterConcessionSales += concessionSalesInOrder + concessionFeeShare;
        
        console.log(`  - Ticket portion (with fees): ${(ticketSalesInOrder + ticketFeeShare).toFixed(2)}`);
        console.log(`  - Concession portion (with fees): ${(concessionSalesInOrder + concessionFeeShare).toFixed(2)}`);
      }
    });
    
    console.log(`=== ENHANCED SALES CALCULATION ===`);
    console.log(`Pure candy counter orders: ${candyCounterOrders.length}`);
    console.log(`Mixed after-closing orders: ${afterClosingOrders.length}`);
    console.log(`Total candy counter sales (all concessions): ${candyCounterConcessionSales.toFixed(2)}`);
    console.log(`Total after-closing sales (all tickets): ${afterClosingTicketSales.toFixed(2)}`);
    console.log('=======================================');
    
    const departmentBreakdown = {
      'box-office': {
        sales: boxOfficeOrders.reduce((sum, order) => sum + order.total, 0),
        orders: boxOfficeOrders.length,
      },
      'candy-counter': {
        // Candy counter shows ALL concession sales (pure concessions + concessions from mixed orders)
        sales: candyCounterConcessionSales,
        orders: candyCounterOrders.length + (afterClosingOrders.filter(order => 
          order.items.some(item => item.product.category !== 'tickets')
        ).length), // Count mixed orders that have concessions
      },
      'after-closing': {
        // After-closing shows ALL ticket sales (from mixed orders sold through candy counter)
        sales: afterClosingTicketSales,
        orders: afterClosingOrders.filter(order => 
          order.items.some(item => item.product.category === 'tickets')
        ).length, // Count mixed orders that have tickets
      },
    };
    
    console.log(`=== FINAL DEPARTMENT BREAKDOWN FOR ${dateStr} ===`);
    console.log(`Box Office: ${departmentBreakdown['box-office'].sales.toFixed(2)} (${departmentBreakdown['box-office'].orders} orders)`);
    console.log(`Candy Counter (All Concessions): ${departmentBreakdown['candy-counter'].sales.toFixed(2)} (${departmentBreakdown['candy-counter'].orders} orders)`);
    console.log(`After Closing (All Tickets): ${departmentBreakdown['after-closing'].sales.toFixed(2)} (${departmentBreakdown['after-closing'].orders} orders)`);
    console.log('===============================================');

    console.log(`Department breakdown:`);
    console.log(`  - Box Office: ${departmentBreakdown['box-office'].sales.toFixed(2)} (${departmentBreakdown['box-office'].orders} orders)`);
    console.log(`  - Candy Counter (Concession Sales): ${departmentBreakdown['candy-counter'].sales.toFixed(2)} (${departmentBreakdown['candy-counter'].orders} orders)`);
    console.log(`  - After Closing (Tickets Sold): ${departmentBreakdown['after-closing'].sales.toFixed(2)} (${departmentBreakdown['after-closing'].orders} orders)`);
    console.log(`Total department sales: ${(departmentBreakdown['box-office'].sales + departmentBreakdown['candy-counter'].sales + departmentBreakdown['after-closing'].sales).toFixed(2)}`);
    console.log(`Total sales from orders: ${totalSales.toFixed(2)}`);

    // Calculate actual payment breakdown by department from orders with proper precision
    let boxOfficeCashSales = 0;
    let boxOfficeCardSales = 0;
    let candyCounterCashSales = 0;
    let candyCounterCardSales = 0;
    
    console.log(`=== CALCULATING ACTUAL PAYMENT BREAKDOWN BY DEPARTMENT ===`);
    
    // Box Office orders - direct calculation
    boxOfficeOrders.forEach(order => {
      if (order.paymentMethod === 'cash') {
        boxOfficeCashSales += order.total;
        console.log(`Box Office Cash: ${order.total.toFixed(2)} from order ${order.id}`);
      } else if (order.paymentMethod === 'card') {
        boxOfficeCardSales += order.total;
        console.log(`Box Office Card: ${order.total.toFixed(2)} from order ${order.id}`);
      }
    });
    
    // Candy Counter orders (non-after-closing) - direct calculation
    candyCounterOrders.forEach(order => {
      if (order.paymentMethod === 'cash') {
        candyCounterCashSales += order.total;
        console.log(`Candy Counter Cash: ${order.total.toFixed(2)} from order ${order.id}`);
      } else if (order.paymentMethod === 'card') {
        candyCounterCardSales += order.total;
        console.log(`Candy Counter Card: ${order.total.toFixed(2)} from order ${order.id}`);
      }
    });
    
    // After-closing orders - split by item category and payment method
    afterClosingOrders.forEach(order => {
      console.log(`Processing after-closing order ${order.id} (${order.paymentMethod}):`);
      
      let ticketSalesInOrder = 0;
      let concessionSalesInOrder = 0;
      
      // Calculate subtotals by category
      order.items.forEach(item => {
        const itemSubtotal = item.product.price * item.quantity;
        if (item.product.category === 'tickets') {
          ticketSalesInOrder += itemSubtotal;
        } else {
          concessionSalesInOrder += itemSubtotal;
        }
      });
      
      // Distribute total (including fees) proportionally
      const orderSubtotal = ticketSalesInOrder + concessionSalesInOrder;
      if (orderSubtotal > 0) {
        const ticketPortion = (ticketSalesInOrder / orderSubtotal) * order.total;
        const concessionPortion = (concessionSalesInOrder / orderSubtotal) * order.total;
        
        // Add to appropriate payment method totals
        if (order.paymentMethod === 'cash') {
          // Tickets go to after-closing, concessions go to candy counter
          candyCounterCashSales += concessionPortion;
          console.log(`  - Concession cash portion: ${concessionPortion.toFixed(2)} added to candy counter`);
        } else if (order.paymentMethod === 'card') {
          // Tickets go to after-closing, concessions go to candy counter
          candyCounterCardSales += concessionPortion;
          console.log(`  - Concession card portion: ${concessionPortion.toFixed(2)} added to candy counter`);
        }
      }
    });
    
    console.log(`=== FINAL PAYMENT BREAKDOWN BY DEPARTMENT ===`);
    console.log(`Box Office Cash: ${boxOfficeCashSales.toFixed(2)}`);
    console.log(`Box Office Card: ${boxOfficeCardSales.toFixed(2)}`);
    console.log(`Candy Counter Cash: ${candyCounterCashSales.toFixed(2)}`);
    console.log(`Candy Counter Card: ${candyCounterCardSales.toFixed(2)}`);
    console.log(`Total Cash: ${(boxOfficeCashSales + candyCounterCashSales).toFixed(2)} (should match ${cashSales.toFixed(2)})`);
    console.log(`Total Card: ${(boxOfficeCardSales + candyCounterCardSales).toFixed(2)} (should match ${cardSales.toFixed(2)})`);
    console.log('===============================================');
    
    const paymentBreakdown = {
      boxOfficeCash: Math.round(boxOfficeCashSales * 100) / 100,
      boxOfficeCard: Math.round(boxOfficeCardSales * 100) / 100,
      candyCounterCash: Math.round(candyCounterCashSales * 100) / 100,
      candyCounterCard: Math.round(candyCounterCardSales * 100) / 100,
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
        // Update role if not set or if current order has role info
        if (order.userRole && (!existing.userRole || existing.userRole === 'usher')) {
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
        console.log(`✓ Valid user: ${user.userName} (${user.userRole || 'unknown'}) - ${user.sales.toFixed(2)} (${user.orders} orders)`);
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

    // Show breakdown - separate each show's sales and orders
    const showBreakdown = {
      '1st-show': {
        sales: 0,
        orders: 0,
      },
      '2nd-show': {
        sales: 0,
        orders: 0,
      },
      'nightly-show': {
        sales: 0,
        orders: 0,
      },
      'matinee': {
        sales: 0,
        orders: 0,
      },
    };
    
    console.log(`=== CALCULATING SHOW BREAKDOWN ===`);
    console.log(`Processing ${boxOfficeOrders.length} box office orders for show breakdown`);
    
    // Process box office orders by show type with enhanced precision
    boxOfficeOrders.forEach(order => {
      if (order.showType && showBreakdown[order.showType]) {
        // Round to avoid floating point precision issues
        const orderTotal = Math.round(order.total * 100) / 100;
        showBreakdown[order.showType].sales = Math.round((showBreakdown[order.showType].sales + orderTotal) * 100) / 100;
        showBreakdown[order.showType].orders += 1;
        console.log(`${order.showType}: +${orderTotal.toFixed(2)} (Order ${order.id}) - Running total: ${showBreakdown[order.showType].sales.toFixed(2)}`);
      } else {
        console.log(`Order ${order.id} missing showType or invalid showType: ${order.showType}`);
      }
    });
    
    // Verify show breakdown totals match box office totals
    const showBreakdownTotal = Object.values(showBreakdown).reduce((sum, show) => sum + show.sales, 0);
    const boxOfficeTotal = boxOfficeOrders.reduce((sum, order) => sum + order.total, 0);
    
    console.log(`=== SHOW BREAKDOWN VERIFICATION ===`);
    console.log(`Show breakdown total: ${showBreakdownTotal.toFixed(2)}`);
    console.log(`Box office orders total: ${boxOfficeTotal.toFixed(2)}`);
    console.log(`Difference: ${Math.abs(showBreakdownTotal - boxOfficeTotal).toFixed(2)}`);
    
    console.log(`=== FINAL SHOW BREAKDOWN ===`);
    console.log(`1st Show: ${showBreakdown['1st-show'].sales.toFixed(2)} (${showBreakdown['1st-show'].orders} orders)`);
    console.log(`2nd Show: ${showBreakdown['2nd-show'].sales.toFixed(2)} (${showBreakdown['2nd-show'].orders} orders)`);
    console.log(`Nightly Show: ${showBreakdown['nightly-show'].sales.toFixed(2)} (${showBreakdown['nightly-show'].orders} orders)`);
    console.log(`Matinee: ${showBreakdown['matinee'].sales.toFixed(2)} (${showBreakdown['matinee'].orders} orders)`);
    console.log('=======================================');

    console.log(`=== LOCAL REPORT SUMMARY ===`);
    console.log(`Total Sales: ${totalSales.toFixed(2)}`);
    console.log(`Total Orders: ${dayOrders.length}`);
    console.log(`User Accounts: ${userBreakdown.length}`);
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
  }, [orders, isValidRealUser]);

  // Save nightly report and prepare for new day
  const saveNightlyReportAndReset = useCallback(async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if we need to process new day (save previous day's report and reset)
      const lastProcessDate = await AsyncStorage.getItem('last_nightly_process_date');
      
      if (lastProcessDate !== today) {
        console.log('=== NIGHTLY REPORT SAVE & RESET ===');
        console.log(`Current date: ${today}`);
        console.log(`Last process date: ${lastProcessDate || 'never'}`);
        
        // Always save the previous day's report if we have orders from that day
        if (lastProcessDate) {
          const previousDate = new Date(lastProcessDate);
          console.log(`Saving nightly report for ${lastProcessDate}...`);
          
          // Generate and save the previous day's report
          const previousDayReport = generateNightlyReport(previousDate);
          
          // Only save if there were actual sales/orders
          if (previousDayReport.totalOrders > 0 || previousDayReport.totalSales > 0) {
            const reportKey = `nightly_report_${lastProcessDate}`;
            const reportData = {
              ...previousDayReport,
              savedAt: new Date().toISOString(),
              deviceInfo: 'Local Device'
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
        
        // Update last process date to today
        await AsyncStorage.setItem('last_nightly_process_date', today);
        
        console.log('✓ Nightly report processing complete for new day');
        console.log('=== NIGHTLY PROCESS COMPLETE ===');
      }
    } catch (error) {
      console.error('Error in nightly report save & reset:', error);
    }
  }, [generateNightlyReport]);

  // Auto-clear nightly reports after 14 days and save daily reports
  const autoCleanOldReports = useCallback(async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if we need to clear old data (run once per day)
      const lastCleanDate = await AsyncStorage.getItem('last_auto_clean_date');
      
      if (lastCleanDate !== today) {
        console.log('=== DAILY REPORT MANAGEMENT & AUTO-CLEAN ===');
        console.log(`Current date: ${today}`);
        console.log(`Last clean date: ${lastCleanDate || 'never'}`);
        
        // Calculate cutoff date (14 days ago from today)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 14);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        
        console.log(`Auto-clearing reports older than ${cutoffDateStr} (keeping current + 14 days)`);
        
        // Keep only orders from the last 14 days + today (15 days total)
        const recentOrders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          const orderDateStr = orderDate.toISOString().split('T')[0];
          const isRecent = orderDateStr >= cutoffDateStr;
          if (!isRecent) {
            console.log(`Clearing old order from ${orderDateStr}: ${order.total.toFixed(2)}`);
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
          timestamp: new Date().toISOString()
        };
        await AsyncStorage.setItem('last_auto_clean_log', JSON.stringify(cleanLog));
        
        // Update last clean date
        await AsyncStorage.setItem('last_auto_clean_date', today);
        console.log('=== DAILY MANAGEMENT COMPLETE ===');
      }
    } catch (error) {
      console.error('Error in daily report management:', error);
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
    // Run immediately on app start
    saveNightlyReportAndReset();
    autoCleanOldReports();
    
    // Check every hour for new day and auto-clean
    const interval = setInterval(() => {
      saveNightlyReportAndReset();
      autoCleanOldReports();
    }, 60 * 60 * 1000); // Every hour
    
    // Also check every 15 minutes for more responsive new day detection
    const frequentInterval = setInterval(() => {
      saveNightlyReportAndReset();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    return () => {
      clearInterval(interval);
      clearInterval(frequentInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats
  const stats = useMemo((): POSStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
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
        const dateStr = reportDate.toISOString().split('T')[0];
        
        console.log(`Clearing nightly report data for ${dateStr}...`);
        
        // Filter out orders from the specified date
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate.toISOString().split('T')[0] !== dateStr;
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