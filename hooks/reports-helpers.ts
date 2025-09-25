import { NightlyReport, Order } from '@/types/pos';

// Helper function to filter orders by date
export const filterOrdersByDate = (orders: Order[], targetDate: string): Order[] => {
  return orders.filter((order: any) => {
    const orderDate = new Date(order.timestamp);
    let orderBusinessDate = new Date(orderDate);
    if (orderDate.getHours() < 2) {
      orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
    }
    const orderYear = orderBusinessDate.getFullYear();
    const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
    const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
    const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
    return orderDateStr === targetDate;
  });
};

// Helper function to calculate user sales by department
export const calculateUserSalesByDepartment = (
  orders: Order[], 
  department: string, 
  isAfterClosing?: boolean
): Map<string, { name: string; role: string; sales: number; orders: number }> => {
  const userMap = new Map<string, { name: string; role: string; sales: number; orders: number }>();
  
  orders
    .filter((order: any) => {
      if (isAfterClosing !== undefined) {
        return order.department === department && order.isAfterClosing === isAfterClosing;
      }
      return order.department === department;
    })
    .forEach((order: any) => {
      const key = order.userName;
      const existing = userMap.get(key) || { 
        name: order.userName, 
        role: order.userRole || 'staff', 
        sales: 0, 
        orders: 0 
      };
      existing.sales += order.total;
      existing.orders += 1;
      userMap.set(key, existing);
    });
  
  return userMap;
};

// Helper function to calculate payment breakdown from report
export const calculatePaymentBreakdown = (report: NightlyReport) => {
  const boxOfficeTotal = report.departmentBreakdown['box-office']?.sales || 0;
  const candyCounterTotal = report.departmentBreakdown['candy-counter']?.sales || 0;
  const afterClosingTotal = report.departmentBreakdown['after-closing']?.sales || 0;
  
  let boxOfficeCashSales = 0;
  let boxOfficeCardSales = 0;
  let candyCounterCashSales = 0;
  let candyCounterCardSales = 0;
  let afterClosingCashSales = 0;
  let afterClosingCardSales = 0;
  
  // Get actual payment breakdown from the report's payment calculations
  if (report.paymentBreakdown) {
    boxOfficeCashSales = report.paymentBreakdown.boxOfficeCash || 0;
    boxOfficeCardSales = report.paymentBreakdown.boxOfficeCard || 0;
    candyCounterCashSales = report.paymentBreakdown.candyCounterCash || 0;
    candyCounterCardSales = report.paymentBreakdown.candyCounterCard || 0;
    afterClosingCashSales = report.paymentBreakdown.afterClosingCash || 0;
    afterClosingCardSales = report.paymentBreakdown.afterClosingCard || 0;
  } else {
    // Fallback to proportional calculation if detailed breakdown not available
    if (report.totalSales > 0) {
      const overallCashRatio = report.cashSales / report.totalSales;
      const overallCardRatio = report.cardSales / report.totalSales;
      
      boxOfficeCashSales = boxOfficeTotal * overallCashRatio;
      boxOfficeCardSales = boxOfficeTotal * overallCardRatio;
      candyCounterCashSales = candyCounterTotal * overallCashRatio;
      candyCounterCardSales = candyCounterTotal * overallCardRatio;
      afterClosingCashSales = afterClosingTotal * overallCashRatio;
      afterClosingCardSales = afterClosingTotal * overallCardRatio;
    }
  }
  
  return {
    boxOfficeCashSales,
    boxOfficeCardSales,
    candyCounterCashSales,
    candyCounterCardSales,
    afterClosingCashSales,
    afterClosingCardSales
  };
};

// Helper function to calculate card fees by department
export const calculateCardFeesByDepartment = (
  report: NightlyReport,
  paymentBreakdown: ReturnType<typeof calculatePaymentBreakdown>,
  creditCardFeePercent: number
) => {
  const totalFees = report.creditCardFees;
  let boxOfficeCardFees = 0;
  let candyCounterCardFees = 0;
  let afterClosingCardFees = 0;
  
  if (report.cardSales > 0 && totalFees > 0) {
    const feeRate = totalFees / report.cardSales;
    boxOfficeCardFees = paymentBreakdown.boxOfficeCardSales * feeRate;
    candyCounterCardFees = paymentBreakdown.candyCounterCardSales * feeRate;
    afterClosingCardFees = paymentBreakdown.afterClosingCardSales * feeRate;
  }
  
  return {
    boxOfficeCardFees,
    candyCounterCardFees,
    afterClosingCardFees,
    totalFees
  };
};

// Helper function to generate report header
export const generateReportHeader = (
  report: NightlyReport,
  user: any,
  isTrainingReport: boolean,
  formatDate: (date: Date) => string
): string => {
  const reportDate = new Date(report.date);
  const reportTypeHeader = isTrainingReport 
    ? `🎓 TRAINING MODE NIGHTLY SALES REPORT (LOCAL DEVICE ONLY)
⚠️  THIS IS A TRAINING REPORT - DATA IS FOR PRACTICE ONLY
⚠️  TRAINING SALES ARE NOT SAVED TO PERMANENT RECORDS`
    : `NIGHTLY SALES REPORT (LOCAL DEVICE ONLY)`;

  return `${reportTypeHeader}
${formatDate(reportDate)}
Generated by: ${user?.name} (${user?.role})

${isTrainingReport ? '🎓 TRAINING MODE ACTIVE - This report shows practice data only\n\n' : ''}IMPORTANT: Reports older than 14 days are automatically cleared to maintain system performance.`;
};

// Helper function to generate summary section
export const generateSummarySection = (
  report: NightlyReport,
  isTrainingReport: boolean,
  formatCurrency: (amount: number) => string
): string => {
  const netSales = report.totalSales - report.creditCardFees;
  return `SUMMARY
Total Sales: ${formatCurrency(report.totalSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Net Sales (Minus Card Fees): ${formatCurrency(netSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Total Orders: ${report.totalOrders}${isTrainingReport ? ' (TRAINING)' : ''}
Average Order: ${formatCurrency(report.totalOrders > 0 ? report.totalSales / report.totalOrders : 0)}${isTrainingReport ? ' (TRAINING)' : ''}

PAYMENT BREAKDOWN
Cash Sales: ${formatCurrency(report.cashSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Card Sales: ${formatCurrency(report.cardSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Credit Card Fees: ${formatCurrency(report.creditCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}`;
};

// Helper function to generate department breakdown section
export const generateDepartmentBreakdownSection = (
  report: NightlyReport,
  paymentBreakdown: ReturnType<typeof calculatePaymentBreakdown>,
  cardFees: ReturnType<typeof calculateCardFeesByDepartment>,
  isTrainingReport: boolean,
  formatCurrency: (amount: number) => string
): string => {
  const totalCandyCounterFees = cardFees.candyCounterCardFees + cardFees.afterClosingCardFees;
  
  // Calculate net sales by department
  const boxOfficeNetSales = (report.departmentBreakdown['box-office']?.sales || 0) - cardFees.boxOfficeCardFees;
  const candyCounterNetSales = report.departmentBreakdown['candy-counter'].sales - cardFees.candyCounterCardFees;
  const afterClosingNetSales = (report.departmentBreakdown['after-closing']?.sales || 0) - cardFees.afterClosingCardFees;
  
  let section = `BOX OFFICE CASH SECTION
Box Office Cash: ${formatCurrency(paymentBreakdown.boxOfficeCashSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Box Office Card: ${formatCurrency(paymentBreakdown.boxOfficeCardSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Box Office Card Fees: ${formatCurrency(cardFees.boxOfficeCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Box Office Net Sales: ${formatCurrency(boxOfficeNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}

CANDY COUNTER CASH SECTION
Candy Counter Cash: ${formatCurrency(paymentBreakdown.candyCounterCashSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Candy Counter Card: ${formatCurrency(paymentBreakdown.candyCounterCardSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Candy Counter Card Fees: ${formatCurrency(cardFees.candyCounterCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Candy Counter Net Sales: ${formatCurrency(candyCounterNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}

AFTER CLOSING CASH SECTION
After Closing Cash: ${formatCurrency(paymentBreakdown.afterClosingCashSales)}${isTrainingReport ? ' (TRAINING)' : ''}
After Closing Card: ${formatCurrency(paymentBreakdown.afterClosingCardSales)}${isTrainingReport ? ' (TRAINING)' : ''}
After Closing Card Fees: ${formatCurrency(cardFees.afterClosingCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
After Closing Net Sales: ${formatCurrency(afterClosingNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}

FEES SECTION
Box Office Fees: ${formatCurrency(cardFees.boxOfficeCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Candy Counter Fees: ${formatCurrency(totalCandyCounterFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Total Fees: ${formatCurrency(cardFees.totalFees)}${isTrainingReport ? ' (TRAINING)' : ''}

DEPARTMENT BREAKDOWN
Candy Counter (All Concession Sales): ${formatCurrency(report.departmentBreakdown['candy-counter'].sales)} (${report.departmentBreakdown['candy-counter'].orders} orders) - Net: ${formatCurrency(candyCounterNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}`;

  if (report.departmentBreakdown['box-office'] && report.departmentBreakdown['box-office'].sales > 0) {
    section += `\nBox Office: ${formatCurrency(report.departmentBreakdown['box-office'].sales)} (${report.departmentBreakdown['box-office'].orders} orders) - Net: ${formatCurrency(boxOfficeNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}`;
  }
  
  if (report.departmentBreakdown['after-closing'] && report.departmentBreakdown['after-closing'].sales > 0) {
    section += `\nAfter Closing (Ticket Sales Only): ${formatCurrency(report.departmentBreakdown['after-closing'].sales)} (${report.departmentBreakdown['after-closing'].orders} orders) - Net: ${formatCurrency(afterClosingNetSales)}${isTrainingReport ? ' (TRAINING)' : ''}`;
  }

  return section;
};

// Helper function to generate card fee calculation section
export const generateCardFeeCalculationSection = (
  report: NightlyReport,
  isTrainingReport: boolean,
  formatCurrency: (amount: number) => string
): string => {
  const cardTotal = report.cardSales;
  const salesMinusFees = cardTotal / 1.05; // S = CT / 1.05
  const cardFees = cardTotal - salesMinusFees; // CF = CT - S
  
  return `CARD FEE CALCULATION
Card Total (CT): ${formatCurrency(cardTotal)}${isTrainingReport ? ' (TRAINING)' : ''}
Sales Minus Fees (S = CT ÷ 1.05): ${formatCurrency(salesMinusFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Card Fees (CF = CT - S): ${formatCurrency(cardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Actual Card Fees: ${formatCurrency(report.creditCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}
Difference: ${formatCurrency(report.creditCardFees - cardFees)}${isTrainingReport ? ' (TRAINING)' : ''}`;
};

// Helper function to calculate manager sales by department
export const calculateManagerSalesByDepartment = (
  orders: Order[],
  department: string,
  isAfterClosing?: boolean
): { managerCash: number; managerCard: number } => {
  const managerOrders = orders.filter((order: any) => {
    const userRole = order.userRole?.toLowerCase();
    if (isAfterClosing !== undefined) {
      return (userRole === 'manager' || userRole === 'admin') && 
             order.department === department && 
             order.isAfterClosing === isAfterClosing;
    }
    return (userRole === 'manager' || userRole === 'admin') && order.department === department;
  });
  
  let managerCash = 0;
  let managerCard = 0;
  
  managerOrders.forEach((order: any) => {
    if (order.paymentMethod === 'cash') {
      managerCash += order.total;
    } else if (order.paymentMethod === 'card') {
      managerCard += order.total;
    }
  });
  
  return { managerCash, managerCard };
};

// Helper function to calculate usher sales for after closing
export const calculateUsherAfterClosingSales = (orders: Order[]): { usherCash: number; usherCard: number } => {
  const usherOrders = orders.filter((order: any) => {
    const userRole = order.userRole?.toLowerCase();
    return (userRole === 'manager' || userRole === 'admin' || userRole === 'usher') && 
           order.department === 'candy-counter' && 
           order.isAfterClosing;
  });
  
  let usherCash = 0;
  let usherCard = 0;
  
  usherOrders.forEach((order: any) => {
    if (order.paymentMethod === 'cash') {
      usherCash += order.total;
    } else if (order.paymentMethod === 'card') {
      usherCard += order.total;
    }
  });
  
  return { usherCash, usherCard };
};

// Helper function to generate weekly totals section (only on Thursday)
export const generateWeeklyTotalsSection = (
  report: NightlyReport,
  isTrainingReport: boolean,
  formatCurrency: (amount: number) => string,
  allReports?: NightlyReport[]
): string => {
  // Calculate the date range for the past week (Friday to Thursday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 4 = Thursday, 5 = Friday, 6 = Saturday
  
  // Calculate days back to last Friday
  const daysBackToFriday = dayOfWeek === 4 ? 6 : (dayOfWeek + 2) % 7; // If Thursday, go back 6 days; otherwise calculate
  
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - daysBackToFriday);
  
  const weekStartDate = `${lastFriday.getFullYear()}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${String(lastFriday.getDate()).padStart(2, '0')}`;
  const weekEndDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // If no historical reports provided, show current day only
  if (!allReports || allReports.length === 0) {
    return `WEEKLY TOTALS (FRIDAY - THURSDAY)
Week Period: ${weekStartDate} to ${weekEndDate}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY FEES (Current Day Only)
Total Weekly Fees: ${formatCurrency(report.creditCardFees)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY BOX OFFICE (Current Day Only)
Total Weekly Box Office: ${formatCurrency(report.departmentBreakdown['box-office']?.sales || 0)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY AFTER CLOSING (Current Day Only)
Total Weekly After Closing: ${formatCurrency(report.departmentBreakdown['after-closing']?.sales || 0)}${isTrainingReport ? ' (TRAINING)' : ''}

Note: Weekly totals require historical report data. Currently showing current day only.`;
  }
  
  // Calculate weekly totals from all reports in the date range
  let weeklyFees = 0;
  let weeklyBoxOffice = 0;
  let weeklyAfterClosing = 0;
  let weeklyCandyCounter = 0;
  let weeklyTotalSales = 0;
  let weeklyTotalOrders = 0;
  
  allReports.forEach(report => {
    // Check if report date is within the week range
    const reportDate = new Date(report.date);
    if (reportDate >= lastFriday && reportDate <= today) {
      weeklyFees += report.creditCardFees;
      weeklyBoxOffice += report.departmentBreakdown['box-office']?.sales || 0;
      weeklyAfterClosing += report.departmentBreakdown['after-closing']?.sales || 0;
      weeklyCandyCounter += report.departmentBreakdown['candy-counter']?.sales || 0;
      weeklyTotalSales += report.totalSales;
      weeklyTotalOrders += report.totalOrders;
    }
  });
  
  return `WEEKLY TOTALS (FRIDAY - THURSDAY)
Week Period: ${weekStartDate} to ${weekEndDate}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY FEES
Total Weekly Fees: ${formatCurrency(weeklyFees)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY BOX OFFICE
Total Weekly Box Office: ${formatCurrency(weeklyBoxOffice)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY AFTER CLOSING
Total Weekly After Closing: ${formatCurrency(weeklyAfterClosing)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY CANDY COUNTER
Total Weekly Candy Counter: ${formatCurrency(weeklyCandyCounter)}${isTrainingReport ? ' (TRAINING)' : ''}

WEEKLY SUMMARY
Total Weekly Sales: ${formatCurrency(weeklyTotalSales)}${isTrainingReport ? ' (TRAINING)' : ''}
Total Weekly Orders: ${weeklyTotalOrders}${isTrainingReport ? ' (TRAINING)' : ''}`;
};
