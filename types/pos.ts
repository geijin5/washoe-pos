export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  image?: string;
  customImage?: string;
  description?: string;
  isPopular?: boolean;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  creditCardFee?: number;
  timestamp: Date;
  paymentMethod?: 'cash' | 'card';
  userId?: string;
  userName?: string;
  department?: 'box-office' | 'candy-counter';
  isAfterClosing?: boolean;
  userRole?: string;
  showType?: '1st-show' | '2nd-show' | 'nightly-show' | 'matinee';
}

export type Category = 'tickets' | 'concessions' | 'merchandise' | 'beverages';

export interface POSStats {
  totalSales: number;
  ordersToday: number;
  averageOrderValue: number;
}

export interface POSSettings {
  creditCardFeePercent: number;
  categories: Category[];
  businessId?: string;
  version?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  displayName: string;
}

export interface SettingsExport {
  type?: string;
  version?: string;
  settings: POSSettings;
  products: Product[];
  categories: Category[];
  timestamp: string;
  deviceId: string;
  productCount?: number;
  categoryCount?: number;
}



export interface NightlyReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  creditCardFees: number;
  departmentBreakdown: {
    'box-office': {
      sales: number;
      orders: number;
    };
    'candy-counter': {
      sales: number;
      orders: number;
    };
    'after-closing': {
      sales: number;
      orders: number;
    };
  };
  showBreakdown?: {
    '1st-show': {
      sales: number;
      orders: number;
    };
    '2nd-show': {
      sales: number;
      orders: number;
    };
    'nightly-show': {
      sales: number;
      orders: number;
    };
    'matinee': {
      sales: number;
      orders: number;
    };
  };
  paymentBreakdown?: {
    boxOfficeCash: number;
    boxOfficeCard: number;
    candyCounterCash: number;
    candyCounterCard: number;
  };
  userBreakdown: {
    userId: string;
    userName: string;
    sales: number;
    orders: number;
    userRole?: string;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }[];
}