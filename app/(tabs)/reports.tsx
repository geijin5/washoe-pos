import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Users, 
  Package, 
  Download,
  Clock,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { RoleGuard } from '@/components/RoleGuard';
import { NightlyReport } from '@/types/pos';


export default function ReportsScreen() {
  const { generateNightlyReport, clearNightlyReport, generateAggregatedReport } = usePOS();
  const { user, getDailyLogins } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportMode, setReportMode] = useState<'local' | 'aggregated'>('local');
  const [isClearingReport, setIsClearingReport] = useState(false);
  const [aggregatedReport, setAggregatedReport] = useState<NightlyReport | null>(null);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);

  const report = useMemo(() => {
    if (reportMode === 'aggregated') {
      return null;
    }
    return generateNightlyReport(selectedDate);
  }, [generateNightlyReport, selectedDate, reportMode]);

  useEffect(() => {
    if (reportMode === 'aggregated') {
      setIsLoadingAggregated(true);
      generateAggregatedReport(selectedDate)
        .then(setAggregatedReport)
        .catch(error => {
          console.error('Error generating aggregated report:', error);
          setAggregatedReport(null);
        })
        .finally(() => setIsLoadingAggregated(false));
    }
  }, [generateAggregatedReport, selectedDate, reportMode]);

  const currentReport = useMemo(() => {
    return reportMode === 'aggregated' ? aggregatedReport : report;
  }, [reportMode, aggregatedReport, report]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return amount.toFixed(2);
  }, []);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  }, [selectedDate]);

  const generateReportText = useCallback((report: NightlyReport) => {
    const reportDate = new Date(report.date);
    const dailyLogins = getDailyLogins(reportDate);
    const loginsText = dailyLogins.length > 0 
      ? dailyLogins.map(login => 
          `${login.userName} - ${new Date(login.loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
        ).join('\n')
      : 'No user logins recorded for this date';

    // Calculate exact payment breakdown by department from actual orders
    const boxOfficeTotal = report.departmentBreakdown['box-office']?.sales || 0;
    const boxOfficeOrders = report.departmentBreakdown['box-office']?.orders || 0;
    const candyCounterTotal = report.departmentBreakdown['candy-counter']?.sales || 0;
    const candyCounterOrders = report.departmentBreakdown['candy-counter']?.orders || 0;
    const afterClosingTotal = report.departmentBreakdown['after-closing']?.sales || 0;
    
    // Calculate exact cash and card amounts from actual orders by department
    let boxOfficeCashSales = 0;
    let boxOfficeCardSales = 0;
    let candyCounterCashSales = 0;
    let candyCounterCardSales = 0;
    
    // Get actual payment breakdown from the report's payment calculations
    if (report.paymentBreakdown) {
      boxOfficeCashSales = report.paymentBreakdown.boxOfficeCash || 0;
      boxOfficeCardSales = report.paymentBreakdown.boxOfficeCard || 0;
      candyCounterCashSales = report.paymentBreakdown.candyCounterCash || 0;
      candyCounterCardSales = report.paymentBreakdown.candyCounterCard || 0;
    } else {
      // Fallback to proportional calculation if detailed breakdown not available
      if (report.totalSales > 0) {
        const overallCashRatio = report.cashSales / report.totalSales;
        const overallCardRatio = report.cardSales / report.totalSales;
        
        boxOfficeCashSales = boxOfficeTotal * overallCashRatio;
        boxOfficeCardSales = boxOfficeTotal * overallCardRatio;
        candyCounterCashSales = candyCounterTotal * overallCashRatio;
        candyCounterCardSales = candyCounterTotal * overallCardRatio;
      }
    }
    
    // Calculate card fees correctly
    const boxOfficeCardFees = boxOfficeCardSales * 0.05; // 5% card fee for box office
    const candyCounterCardFees = candyCounterCardSales * 0.05; // 5% card fee for candy counter concessions
    
    // Calculate after closing card fees from the card portion of after closing sales
    const overallCardRatio = report.totalSales > 0 ? report.cardSales / report.totalSales : 0;
    const afterClosingCardSales = afterClosingTotal * overallCardRatio;
    const afterClosingCardFees = afterClosingCardSales * 0.05; // 5% card fee for after closing tickets
    
    // Total candy counter fees includes both candy counter and after closing fees
    const totalCandyCounterFees = candyCounterCardFees + afterClosingCardFees;
    const totalFees = boxOfficeCardFees + candyCounterCardFees + afterClosingCardFees;
    


    let reportText = `NIGHTLY SALES REPORT (LOCAL DEVICE ONLY)
${formatDate(reportDate)}
Generated by: ${user?.name} (${user?.role})

IMPORTANT: Reports older than 14 days are automatically cleared to maintain system performance.

SUMMARY
Total Sales: ${formatCurrency(report.totalSales)}
Total Orders: ${report.totalOrders}
Average Order: ${formatCurrency(report.totalOrders > 0 ? report.totalSales / report.totalOrders : 0)}

PAYMENT BREAKDOWN
Cash Sales: ${formatCurrency(report.cashSales)}
Card Sales: ${formatCurrency(report.cardSales)}

BOX OFFICE CASH SECTION
Box Office Cash: ${formatCurrency(boxOfficeCashSales)}
Candy Counter Cash: ${formatCurrency(candyCounterCashSales)}


BOX OFFICE CASH SECTION
Box Office Cash: ${formatCurrency(boxOfficeCashSales)}
Box Office Card: ${formatCurrency(boxOfficeCardSales)}
Box Office Card Fees: ${formatCurrency(boxOfficeCardFees)}

CANDY COUNTER CASH SECTION
Candy Counter Cash: ${formatCurrency(candyCounterCashSales)}
Candy Counter Card: ${formatCurrency(candyCounterCardSales)}
Candy Counter Card Fees: ${formatCurrency(totalCandyCounterFees)}

FEES SECTION
Box Office Fees: ${formatCurrency(boxOfficeCardFees)}
Candy Counter Fees: ${formatCurrency(totalCandyCounterFees)}
Total Fees: ${formatCurrency(totalFees)}

DEPARTMENT BREAKDOWN
Candy Counter (All Concession Sales): ${formatCurrency(report.departmentBreakdown['candy-counter'].sales)} (${report.departmentBreakdown['candy-counter'].orders} orders)`;

    if (report.departmentBreakdown['box-office'] && report.departmentBreakdown['box-office'].sales > 0) {
      reportText += `\nBox Office: ${formatCurrency(report.departmentBreakdown['box-office'].sales)} (${report.departmentBreakdown['box-office'].orders} orders)`;
    }
    
    if (report.departmentBreakdown['after-closing'] && report.departmentBreakdown['after-closing'].sales > 0) {
      reportText += `\nAfter Closing (All Ticket Sales): ${formatCurrency(report.departmentBreakdown['after-closing'].sales)} (${report.departmentBreakdown['after-closing'].orders} orders)`;
    }
    
    // Add show breakdown if available
    if (report.showBreakdown) {
      reportText += `\n\nSHOW BREAKDOWN`;
      if (report.showBreakdown['1st-show'].sales > 0) {
        reportText += `\n1st Show: ${formatCurrency(report.showBreakdown['1st-show'].sales)} (${report.showBreakdown['1st-show'].orders} orders)`;
      }
      if (report.showBreakdown['2nd-show'].sales > 0) {
        reportText += `\n2nd Show: ${formatCurrency(report.showBreakdown['2nd-show'].sales)} (${report.showBreakdown['2nd-show'].orders} orders)`;
      }
      if (report.showBreakdown['nightly-show'].sales > 0) {
        reportText += `\nNightly Show: ${formatCurrency(report.showBreakdown['nightly-show'].sales)} (${report.showBreakdown['nightly-show'].orders} orders)`;
      }
      if (report.showBreakdown['matinee'].sales > 0) {
        reportText += `\nMatinee: ${formatCurrency(report.showBreakdown['matinee'].sales)} (${report.showBreakdown['matinee'].orders} orders)`;
      }
    }
    
    // Add debug info for enhanced department breakdown in report text
    console.log(`=== REPORT TEXT DEPARTMENT BREAKDOWN ===`);
    console.log(`Box Office: ${(report.departmentBreakdown['box-office']?.sales || 0).toFixed(2)} (${report.departmentBreakdown['box-office']?.orders || 0} orders)`);
    console.log(`Candy Counter (All Concessions): ${report.departmentBreakdown['candy-counter'].sales.toFixed(2)} (${report.departmentBreakdown['candy-counter'].orders} orders)`);
    console.log(`After Closing (All Tickets): ${(report.departmentBreakdown['after-closing']?.sales || 0).toFixed(2)} (${report.departmentBreakdown['after-closing']?.orders || 0} orders)`);
    console.log('============================================');

    // Separate managers and other staff - Enhanced to ensure managers show up properly
    const managers = report.userBreakdown.filter(user => {
      const role = user.userRole?.toLowerCase();
      return role === 'manager' || role === 'admin';
    });
    const otherStaff = report.userBreakdown.filter(user => {
      const role = user.userRole?.toLowerCase();
      return role !== 'manager' && role !== 'admin';
    });
    
    // Debug logging for manager accounts
    console.log('=== REPORT TEXT MANAGER DEBUG ===');
    console.log(`Total user breakdown entries: ${report.userBreakdown.length}`);
    report.userBreakdown.forEach(user => {
      console.log(`User: ${user.userName}, Role: ${user.userRole || 'undefined'}, Sales: ${user.sales}`);
    });
    console.log(`Managers found: ${managers.length}`);
    console.log(`Other staff found: ${otherStaff.length}`);
    console.log('================================');
    
    reportText += `\n\nSALES MANAGERS PERFORMANCE (All Sales)`;
    if (managers.length > 0) {
      reportText += `\n${managers.map((userReport) => {
        const roleText = userReport.userRole ? ` (${userReport.userRole})` : '';
        return `${userReport.userName}${roleText}: ${formatCurrency(userReport.sales)} (${userReport.orders} orders)`;
      }).join('\n')}`;
    } else {
      reportText += `\nNo sales manager activity recorded for this date`;
    }
    
    reportText += `\n\nOTHER STAFF PERFORMANCE (All Sales)`;
    if (otherStaff.length > 0) {
      reportText += `\n${otherStaff.map((userReport) => {
        const roleText = userReport.userRole ? ` (${userReport.userRole})` : '';
        return `${userReport.userName}${roleText}: ${formatCurrency(userReport.sales)} (${userReport.orders} orders)`;
      }).join('\n')}`;
    } else {
      reportText += `\nNo other staff activity recorded for this date`;
    }
    
    reportText += `\n\nNote: Staff performance includes all sales made by each user including candy counter and after-closing transactions.`;



    reportText += `\n\nUSERS LOGGED IN\n${loginsText}\n\nReport generated on ${new Date().toLocaleString()}`;
    
    return reportText;
  }, [user, getDailyLogins, formatDate, formatCurrency]);





  const handleExportReport = useCallback(async () => {
    if (!currentReport) return;
    
    try {
      setIsGenerating(true);
      const reportText = generateReportText(currentReport);
      
      if (Platform.OS === 'web') {
        // For web, create a downloadable text file
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `local-report-${currentReport.date}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Report downloaded successfully!');
      } else {
        // For mobile, use Share API
        const shareSupported = await Share.share({
          message: reportText,
          title: `Local Report - ${currentReport.date}`,
        });
        
        if (shareSupported.action === Share.dismissedAction) {
          console.log('Share dismissed');
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      
      if (Platform.OS === 'web') {
        // Fallback for web - copy to clipboard
        try {
          const reportText = generateReportText(currentReport);
          await navigator.clipboard.writeText(reportText);
          Alert.alert('Copied to Clipboard', 'Report has been copied to your clipboard.');
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
          Alert.alert('Error', 'Failed to export report. Please try the print option instead.');
        }
      } else {
        Alert.alert('Error', 'Failed to export report. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentReport, generateReportText]);

  const handleClearNightlyReport = useCallback(async () => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only admin users can clear nightly reports.');
      return;
    }

    Alert.alert(
      'Clear Nightly Report',
      `Are you sure you want to clear all data for ${formatDate(selectedDate)}?\n\nThis action cannot be undone and will permanently delete all orders, sales, and staff performance data for this date.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Report',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearingReport(true);
              const success = await clearNightlyReport(selectedDate);
              
              if (success) {
                Alert.alert(
                  'Report Cleared',
                  `All data for ${formatDate(selectedDate)} has been successfully cleared.`
                );
                

              } else {
                Alert.alert('Error', 'Failed to clear nightly report. Please try again.');
              }
            } catch (error) {
              console.error('Error clearing nightly report:', error);
              Alert.alert('Error', 'Failed to clear nightly report. Please try again.');
            } finally {
              setIsClearingReport(false);
            }
          },
        },
      ]
    );
  }, [user?.role, clearNightlyReport, selectedDate, formatDate]);

  if (reportMode === 'aggregated' && isLoadingAggregated) {
    return (
      <RoleGuard requiredRole={['manager', 'admin']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={TheatreColors.accent} />
          <Text style={[styles.title, { marginTop: 16 }]}>Generating Report...</Text>
          <Text style={styles.subtitle}>Including box office data from all devices</Text>
        </View>
      </RoleGuard>
    );
  }

  if (!currentReport) {
    return (
      <RoleGuard requiredRole={['manager', 'admin']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.title}>No Report Available</Text>
          <Text style={styles.subtitle}>Unable to generate report for selected date</Text>
        </View>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRole={['manager', 'admin']}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <BarChart3 size={32} color={TheatreColors.accent} />
            <Text style={styles.title}>Nightly Reports</Text>
            <Text style={styles.subtitle}>
              Local device sales analytics and performance data
            </Text>
          </View>

          {/* Date Navigation */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => navigateDate('prev')}
            >
              <ChevronLeft size={20} color={TheatreColors.text} />
            </TouchableOpacity>
            
            <View style={styles.dateDisplay}>
              <Calendar size={20} color={TheatreColors.accent} />
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => navigateDate('next')}
            >
              <ChevronRight size={20} color={TheatreColors.text} />
            </TouchableOpacity>
          </View>



          {/* Auto-Clear Notice */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Automatic Data Management</Text>
            <Text style={styles.sectionDescription}>
              The system shows the current night and past 14 days of reports (15 days total). 
              Reports older than 14 days are automatically cleared each day to maintain system performance. 
              This ensures you always have access to recent sales data while keeping the app running smoothly.
            </Text>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <DollarSign size={24} color={TheatreColors.success} />
              <Text style={styles.summaryValue}>${formatCurrency(currentReport.totalSales)}</Text>
              <Text style={styles.summaryLabel}>Total Sales</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Package size={24} color={TheatreColors.primary} />
              <Text style={styles.summaryValue}>{currentReport.totalOrders}</Text>
              <Text style={styles.summaryLabel}>Orders</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <CreditCard size={24} color={TheatreColors.accent} />
              <Text style={styles.summaryValue}>${formatCurrency(currentReport.creditCardFees)}</Text>
              <Text style={styles.summaryLabel}>Card Fees</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Users size={24} color={TheatreColors.warning} />
              <Text style={styles.summaryValue}>{getDailyLogins(selectedDate).length}</Text>
              <Text style={styles.summaryLabel}>Users Logged In</Text>
            </View>
          </View>

          {/* Payment Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Breakdown</Text>
            <View style={styles.paymentBreakdown}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Cash Sales:</Text>
                <Text style={styles.paymentValue}>${formatCurrency(currentReport.cashSales)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Card Sales:</Text>
                <Text style={styles.paymentValue}>${formatCurrency(currentReport.cardSales)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Card Sales:</Text>
                <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>${formatCurrency(currentReport.cardSales)}</Text>
              </View>
            </View>
          </View>



          {/* Box Office Payment Breakdown */}
          {currentReport.departmentBreakdown['box-office'] && currentReport.departmentBreakdown['box-office'].sales > 0 && (() => {
            const boxOfficeTotal = currentReport.departmentBreakdown['box-office'].sales;
            
            // Use actual payment breakdown if available, otherwise calculate proportionally
            let boxOfficeCashSales, boxOfficeCardSales;
            if (currentReport.paymentBreakdown) {
              boxOfficeCashSales = currentReport.paymentBreakdown.boxOfficeCash || 0;
              boxOfficeCardSales = currentReport.paymentBreakdown.boxOfficeCard || 0;
            } else {
              const overallCashRatio = currentReport.totalSales > 0 ? currentReport.cashSales / currentReport.totalSales : 0;
              const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
              boxOfficeCashSales = boxOfficeTotal * overallCashRatio;
              boxOfficeCardSales = boxOfficeTotal * overallCardRatio;
            }
            
            const boxOfficeCardFees = boxOfficeCardSales * 0.05;
            
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Box Office Payment Breakdown</Text>
                <View style={styles.paymentBreakdown}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Box Office Cash:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(boxOfficeCashSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Box Office Card:</Text>
                    <Text style={styles.paymentValue}>${formatCurrency(boxOfficeCardSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Box Office Card Fees:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(boxOfficeCardFees)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Candy Counter Payment Breakdown */}
          {currentReport.departmentBreakdown['candy-counter'] && currentReport.departmentBreakdown['candy-counter'].sales > 0 && (() => {
            const candyCounterTotal = currentReport.departmentBreakdown['candy-counter'].sales;
            const afterClosingTotal = currentReport.departmentBreakdown['after-closing']?.sales || 0;
            
            // Use actual payment breakdown if available, otherwise calculate proportionally
            let candyCounterCashSales, candyCounterCardSales;
            if (currentReport.paymentBreakdown) {
              candyCounterCashSales = currentReport.paymentBreakdown.candyCounterCash || 0;
              candyCounterCardSales = currentReport.paymentBreakdown.candyCounterCard || 0;
            } else {
              const overallCashRatio = currentReport.totalSales > 0 ? currentReport.cashSales / currentReport.totalSales : 0;
              const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
              candyCounterCashSales = candyCounterTotal * overallCashRatio;
              candyCounterCardSales = candyCounterTotal * overallCardRatio;
            }
            
            // Calculate card fees for candy counter concessions only
            const candyCounterCardFees = candyCounterCardSales * 0.05;
            // Calculate after closing card fees from the card portion only
            const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
            const afterClosingCardSales = afterClosingTotal * overallCardRatio;
            const afterClosingCardFees = afterClosingCardSales * 0.05;
            // Total candy counter fees includes both candy counter and after closing
            const totalCandyCounterFees = candyCounterCardFees + afterClosingCardFees;
            
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Candy Counter Payment Breakdown</Text>
                <View style={styles.paymentBreakdown}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Candy Counter Cash:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(candyCounterCashSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Candy Counter Card:</Text>
                    <Text style={styles.paymentValue}>${formatCurrency(candyCounterCardSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Candy Counter Card Fees:</Text>
                    <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.error }]}>${formatCurrency(totalCandyCounterFees)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Fees Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fees Section</Text>
            <View style={styles.paymentBreakdown}>
              {(() => {
                const boxOfficeTotal = currentReport.departmentBreakdown['box-office']?.sales || 0;
                const candyCounterTotal = currentReport.departmentBreakdown['candy-counter']?.sales || 0;
                const afterClosingTotal = currentReport.departmentBreakdown['after-closing']?.sales || 0;
                
                let boxOfficeCardFees = 0;
                let candyCounterCardFees = 0;
                let afterClosingCardFees = 0;
                
                if (currentReport.paymentBreakdown) {
                  // Use actual payment breakdown for accurate fee calculation
                  const boxOfficeCardSales = currentReport.paymentBreakdown.boxOfficeCard || 0;
                  const candyCounterCardSales = currentReport.paymentBreakdown.candyCounterCard || 0;
                  
                  boxOfficeCardFees = boxOfficeCardSales * 0.05;
                  candyCounterCardFees = candyCounterCardSales * 0.05;
                  
                  // After closing fees are calculated from the after closing card sales
                  if (afterClosingTotal > 0) {
                    const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
                    const afterClosingCardSales = afterClosingTotal * overallCardRatio;
                    afterClosingCardFees = afterClosingCardSales * 0.05;
                  }
                } else {
                  // Fallback calculation using proportional method
                  const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
                  const boxOfficeCardSales = boxOfficeTotal * overallCardRatio;
                  const candyCounterCardSales = candyCounterTotal * overallCardRatio;
                  const afterClosingCardSales = afterClosingTotal * overallCardRatio;
                  
                  boxOfficeCardFees = boxOfficeCardSales * 0.05;
                  candyCounterCardFees = candyCounterCardSales * 0.05;
                  afterClosingCardFees = afterClosingCardSales * 0.05;
                }
                
                // Calculate the correct total fees
                const calculatedTotalFees = boxOfficeCardFees + candyCounterCardFees + afterClosingCardFees;
                
                return (
                  <>
                    {boxOfficeTotal > 0 && (
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Box Office Fees:</Text>
                        <Text style={styles.paymentValue}>${formatCurrency(boxOfficeCardFees)}</Text>
                      </View>
                    )}
                    {candyCounterTotal > 0 && (
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Candy Counter Fees:</Text>
                        <Text style={styles.paymentValue}>${formatCurrency(candyCounterCardFees + afterClosingCardFees)}</Text>
                      </View>
                    )}
                    <View style={styles.paymentRow}>
                      <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Fees:</Text>
                      <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.error }]}>${formatCurrency(calculatedTotalFees)}</Text>
                    </View>
                  </>
                );
              })()}
            </View>
          </View>

          {/* Department Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Department Performance</Text>
            <View style={styles.departmentGrid}>
              <View style={styles.departmentCard}>
                <Text style={styles.departmentName}>Candy Counter</Text>
                <Text style={styles.departmentSubtitle}>All Concession Sales</Text>
                <Text style={styles.departmentSales}>
                  ${formatCurrency(currentReport.departmentBreakdown['candy-counter'].sales)}
                </Text>
                <Text style={styles.departmentOrders}>
                  {currentReport.departmentBreakdown['candy-counter'].orders} orders
                </Text>
              </View>
              
              {currentReport.departmentBreakdown['box-office'] && currentReport.departmentBreakdown['box-office'].sales > 0 && (
                <View style={styles.departmentCard}>
                  <Text style={styles.departmentName}>Box Office</Text>
                  <Text style={styles.departmentSales}>
                    ${formatCurrency(currentReport.departmentBreakdown['box-office'].sales)}
                  </Text>
                  <Text style={styles.departmentOrders}>
                    {currentReport.departmentBreakdown['box-office'].orders} orders
                  </Text>
                </View>
              )}
              
              {currentReport.departmentBreakdown['after-closing'] && currentReport.departmentBreakdown['after-closing'].sales > 0 && (
                <View style={styles.departmentCard}>
                  <Text style={styles.departmentName}>After Closing</Text>
                  <Text style={styles.departmentSubtitle}>Ticket Sales Only</Text>
                  <Text style={styles.departmentSales}>
                    ${formatCurrency(currentReport.departmentBreakdown['after-closing'].sales)}
                  </Text>
                  <Text style={styles.departmentOrders}>
                    {currentReport.departmentBreakdown['after-closing'].orders} orders
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Show Performance - Only show if there are show sales */}
          {currentReport.showBreakdown && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Show Performance</Text>
              <Text style={styles.sectionDescription}>Box office ticket sales by show</Text>
              <View style={styles.departmentGrid}>
                {currentReport.showBreakdown['1st-show'].sales > 0 && (
                  <View style={styles.departmentCard}>
                    <Text style={styles.departmentName}>1st Show</Text>
                    <Text style={styles.departmentSales}>
                      ${formatCurrency(currentReport.showBreakdown['1st-show'].sales)}
                    </Text>
                    <Text style={styles.departmentOrders}>
                      {currentReport.showBreakdown['1st-show'].orders} orders
                    </Text>
                  </View>
                )}
                
                {currentReport.showBreakdown['2nd-show'].sales > 0 && (
                  <View style={styles.departmentCard}>
                    <Text style={styles.departmentName}>2nd Show</Text>
                    <Text style={styles.departmentSales}>
                      ${formatCurrency(currentReport.showBreakdown['2nd-show'].sales)}
                    </Text>
                    <Text style={styles.departmentOrders}>
                      {currentReport.showBreakdown['2nd-show'].orders} orders
                    </Text>
                  </View>
                )}
                
                {currentReport.showBreakdown['nightly-show'].sales > 0 && (
                  <View style={styles.departmentCard}>
                    <Text style={styles.departmentName}>Nightly Show</Text>
                    <Text style={styles.departmentSales}>
                      ${formatCurrency(currentReport.showBreakdown['nightly-show'].sales)}
                    </Text>
                    <Text style={styles.departmentOrders}>
                      {currentReport.showBreakdown['nightly-show'].orders} orders
                    </Text>
                  </View>
                )}
                
                {currentReport.showBreakdown['matinee'].sales > 0 && (
                  <View style={styles.departmentCard}>
                    <Text style={styles.departmentName}>Matinee</Text>
                    <Text style={styles.departmentSales}>
                      ${formatCurrency(currentReport.showBreakdown['matinee'].sales)}
                    </Text>
                    <Text style={styles.departmentOrders}>
                      {currentReport.showBreakdown['matinee'].orders} orders
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Sales Managers Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sales Managers Performance</Text>
            <Text style={styles.sectionDescription}>Managers and admins - includes all sales transactions</Text>
            {(() => {
              const managers = currentReport.userBreakdown?.filter(user => {
                const role = user.userRole?.toLowerCase();
                return role === 'manager' || role === 'admin';
              }) || [];
              
              return managers.length > 0 ? (
                <View style={styles.staffContainer}>
                  {managers
                    .sort((a: any, b: any) => b.sales - a.sales)
                    .map((user: any, index: number) => (
                    <View key={`manager-${user.userId}-${index}`} style={styles.staffRow}>
                      <View style={styles.staffRank}>
                        <Text style={styles.staffRankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>
                          {user.userName}
                          {user.userRole && (
                            <Text style={styles.userRole}> ({user.userRole})</Text>
                          )}
                        </Text>
                        <Text style={styles.staffOrders}>
                          {user.orders} orders • Avg: ${formatCurrency(user.orders > 0 ? user.sales / user.orders : 0)}
                        </Text>
                      </View>
                      <View style={styles.staffSalesContainer}>
                        <Text style={styles.staffSales}>${formatCurrency(user.sales)}</Text>
                        <Text style={styles.staffPercentage}>
                          {currentReport.totalSales > 0 ? ((user.sales / currentReport.totalSales) * 100).toFixed(1) : '0.0'}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Users size={32} color={TheatreColors.textSecondary} />
                  <Text style={styles.emptyStateText}>No sales manager activity recorded for this date</Text>
                  <Text style={styles.emptyStateSubtext}>Sales manager performance will appear here when managers process orders</Text>
                </View>
              );
            })()}
          </View>

          {/* Other Staff Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Staff Performance</Text>
            <Text style={styles.sectionDescription}>Staff and ushers - includes all sales transactions</Text>
            {(() => {
              const otherStaff = currentReport.userBreakdown?.filter(user => {
                const role = user.userRole?.toLowerCase();
                return role !== 'manager' && role !== 'admin';
              }) || [];
              
              return otherStaff.length > 0 ? (
                <View style={styles.staffContainer}>
                  {otherStaff
                    .sort((a: any, b: any) => b.sales - a.sales)
                    .map((user: any, index: number) => (
                    <View key={`staff-${user.userId}-${index}`} style={styles.staffRow}>
                      <View style={styles.staffRank}>
                        <Text style={styles.staffRankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>
                          {user.userName}
                          {user.userRole && (
                            <Text style={styles.userRole}> ({user.userRole})</Text>
                          )}
                        </Text>
                        <Text style={styles.staffOrders}>
                          {user.orders} orders • Avg: ${formatCurrency(user.orders > 0 ? user.sales / user.orders : 0)}
                        </Text>
                      </View>
                      <View style={styles.staffSalesContainer}>
                        <Text style={styles.staffSales}>${formatCurrency(user.sales)}</Text>
                        <Text style={styles.staffPercentage}>
                          {currentReport.totalSales > 0 ? ((user.sales / currentReport.totalSales) * 100).toFixed(1) : '0.0'}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Users size={32} color={TheatreColors.textSecondary} />
                  <Text style={styles.emptyStateText}>No other staff activity recorded for this date</Text>
                  <Text style={styles.emptyStateSubtext}>Staff performance will appear here when staff members process orders</Text>
                </View>
              );
            })()}
          </View>



          {/* Daily Logins */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Users Logged In Today</Text>
            {(() => {
              const dailyLogins = getDailyLogins(selectedDate);
              return dailyLogins.length > 0 ? (
                <View style={styles.loginsContainer}>
                  {dailyLogins.map((login, index) => (
                    <View key={`${login.userId}-${index}`} style={styles.loginRow}>
                      <View style={styles.loginIcon}>
                        <Clock size={16} color={TheatreColors.accent} />
                      </View>
                      <View style={styles.loginInfo}>
                        <Text style={styles.loginName}>{login.userName}</Text>
                        <Text style={styles.loginTime}>
                          Logged in at {new Date(login.loginTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Clock size={32} color={TheatreColors.textSecondary} />
                  <Text style={styles.emptyStateText}>No user logins recorded for this date</Text>
                  <Text style={styles.emptyStateSubtext}>User login activity will appear here when staff members sign in</Text>
                </View>
              );
            })()}
          </View>





          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton, isClearingReport && styles.disabledButton]}
                onPress={handleClearNightlyReport}
                disabled={isClearingReport}
              >
                {isClearingReport ? (
                  <ActivityIndicator size={20} color={TheatreColors.background} />
                ) : (
                  <Trash2 size={20} color={TheatreColors.background} />
                )}
                <Text style={styles.actionButtonText}>
                  {isClearingReport ? 'Clearing...' : 'Clear Report'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.exportButton]}
              onPress={handleExportReport}
              disabled={isGenerating}
            >
              <Download size={20} color={TheatreColors.background} />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Report generated by: {user?.name} ({user?.role})
            </Text>
          </View>
        </View>
      </ScrollView>
      

    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surfaceLight,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentBreakdown: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  departmentCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  departmentSubtitle: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  departmentSales: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 4,
  },
  departmentOrders: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  staffContainer: {
    gap: 8,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  staffRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TheatreColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  staffInfo: {
    flex: 1,
    marginRight: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    color: TheatreColors.primary,
  },
  staffOrders: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  deviceInfo: {
    fontSize: 12,
    color: TheatreColors.primary,
    fontWeight: '500',
  },
  staffSalesContainer: {
    alignItems: 'flex-end',
  },
  staffSales: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 2,
  },
  staffPercentage: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    fontWeight: '500',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TheatreColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  printerStatus: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  printerConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  printerDisconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  printerType: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  printerSetupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  printerConnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.primary,
  },
  printerConnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  printButton: {
    backgroundColor: TheatreColors.primary,
  },
  receiptButton: {
    backgroundColor: TheatreColors.accent,
  },
  exportButton: {
    backgroundColor: TheatreColors.success,
  },
  clearButton: {
    backgroundColor: TheatreColors.error,
  },
  disabledButton: {
    backgroundColor: TheatreColors.textSecondary,
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  footerText: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modeToggleActive: {
    backgroundColor: TheatreColors.primary,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.primary,
  },
  modeToggleTextActive: {
    color: TheatreColors.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  loginsContainer: {
    gap: 8,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  loginIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TheatreColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loginInfo: {
    flex: 1,
  },
  loginName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  loginTime: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  deviceContainer: {
    gap: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TheatreColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  deviceIp: {
    fontSize: 12,
    color: TheatreColors.primary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  deviceStats: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  deviceSalesContainer: {
    alignItems: 'flex-end',
  },
  deviceSales: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 2,
  },
  devicePercentage: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    fontWeight: '500',
  },
  staticIPInfo: {
    fontSize: 12,
    color: TheatreColors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
});