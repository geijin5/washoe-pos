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
import { UsherReportAccess } from '@/components/UsherReportAccess';
import {
  filterOrdersByDate,
  calculateUserSalesByDepartment,
  calculatePaymentBreakdown,
  calculateCardFeesByDepartment,
  generateReportHeader,
  generateSummarySection,
  generateDepartmentBreakdownSection,
  calculateManagerSalesByDepartment,
  calculateUsherAfterClosingSales
} from './reports-helpers';
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
  GraduationCap,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { RoleGuard } from '@/components/RoleGuard';
import { NightlyReport } from '@/types/pos';


export default function ReportsScreen() {
  const { generateNightlyReport, clearNightlyReport, generateAggregatedReport, orders, settings } = usePOS();
  const { user, getDailyLogins, isTrainingMode } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportMode, setReportMode] = useState<'local' | 'aggregated'>('local');
  const [isClearingReport, setIsClearingReport] = useState(false);
  const [aggregatedReport, setAggregatedReport] = useState<NightlyReport | null>(null);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);
  const [showUsherAccess, setShowUsherAccess] = useState(false);
  const [temporaryUser, setTemporaryUser] = useState<any>(null);

  const report = useMemo(() => {
    if (reportMode === 'aggregated') {
      return null;
    }
    console.log(`=== REPORTS SCREEN: Generating report for ${selectedDate.toISOString().split('T')[0]} ===`);
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

    // Check if this is a training mode report
    const isTrainingReport = isTrainingMode || settings.trainingMode;

    // Use temporary user if available, otherwise use current user
    const currentUser = temporaryUser || user;

    // Use helper function to calculate payment breakdown
    const paymentBreakdown = calculatePaymentBreakdown(report);
    
    // Use helper function to calculate card fees
    const cardFees = calculateCardFeesByDepartment(report, paymentBreakdown, settings.creditCardFeePercent);
    


    // Generate report sections using helper functions
    const header = generateReportHeader(report, currentUser, isTrainingReport || false, formatDate);
    const summary = generateSummarySection(report, isTrainingReport || false, formatCurrency);
    const departmentBreakdown = generateDepartmentBreakdownSection(report, paymentBreakdown, cardFees, isTrainingReport || false, formatCurrency);

    let reportText = `${header}

${summary}

${departmentBreakdown}`;
    
    // Add show breakdown if available
    if (report.showBreakdown) {
      const hasShowSales = Object.values(report.showBreakdown).some(show => show.sales > 0);
      if (hasShowSales) {
        reportText += `\n\nSHOW BREAKDOWN${isTrainingReport ? ' (TRAINING)' : ''}`;
        if (report.showBreakdown['1st-show'].sales > 0) {
          reportText += `\n1st Show: ${formatCurrency(report.showBreakdown['1st-show'].sales)} (${report.showBreakdown['1st-show'].orders} orders)${isTrainingReport ? ' (TRAINING)' : ''}`;
        }
        if (report.showBreakdown['2nd-show'].sales > 0) {
          reportText += `\n2nd Show: ${formatCurrency(report.showBreakdown['2nd-show'].sales)} (${report.showBreakdown['2nd-show'].orders} orders)${isTrainingReport ? ' (TRAINING)' : ''}`;
        }
        if (report.showBreakdown['nightly-show'].sales > 0) {
          reportText += `\nNightly Show: ${formatCurrency(report.showBreakdown['nightly-show'].sales)} (${report.showBreakdown['nightly-show'].orders} orders)${isTrainingReport ? ' (TRAINING)' : ''}`;
        }
        if (report.showBreakdown['matinee'].sales > 0) {
          reportText += `\nMatinee: ${formatCurrency(report.showBreakdown['matinee'].sales)} (${report.showBreakdown['matinee'].orders} orders)${isTrainingReport ? ' (TRAINING)' : ''}`;
        }
        
        reportText += `\n\nPAYMENT BY SHOW`;
        if (report.showBreakdown['1st-show'].sales > 0) {
          reportText += `\n1st Show: ${formatCurrency(report.showBreakdown['1st-show'].sales)}`;
        }
        if (report.showBreakdown['2nd-show'].sales > 0) {
          reportText += `\n2nd Show: ${formatCurrency(report.showBreakdown['2nd-show'].sales)}`;
        }
        if (report.showBreakdown['nightly-show'].sales > 0) {
          reportText += `\nNightly Show: ${formatCurrency(report.showBreakdown['nightly-show'].sales)}`;
        }
        if (report.showBreakdown['matinee'].sales > 0) {
          reportText += `\nMatinee: ${formatCurrency(report.showBreakdown['matinee'].sales)}`;
        }
        
        reportText += `\n\nCASH SALES BY SHOW`;
        if (report.showBreakdown['1st-show'].sales > 0) {
          const showCashSales = report.showBreakdown['1st-show'].cashSales || 0;
          reportText += `\n1st Show Cash: ${formatCurrency(showCashSales)}`;
        }
        if (report.showBreakdown['2nd-show'].sales > 0) {
          const showCashSales = report.showBreakdown['2nd-show'].cashSales || 0;
          reportText += `\n2nd Show Cash: ${formatCurrency(showCashSales)}`;
        }
        if (report.showBreakdown['nightly-show'].sales > 0) {
          const showCashSales = report.showBreakdown['nightly-show'].cashSales || 0;
          reportText += `\nNightly Show Cash: ${formatCurrency(showCashSales)}`;
        }
        if (report.showBreakdown['matinee'].sales > 0) {
          const showCashSales = report.showBreakdown['matinee'].cashSales || 0;
          reportText += `\nMatinee Cash: ${formatCurrency(showCashSales)}`;
        }
        
        reportText += `\n\nCARD SALES BY SHOW`;
        if (report.showBreakdown['1st-show'].sales > 0) {
          const showCardSales = report.showBreakdown['1st-show'].cardSales || 0;
          reportText += `\n1st Show Card: ${formatCurrency(showCardSales)}`;
        }
        if (report.showBreakdown['2nd-show'].sales > 0) {
          const showCardSales = report.showBreakdown['2nd-show'].cardSales || 0;
          reportText += `\n2nd Show Card: ${formatCurrency(showCardSales)}`;
        }
        if (report.showBreakdown['nightly-show'].sales > 0) {
          const showCardSales = report.showBreakdown['nightly-show'].cardSales || 0;
          reportText += `\nNightly Show Card: ${formatCurrency(showCardSales)}`;
        }
        if (report.showBreakdown['matinee'].sales > 0) {
          const showCardSales = report.showBreakdown['matinee'].cardSales || 0;
          reportText += `\nMatinee Card: ${formatCurrency(showCardSales)}`;
        }
        
        reportText += `\n\nCARD FEES BY SHOW`;
        if (report.showBreakdown['1st-show'].sales > 0) {
          const showCardFees = report.showBreakdown['1st-show'].creditCardFees || 0;
          reportText += `\n1st Show Card Fees: ${formatCurrency(showCardFees)}`;
        }
        if (report.showBreakdown['2nd-show'].sales > 0) {
          const showCardFees = report.showBreakdown['2nd-show'].creditCardFees || 0;
          reportText += `\n2nd Show Card Fees: ${formatCurrency(showCardFees)}`;
        }
        if (report.showBreakdown['nightly-show'].sales > 0) {
          const showCardFees = report.showBreakdown['nightly-show'].creditCardFees || 0;
          reportText += `\nNightly Show Card Fees: ${formatCurrency(showCardFees)}`;
        }
        if (report.showBreakdown['matinee'].sales > 0) {
          const showCardFees = report.showBreakdown['matinee'].creditCardFees || 0;
          reportText += `\nMatinee Card Fees: ${formatCurrency(showCardFees)}`;
        }
      }
    }
    
    // Add debug info for enhanced department breakdown in report text
    console.log(`=== REPORT TEXT DEPARTMENT BREAKDOWN ===`);
    console.log(`Box Office: ${(report.departmentBreakdown['box-office']?.sales || 0).toFixed(2)} (${report.departmentBreakdown['box-office']?.orders || 0} orders)`);
    console.log(`Candy Counter (All Concessions): ${report.departmentBreakdown['candy-counter'].sales.toFixed(2)} (${report.departmentBreakdown['candy-counter'].orders} orders)`);
    console.log(`After Closing (All Tickets): ${(report.departmentBreakdown['after-closing']?.sales || 0).toFixed(2)} (${report.departmentBreakdown['after-closing']?.orders || 0} orders)`);
    console.log('============================================');

    // Calculate manager sales by department from actual orders
    const managerSalesByDept = {
      candyCounter: 0,
      afterClosing: 0,
      boxOffice: 0
    };
    
    // Get all orders for this date to calculate manager department breakdown
    const reportDateObj = new Date(report.date + 'T12:00:00.000Z');
    const dayOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.timestamp);
      let orderBusinessDate = new Date(orderDate);
      if (orderDate.getHours() < 2) {
        orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
      }
      const orderYear = orderBusinessDate.getFullYear();
      const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
      const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
      const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
      return orderDateStr === report.date;
    });
    
    // Calculate manager sales by department
    dayOrders.forEach((order: any) => {
      const userRole = order.userRole?.toLowerCase();
      if (userRole === 'manager' || userRole === 'admin') {
        if (order.department === 'candy-counter' && !order.isAfterClosing) {
          managerSalesByDept.candyCounter += order.total;
        } else if (order.department === 'candy-counter' && order.isAfterClosing) {
          managerSalesByDept.afterClosing += order.total;
        } else if (order.department === 'box-office') {
          managerSalesByDept.boxOffice += order.total;
        }
      }
    });
    
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
    console.log(`Manager sales by department:`, managerSalesByDept);
    console.log('================================');
    
    reportText += `\n\nMANAGER SALES PERFORMANCE${isTrainingReport ? ' (TRAINING)' : ''}`;
    if (managers.length > 0) {
      reportText += `\n${managers.map((userReport) => {
        const roleText = userReport.userRole ? ` (${userReport.userRole})` : '';
        return `${userReport.userName}${roleText}: ${formatCurrency(userReport.sales)} (${userReport.orders} orders)`;
      }).join('\n')}`;
      
      // Add manager sales breakdown by department
      reportText += `\n\nMANAGER SALES BY DEPARTMENT`;
      if (managerSalesByDept.candyCounter > 0) {
        reportText += `\nCandy Counter Sales: ${formatCurrency(managerSalesByDept.candyCounter)}`;
      }
      if (managerSalesByDept.afterClosing > 0) {
        reportText += `\nAfter Closing Sales: ${formatCurrency(managerSalesByDept.afterClosing)}`;
      }
      if (managerSalesByDept.boxOffice > 0) {
        reportText += `\nBox Office Sales: ${formatCurrency(managerSalesByDept.boxOffice)}`;
      }
      const totalManagerSales = managerSalesByDept.candyCounter + managerSalesByDept.afterClosing + managerSalesByDept.boxOffice;
      if (totalManagerSales > 0) {
        reportText += `\nTotal Manager Sales: ${formatCurrency(totalManagerSales)}`;
      }
    } else {
      reportText += `\nNo manager sales activity recorded for this date`;
    }
    
    reportText += `\n\nOTHER STAFF PERFORMANCE${isTrainingReport ? ' (TRAINING)' : ''}`;
    if (otherStaff.length > 0) {
      reportText += `\n${otherStaff.map((userReport) => {
        const roleText = userReport.userRole ? ` (${userReport.userRole})` : '';
        return `${userReport.userName}${roleText}: ${formatCurrency(userReport.sales)} (${userReport.orders} orders)`;
      }).join('\n')}`;
    } else {
      reportText += `\nNo other staff activity recorded for this date`;
    }
    
    reportText += `\n\nNote: Staff performance includes all sales made by each user including candy counter, box office, and after-closing transactions.${isTrainingReport ? ' (TRAINING DATA)' : ''}`;

    if (isTrainingReport) {
      reportText += `\n\n🎓 TRAINING MODE NOTICE:\nThis report contains practice data only. Training mode sales are not saved to permanent records and will not appear in historical reports. This is for training purposes only.`;
    }

    reportText += `\n\nUSERS LOGGED IN\n${loginsText}\n\nReport generated on ${new Date().toLocaleString()}${isTrainingReport ? ' (TRAINING MODE)' : ''}`;
    
    return reportText;
  }, [user, temporaryUser, getDailyLogins, formatDate, formatCurrency, orders, isTrainingMode, settings.trainingMode]);





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

  const handleUsherAccess = useCallback(() => {
    setShowUsherAccess(true);
  }, []);

  const handleUsherAccessGranted = useCallback((selectedUser: any) => {
    setTemporaryUser(selectedUser);
    setShowUsherAccess(false);
  }, []);

  const handleUsherAccessClose = useCallback(() => {
    setShowUsherAccess(false);
  }, []);

  const handleClearNightlyReport = useCallback(async () => {
    const currentUser = temporaryUser || user;
    if (currentUser?.role !== 'admin') {
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

  // Check if user has access (either through role or temporary access)
  const hasAccess = user?.role === 'manager' || user?.role === 'admin' || temporaryUser;
  const isUsher = user?.role === 'usher';

  if (reportMode === 'aggregated' && isLoadingAggregated) {
    if (!hasAccess) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          {isUsher ? (
            <View style={styles.usherAccessContainer}>
              <Text style={styles.title}>Report Access Required</Text>
              <Text style={styles.subtitle}>Click the button below to access reports</Text>
              <TouchableOpacity style={styles.accessButton} onPress={handleUsherAccess}>
                <Text style={styles.accessButtonText}>Access Reports</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noAccessContainer}>
              <Text style={styles.title}>Access Restricted</Text>
              <Text style={styles.subtitle}>Manager or admin access required</Text>
            </View>
          )}
        </View>
      );
    }
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={TheatreColors.accent} />
          <Text style={[styles.title, { marginTop: 16 }]}>Generating Report...</Text>
          <Text style={styles.subtitle}>Including box office data from all devices</Text>
        </View>
    );
  }

  if (!currentReport) {
    if (!hasAccess) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          {isUsher ? (
            <View style={styles.usherAccessContainer}>
              <Text style={styles.title}>Report Access Required</Text>
              <Text style={styles.subtitle}>Click the button below to access reports</Text>
              <TouchableOpacity style={styles.accessButton} onPress={handleUsherAccess}>
                <Text style={styles.accessButtonText}>Access Reports</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noAccessContainer}>
              <Text style={styles.title}>No Report Available</Text>
              <Text style={styles.subtitle}>Unable to generate report for selected date</Text>
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>No Report Available</Text>
        <Text style={styles.subtitle}>Unable to generate report for selected date</Text>
      </View>
    );
  }

  // Calculate card fees for each department
  const feeRate = currentReport.cardSales > 0 ? currentReport.creditCardFees / currentReport.cardSales : 0;
  const boxOfficeCardFees = (currentReport.paymentBreakdown?.boxOfficeCard || 0) * feeRate;
  const candyCounterCardFees = (currentReport.paymentBreakdown?.candyCounterCard || 0) * feeRate;
  const afterClosingCardFees = (currentReport.paymentBreakdown?.afterClosingCard || 0) * feeRate;

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Training Mode Banner */}
          {(isTrainingMode || settings.trainingMode) && (
            <View style={styles.trainingBanner}>
              <GraduationCap size={24} color={TheatreColors.background} />
              <View style={styles.trainingBannerText}>
                <Text style={styles.trainingBannerTitle}>🎓 Training Mode Active</Text>
                <Text style={styles.trainingBannerSubtitle}>
                  This report shows practice data only. Training sales are not saved to permanent records.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.header}>
            <BarChart3 size={32} color={TheatreColors.accent} />
            <Text style={styles.title}>
              {(isTrainingMode || settings.trainingMode) ? '🎓 Training ' : ''}Nightly Reports
            </Text>
            <Text style={styles.subtitle}>
              {(isTrainingMode || settings.trainingMode) 
                ? 'Practice mode - Local device training analytics and performance data'
                : 'Local device sales analytics and performance data'
              }
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

          {/* Department Performance Overview - Top Section */}
          <View style={[styles.section, (isTrainingMode || settings.trainingMode) && styles.trainingSection]}>
            <Text style={styles.sectionTitle}>
              📊 Department Performance Overview{(isTrainingMode || settings.trainingMode) ? ' 🎓 (Training)' : ''}
            </Text>
            <Text style={styles.sectionDescription}>
              Complete sales breakdown by department showing all staff contributions
              {(isTrainingMode || settings.trainingMode) ? ' (Training Data)' : ''}
            </Text>
            
            {/* Department Performance Grid */}
            <View style={styles.departmentPerformanceGrid}>
              {/* Box Office Performance */}
              {currentReport.departmentBreakdown['box-office'] && currentReport.departmentBreakdown['box-office'].sales > 0 && (
                <View style={styles.departmentPerformanceCard}>
                  <View style={styles.departmentPerformanceHeader}>
                    <Text style={styles.departmentPerformanceName}>🎫 Box Office</Text>
                    <Text style={styles.departmentPerformanceSales}>
                      ${formatCurrency(currentReport.departmentBreakdown['box-office'].sales)}
                    </Text>
                    <Text style={styles.departmentPerformanceOrders}>
                      {currentReport.departmentBreakdown['box-office'].orders} orders
                    </Text>
                    <Text style={styles.departmentPerformanceFees}>
                      Card Fees: ${formatCurrency(boxOfficeCardFees)}
                    </Text>
                  </View>
                  
                  {/* Box Office Staff Breakdown */}
                  {(() => {
                    const dayOrders = filterOrdersByDate(orders, currentReport.date);
                    const boxOfficeUsers = calculateUserSalesByDepartment(dayOrders, 'box-office');
                    
                    const usersList = Array.from(boxOfficeUsers.values())
                      .filter(user => user.sales > 0)
                      .sort((a, b) => b.sales - a.sales);
                    
                    return usersList.length > 0 ? (
                      <View style={styles.departmentStaffList}>
                        <Text style={styles.departmentStaffHeader}>Staff Performance:</Text>
                        {usersList.slice(0, 4).map((user, index) => (
                          <View key={`${user.name}-${user.sales}`} style={styles.departmentStaffRow}>
                            <Text style={[
                              styles.departmentStaffName,
                              user.role?.toLowerCase() === 'manager' || user.role?.toLowerCase() === 'admin' 
                                ? styles.managerStaffText 
                                : styles.regularStaffText
                            ]}>
                              {user.name} ({user.role})
                            </Text>
                            <Text style={styles.departmentStaffSales}>
                              ${formatCurrency(user.sales)}
                            </Text>
                          </View>
                        ))}
                        {usersList.length > 4 && (
                          <Text style={styles.moreStaffText}>
                            +{usersList.length - 4} more staff members
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noStaffText}>No staff activity recorded</Text>
                    );
                  })()}
                </View>
              )}
              
              {/* Candy Counter Performance */}
              <View style={styles.departmentPerformanceCard}>
                <View style={styles.departmentPerformanceHeader}>
                  <Text style={styles.departmentPerformanceName}>🍿 Candy Counter</Text>
                  <Text style={styles.departmentPerformanceSales}>
                    ${formatCurrency(currentReport.departmentBreakdown['candy-counter'].sales)}
                  </Text>
                  <Text style={styles.departmentPerformanceOrders}>
                    {currentReport.departmentBreakdown['candy-counter'].orders} orders
                  </Text>
                  <Text style={styles.departmentPerformanceFees}>
                    Card Fees: ${formatCurrency(candyCounterCardFees)}
                  </Text>
                </View>
                
                {/* Candy Counter Staff Breakdown */}
                {(() => {
                  const dayOrders = filterOrdersByDate(orders, currentReport.date);
                  const candyCounterUsers = calculateUserSalesByDepartment(dayOrders, 'candy-counter', false);
                  
                  const usersList = Array.from(candyCounterUsers.values())
                    .filter(user => user.sales > 0)
                    .sort((a, b) => b.sales - a.sales);
                  
                  return usersList.length > 0 ? (
                    <View style={styles.departmentStaffList}>
                      <Text style={styles.departmentStaffHeader}>Staff Performance:</Text>
                      {usersList.slice(0, 4).map((user, index) => (
                        <View key={`${user.name}-${user.sales}`} style={styles.departmentStaffRow}>
                          <Text style={[
                            styles.departmentStaffName,
                            user.role?.toLowerCase() === 'manager' || user.role?.toLowerCase() === 'admin' 
                              ? styles.managerStaffText 
                              : styles.regularStaffText
                          ]}>
                            {user.name} ({user.role})
                          </Text>
                          <Text style={styles.departmentStaffSales}>
                            ${formatCurrency(user.sales)}
                          </Text>
                        </View>
                      ))}
                      {usersList.length > 4 && (
                        <Text style={styles.moreStaffText}>
                          +{usersList.length - 4} more staff members
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noStaffText}>No staff activity recorded</Text>
                  );
                })()}
              </View>
              
              {/* After Closing Performance */}
              {currentReport.departmentBreakdown['after-closing'] && currentReport.departmentBreakdown['after-closing'].sales > 0 && (
                <View style={styles.departmentPerformanceCard}>
                  <View style={styles.departmentPerformanceHeader}>
                    <Text style={styles.departmentPerformanceName}>🌙 After Closing</Text>
                    <Text style={styles.departmentPerformanceSubtitle}>Ticket Sales Only</Text>
                    <Text style={styles.departmentPerformanceSales}>
                      ${formatCurrency(currentReport.departmentBreakdown['after-closing'].sales)}
                    </Text>
                    <Text style={styles.departmentPerformanceOrders}>
                      {currentReport.departmentBreakdown['after-closing'].orders} orders
                    </Text>
                    <Text style={styles.departmentPerformanceFees}>
                      Card Fees: ${formatCurrency(afterClosingCardFees)}
                    </Text>
                  </View>
                  
                  {/* After Closing Staff Breakdown */}
                  {(() => {
                    const dayOrders = orders.filter((order: any) => {
                      const orderDate = new Date(order.timestamp);
                      let orderBusinessDate = new Date(orderDate);
                      if (orderDate.getHours() < 2) {
                        orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
                      }
                      const orderYear = orderBusinessDate.getFullYear();
                      const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
                      const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
                      const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
                      return orderDateStr === currentReport.date;
                    });
                    
                    const afterClosingUsers = new Map<string, { name: string; role: string; sales: number; orders: number }>();
                    dayOrders
                      .filter((order: any) => order.department === 'candy-counter' && order.isAfterClosing)
                      .forEach((order: any) => {
                        const key = order.userName;
                        const existing = afterClosingUsers.get(key) || { name: order.userName, role: order.userRole || 'staff', sales: 0, orders: 0 };
                        existing.sales += order.total;
                        existing.orders += 1;
                        afterClosingUsers.set(key, existing);
                      });
                    
                    const usersList = Array.from(afterClosingUsers.values())
                      .filter(user => user.sales > 0)
                      .sort((a, b) => b.sales - a.sales);
                    
                    return usersList.length > 0 ? (
                      <View style={styles.departmentStaffList}>
                        <Text style={styles.departmentStaffHeader}>Staff Performance:</Text>
                        {usersList.slice(0, 4).map((user, index) => (
                          <View key={`${user.name}-${user.sales}`} style={styles.departmentStaffRow}>
                            <Text style={[
                              styles.departmentStaffName,
                              user.role?.toLowerCase() === 'manager' || user.role?.toLowerCase() === 'admin' 
                                ? styles.managerStaffText 
                                : styles.regularStaffText
                            ]}>
                              {user.name} ({user.role})
                            </Text>
                            <Text style={styles.departmentStaffSales}>
                              ${formatCurrency(user.sales)}
                            </Text>
                          </View>
                        ))}
                        {usersList.length > 4 && (
                          <Text style={styles.moreStaffText}>
                            +{usersList.length - 4} more staff members
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noStaffText}>No staff activity recorded</Text>
                    );
                  })()}
                </View>
              )}
            </View>
            
            {/* Department Performance Summary */}
            <View style={styles.departmentSummaryRow}>
              <View style={styles.departmentSummaryItem}>
                <Text style={styles.departmentSummaryLabel}>Total Departments Active:</Text>
                <Text style={styles.departmentSummaryValue}>
                  {[
                    currentReport.departmentBreakdown['box-office']?.sales > 0,
                    currentReport.departmentBreakdown['candy-counter']?.sales > 0,
                    currentReport.departmentBreakdown['after-closing']?.sales > 0
                  ].filter(Boolean).length} of 3
                </Text>
              </View>
              <View style={styles.departmentSummaryItem}>
                <Text style={styles.departmentSummaryLabel}>Highest Performing:</Text>
                <Text style={styles.departmentSummaryValue}>
                  {(() => {
                    const depts = [
                      { name: 'Box Office', sales: currentReport.departmentBreakdown['box-office']?.sales || 0 },
                      { name: 'Candy Counter', sales: currentReport.departmentBreakdown['candy-counter']?.sales || 0 },
                      { name: 'After Closing', sales: currentReport.departmentBreakdown['after-closing']?.sales || 0 }
                    ].sort((a, b) => b.sales - a.sales);
                    return depts[0].sales > 0 ? depts[0].name : 'None';
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* Show Performance - Only show if there are show sales */}
          {currentReport.showBreakdown && (() => {
            // Debug logging for show breakdown display
            console.log('=== SHOW BREAKDOWN DISPLAY DEBUG ===');
            console.log('Show breakdown data:', currentReport.showBreakdown);
            Object.entries(currentReport.showBreakdown).forEach(([show, data]) => {
              console.log(`${show}: ${data.sales.toFixed(2)} (${data.orders} orders)`);
            });
            console.log('======================================');
            
            return (
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
            );
          })()}

          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, (isTrainingMode || settings.trainingMode) && styles.trainingSummaryCard]}>
              <DollarSign size={24} color={TheatreColors.success} />
              <Text style={styles.summaryValue}>
                ${formatCurrency(currentReport.totalSales)}
                {(isTrainingMode || settings.trainingMode) && (
                  <Text style={styles.trainingLabel}> 🎓</Text>
                )}
              </Text>
              <Text style={styles.summaryLabel}>
                Total Sales{(isTrainingMode || settings.trainingMode) ? ' (Training)' : ''}
              </Text>
            </View>
            
            <View style={[styles.summaryCard, (isTrainingMode || settings.trainingMode) && styles.trainingSummaryCard]}>
              <Package size={24} color={TheatreColors.primary} />
              <Text style={styles.summaryValue}>
                {currentReport.totalOrders}
                {(isTrainingMode || settings.trainingMode) && (
                  <Text style={styles.trainingLabel}> 🎓</Text>
                )}
              </Text>
              <Text style={styles.summaryLabel}>
                Orders{(isTrainingMode || settings.trainingMode) ? ' (Training)' : ''}
              </Text>
            </View>
            
            <View style={[styles.summaryCard, (isTrainingMode || settings.trainingMode) && styles.trainingSummaryCard]}>
              <CreditCard size={24} color={TheatreColors.accent} />
              <Text style={styles.summaryValue}>
                ${formatCurrency(currentReport.creditCardFees)}
                {(isTrainingMode || settings.trainingMode) && (
                  <Text style={styles.trainingLabel}> 🎓</Text>
                )}
              </Text>
              <Text style={styles.summaryLabel}>
                Card Fees ({settings.creditCardFeePercent}%){(isTrainingMode || settings.trainingMode) ? ' (Training)' : ''}
              </Text>
            </View>
            
            <View style={[styles.summaryCard, (isTrainingMode || settings.trainingMode) && styles.trainingSummaryCard]}>
              <Users size={24} color={TheatreColors.warning} />
              <Text style={styles.summaryValue}>
                {getDailyLogins(selectedDate).length}
                {(isTrainingMode || settings.trainingMode) && (
                  <Text style={styles.trainingLabel}> 🎓</Text>
                )}
              </Text>
              <Text style={styles.summaryLabel}>
                Users Logged In{(isTrainingMode || settings.trainingMode) ? ' (Training)' : ''}
              </Text>
            </View>
          </View>

          {/* Payment Breakdown */}
          <View style={[styles.section, (isTrainingMode || settings.trainingMode) && styles.trainingSection]}>
            <Text style={styles.sectionTitle}>
              Payment Breakdown{(isTrainingMode || settings.trainingMode) ? ' 🎓 (Training)' : ''}
            </Text>
            <View style={styles.paymentBreakdown}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Cash Sales:</Text>
                <Text style={styles.paymentValue}>
                  ${formatCurrency(currentReport.cashSales)}
                  {(isTrainingMode || settings.trainingMode) && (
                    <Text style={styles.trainingIndicator}> 🎓</Text>
                  )}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Card Sales:</Text>
                <Text style={styles.paymentValue}>
                  ${formatCurrency(currentReport.cardSales)}
                  {(isTrainingMode || settings.trainingMode) && (
                    <Text style={styles.trainingIndicator}> 🎓</Text>
                  )}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Sales:</Text>
                <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>
                  ${formatCurrency(currentReport.totalSales)}
                  {(isTrainingMode || settings.trainingMode) && (
                    <Text style={styles.trainingIndicator}> 🎓</Text>
                  )}
                </Text>
              </View>
            </View>
            
            {/* Show Payment Breakdown if shows exist */}
            {currentReport.showBreakdown && (() => {
              const hasShowSales = Object.values(currentReport.showBreakdown).some(show => show.sales > 0);
              if (hasShowSales) {
                return (
                  <View style={styles.showPaymentSection}>
                    <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>Payment by Show</Text>
                    
                    {/* 1st Show */}
                    {currentReport.showBreakdown['1st-show'].sales > 0 && (
                      <View style={styles.showPaymentCard}>
                        <Text style={styles.showPaymentTitle}>1st Show</Text>
                        <View style={styles.paymentBreakdown}>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Cash Sales:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(currentReport.showBreakdown['1st-show'].cashSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Sales:</Text>
                            <Text style={styles.paymentValue}>${formatCurrency(currentReport.showBreakdown['1st-show'].cardSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Fees:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(currentReport.showBreakdown['1st-show'].creditCardFees || 0)}</Text>
                          </View>
                          <View style={[styles.paymentRow, { borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight, paddingTop: 8, marginTop: 8 }]}>
                            <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Sales:</Text>
                            <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>${formatCurrency(currentReport.showBreakdown['1st-show'].sales)}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    
                    {/* 2nd Show */}
                    {currentReport.showBreakdown['2nd-show'].sales > 0 && (
                      <View style={styles.showPaymentCard}>
                        <Text style={styles.showPaymentTitle}>2nd Show</Text>
                        <View style={styles.paymentBreakdown}>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Cash Sales:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(currentReport.showBreakdown['2nd-show'].cashSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Sales:</Text>
                            <Text style={styles.paymentValue}>${formatCurrency(currentReport.showBreakdown['2nd-show'].cardSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Fees:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(currentReport.showBreakdown['2nd-show'].creditCardFees || 0)}</Text>
                          </View>
                          <View style={[styles.paymentRow, { borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight, paddingTop: 8, marginTop: 8 }]}>
                            <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Sales:</Text>
                            <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>${formatCurrency(currentReport.showBreakdown['2nd-show'].sales)}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    
                    {/* Nightly Show */}
                    {currentReport.showBreakdown['nightly-show'].sales > 0 && (
                      <View style={styles.showPaymentCard}>
                        <Text style={styles.showPaymentTitle}>Nightly Show</Text>
                        <View style={styles.paymentBreakdown}>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Cash Sales:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(currentReport.showBreakdown['nightly-show'].cashSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Sales:</Text>
                            <Text style={styles.paymentValue}>${formatCurrency(currentReport.showBreakdown['nightly-show'].cardSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Fees:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(currentReport.showBreakdown['nightly-show'].creditCardFees || 0)}</Text>
                          </View>
                          <View style={[styles.paymentRow, { borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight, paddingTop: 8, marginTop: 8 }]}>
                            <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Sales:</Text>
                            <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>${formatCurrency(currentReport.showBreakdown['nightly-show'].sales)}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    
                    {/* Matinee */}
                    {currentReport.showBreakdown['matinee'].sales > 0 && (
                      <View style={styles.showPaymentCard}>
                        <Text style={styles.showPaymentTitle}>Matinee</Text>
                        <View style={styles.paymentBreakdown}>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Cash Sales:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(currentReport.showBreakdown['matinee'].cashSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Sales:</Text>
                            <Text style={styles.paymentValue}>${formatCurrency(currentReport.showBreakdown['matinee'].cardSales || 0)}</Text>
                          </View>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Card Fees:</Text>
                            <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(currentReport.showBreakdown['matinee'].creditCardFees || 0)}</Text>
                          </View>
                          <View style={[styles.paymentRow, { borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight, paddingTop: 8, marginTop: 8 }]}>
                            <Text style={[styles.paymentLabel, { fontWeight: 'bold' }]}>Total Sales:</Text>
                            <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent }]}>${formatCurrency(currentReport.showBreakdown['matinee'].sales)}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              }
              return null;
            })()}
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
            
            // Calculate box office card fees from actual card sales with verification
            const feeRate = currentReport.cardSales > 0 ? currentReport.creditCardFees / currentReport.cardSales : 0;
            const boxOfficeCardFees = boxOfficeCardSales * feeRate;
            
            // Verify the fee rate is correct (should be 5%)
            const expectedFeeRate = settings.creditCardFeePercent / 100;
            if (Math.abs(feeRate - expectedFeeRate) > 0.001) {
              console.warn(`⚠️ BOX OFFICE FEE RATE MISMATCH: Calculated ${(feeRate * 100).toFixed(4)}% vs Expected ${settings.creditCardFeePercent}%`);
            }
            
            // Calculate manager sales for box office payment breakdown
            const dayOrders = filterOrdersByDate(orders, currentReport.date);
            const { managerCash: managerBoxOfficeCash, managerCard: managerBoxOfficeCard } = 
              calculateManagerSalesByDepartment(dayOrders, 'box-office');
            
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
            
            // Calculate candy counter card fees with verification
            const feeRate = currentReport.cardSales > 0 ? currentReport.creditCardFees / currentReport.cardSales : 0;
            const candyCounterCardFees = candyCounterCardSales * feeRate;
            
            // Verify the fee rate is correct (should be 5%)
            const expectedFeeRate = settings.creditCardFeePercent / 100;
            if (Math.abs(feeRate - expectedFeeRate) > 0.001) {
              console.warn(`⚠️ CANDY COUNTER FEE RATE MISMATCH: Calculated ${(feeRate * 100).toFixed(4)}% vs Expected ${settings.creditCardFeePercent}%`);
            }
            
            // Calculate manager sales for candy counter payment breakdown
            const dayOrders = filterOrdersByDate(orders, currentReport.date);
            const { managerCash: managerCandyCounterCash, managerCard: managerCandyCounterCard } = 
              calculateManagerSalesByDepartment(dayOrders, 'candy-counter', false);
            
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
                    <Text style={styles.paymentLabel}>Candy Counter Card Fees:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(candyCounterCardFees)}</Text>
                  </View>
                  {(managerCandyCounterCash > 0 || managerCandyCounterCard > 0) && (
                    <>
                      <View style={[styles.paymentRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight }]}>
                        <Text style={[styles.paymentLabel, { fontWeight: '600', color: TheatreColors.primary }]}>Manager Candy Counter Cash:</Text>
                        <Text style={[styles.paymentValue, { color: TheatreColors.success, fontWeight: '600' }]}>${formatCurrency(managerCandyCounterCash)}</Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={[styles.paymentLabel, { fontWeight: '600', color: TheatreColors.primary }]}>Manager Candy Counter Card:</Text>
                        <Text style={[styles.paymentValue, { fontWeight: '600' }]}>${formatCurrency(managerCandyCounterCard)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })()}

          {/* After Closing Payment Breakdown */}
          {currentReport.departmentBreakdown['after-closing'] && currentReport.departmentBreakdown['after-closing'].sales > 0 && (() => {
            const afterClosingTotal = currentReport.departmentBreakdown['after-closing'].sales;
            
            // Use actual payment breakdown if available, otherwise calculate proportionally
            let afterClosingCashSales, afterClosingCardSales;
            if (currentReport.paymentBreakdown) {
              afterClosingCashSales = currentReport.paymentBreakdown.afterClosingCash || 0;
              afterClosingCardSales = currentReport.paymentBreakdown.afterClosingCard || 0;
            } else {
              const overallCashRatio = currentReport.totalSales > 0 ? currentReport.cashSales / currentReport.totalSales : 0;
              const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
              afterClosingCashSales = afterClosingTotal * overallCashRatio;
              afterClosingCardSales = afterClosingTotal * overallCardRatio;
            }
            
            // Calculate after closing card fees with enhanced logging
            const feeRate = currentReport.cardSales > 0 ? currentReport.creditCardFees / currentReport.cardSales : 0;
            const afterClosingCardFees = afterClosingCardSales * feeRate;
            
            console.log(`=== AFTER CLOSING CARD FEES CALCULATION (REPORTS) ===`);
            console.log(`Total card sales: ${currentReport.cardSales.toFixed(2)}`);
            console.log(`Total credit card fees: ${currentReport.creditCardFees.toFixed(2)}`);
            console.log(`Calculated fee rate: ${(feeRate * 100).toFixed(4)}%`);
            console.log(`Expected fee rate: ${settings.creditCardFeePercent}%`);
            console.log(`After closing card sales: ${afterClosingCardSales.toFixed(2)}`);
            console.log(`After closing card fees: ${afterClosingCardFees.toFixed(2)}`);
            
            // Verify the 5% fee rate is correct
            const expectedFeeRate = settings.creditCardFeePercent / 100;
            const feeRateDifference = Math.abs(feeRate - expectedFeeRate);
            if (feeRateDifference > 0.001) {
              console.warn(`⚠️ AFTER CLOSING FEE RATE MISMATCH: Calculated ${(feeRate * 100).toFixed(4)}% vs Expected ${settings.creditCardFeePercent}%`);
            } else {
              console.log(`✅ AFTER CLOSING FEE RATE VERIFIED: ${(feeRate * 100).toFixed(2)}% matches expected ${settings.creditCardFeePercent}%`);
            }
            console.log(`=== END AFTER CLOSING FEES (REPORTS) ===`);
            
            // Calculate manager sales for after closing payment breakdown
            const dayOrders = orders.filter((order: any) => {
              const orderDate = new Date(order.timestamp);
              let orderBusinessDate = new Date(orderDate);
              if (orderDate.getHours() < 2) {
                orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
              }
              const orderYear = orderBusinessDate.getFullYear();
              const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
              const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
              const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
              return orderDateStr === currentReport.date;
            });
            
            // Get all manager and usher after closing orders (candy counter tickets)
            const managerAfterClosingOrders = dayOrders.filter((order: any) => {
              const userRole = order.userRole?.toLowerCase();
              return (userRole === 'manager' || userRole === 'admin' || userRole === 'usher') && 
                     order.department === 'candy-counter' && order.isAfterClosing;
            });
            
            console.log(`=== MANAGER/USHER AFTER CLOSING ORDERS DEBUG ===`);
            console.log(`Found ${managerAfterClosingOrders.length} after closing orders by managers/ushers`);
            managerAfterClosingOrders.forEach(order => {
              console.log(`  - ${order.userName} (${order.userRole}): ${order.total.toFixed(2)} [${order.paymentMethod}]`);
            });
            console.log(`=== END MANAGER/USHER DEBUG ===`);
            
            let managerAfterClosingCash = 0;
            let managerAfterClosingCard = 0;
            managerAfterClosingOrders.forEach((order: any) => {
              if (order.paymentMethod === 'cash') {
                managerAfterClosingCash += order.total;
              } else if (order.paymentMethod === 'card') {
                managerAfterClosingCard += order.total;
              }
            });
            
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>After Closing Payment Breakdown</Text>
                <View style={styles.paymentBreakdown}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>After Closing Cash:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.success }]}>${formatCurrency(afterClosingCashSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>After Closing Card:</Text>
                    <Text style={styles.paymentValue}>${formatCurrency(afterClosingCardSales)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>After Closing Card Fees:</Text>
                    <Text style={[styles.paymentValue, { color: TheatreColors.error }]}>${formatCurrency(afterClosingCardFees)}</Text>
                  </View>
                  {(managerAfterClosingCash > 0 || managerAfterClosingCard > 0) && (
                    <>
                      <View style={[styles.paymentRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight }]}>
                        <Text style={[styles.paymentLabel, { fontWeight: '600', color: TheatreColors.primary }]}>Manager/Usher After Closing Cash:</Text>
                        <Text style={[styles.paymentValue, { color: TheatreColors.success, fontWeight: '600' }]}>${formatCurrency(managerAfterClosingCash)}</Text>
                      </View>
                    </>
                  )}
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
                
                const feeRate = currentReport.cardSales > 0 ? currentReport.creditCardFees / currentReport.cardSales : 0;
                
                // Verify the fee rate is exactly 5%
                const expectedFeeRate = settings.creditCardFeePercent / 100;
                if (Math.abs(feeRate - expectedFeeRate) > 0.001) {
                  console.warn(`⚠️ FEES SECTION FEE RATE MISMATCH: Calculated ${(feeRate * 100).toFixed(4)}% vs Expected ${settings.creditCardFeePercent}%`);
                } else {
                  console.log(`✅ FEES SECTION FEE RATE VERIFIED: ${(feeRate * 100).toFixed(2)}% matches expected ${settings.creditCardFeePercent}%`);
                }
                
                if (currentReport.paymentBreakdown) {
                  // Use actual payment breakdown for accurate fee calculation
                  const boxOfficeCardSales = currentReport.paymentBreakdown.boxOfficeCard || 0;
                  const candyCounterCardSales = currentReport.paymentBreakdown.candyCounterCard || 0;
                  const afterClosingCardSales = currentReport.paymentBreakdown.afterClosingCard || 0;
                  
                  boxOfficeCardFees = boxOfficeCardSales * feeRate;
                  candyCounterCardFees = candyCounterCardSales * feeRate;
                  afterClosingCardFees = afterClosingCardSales * feeRate;
                  
                  console.log(`=== FEES SECTION CALCULATION DETAILS ===`);
                  console.log(`Box Office Card Sales: ${boxOfficeCardSales.toFixed(2)} × ${(feeRate * 100).toFixed(2)}% = ${boxOfficeCardFees.toFixed(2)}`);
                  console.log(`Candy Counter Card Sales: ${candyCounterCardSales.toFixed(2)} × ${(feeRate * 100).toFixed(2)}% = ${candyCounterCardFees.toFixed(2)}`);
                  console.log(`After Closing Card Sales: ${afterClosingCardSales.toFixed(2)} × ${(feeRate * 100).toFixed(2)}% = ${afterClosingCardFees.toFixed(2)}`);
                  console.log(`=== END FEES SECTION DETAILS ===`);
                } else {
                  // Fallback calculation using proportional method
                  const overallCardRatio = currentReport.totalSales > 0 ? currentReport.cardSales / currentReport.totalSales : 0;
                  const boxOfficeCardSales = boxOfficeTotal * overallCardRatio;
                  const candyCounterCardSales = candyCounterTotal * overallCardRatio;
                  const afterClosingCardSales = afterClosingTotal * overallCardRatio;
                  
                  boxOfficeCardFees = boxOfficeCardSales * feeRate;
                  candyCounterCardFees = candyCounterCardSales * feeRate;
                  afterClosingCardFees = afterClosingCardSales * feeRate;
                  
                  console.log(`=== FEES SECTION FALLBACK CALCULATION ===`);
                  console.log(`Using proportional method with ${(feeRate * 100).toFixed(2)}% fee rate`);
                  console.log(`=== END FEES SECTION FALLBACK ===`);
                }
                
                // Use the actual total fees from the report
                const calculatedTotalFees = currentReport.creditCardFees;
                
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
                        <Text style={styles.paymentValue}>${formatCurrency(candyCounterCardFees)}</Text>
                      </View>
                    )}
                    {afterClosingTotal > 0 && (
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>After Closing Fees:</Text>
                        <Text style={styles.paymentValue}>${formatCurrency(afterClosingCardFees)}</Text>
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



          {/* Manager Sales Performance */}
          <View style={[styles.section, (isTrainingMode || settings.trainingMode) && styles.trainingSection]}>
            <Text style={styles.sectionTitle}>
              Manager Sales Performance{(isTrainingMode || settings.trainingMode) ? ' 🎓 (Training)' : ''}
            </Text>
            <Text style={styles.sectionDescription}>
              Managers and admins - includes all sales transactions
              {(isTrainingMode || settings.trainingMode) ? ' (Training Data)' : ''}
            </Text>
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
                  <Text style={styles.emptyStateText}>No manager sales activity recorded for this date</Text>
                  <Text style={styles.emptyStateSubtext}>Manager performance will appear here when managers process orders</Text>
                </View>
              );
            })()}
          </View>

          {/* Manager Sales by Department */}
          {(() => {
            const managers = currentReport.userBreakdown?.filter(user => {
              const role = user.userRole?.toLowerCase();
              return role === 'manager' || role === 'admin';
            }) || [];
            
            if (managers.length === 0) return null;
            
            // Calculate manager sales by department from actual orders
            const managerSalesByDept = {
              candyCounter: 0,
              afterClosing: 0,
              boxOffice: 0
            };
            
            // Get all orders for this date to calculate manager department breakdown
            const dayOrders = orders.filter((order: any) => {
              const orderDate = new Date(order.timestamp);
              let orderBusinessDate = new Date(orderDate);
              if (orderDate.getHours() < 2) {
                orderBusinessDate.setDate(orderBusinessDate.getDate() - 1);
              }
              const orderYear = orderBusinessDate.getFullYear();
              const orderMonth = String(orderBusinessDate.getMonth() + 1).padStart(2, '0');
              const orderDay = String(orderBusinessDate.getDate()).padStart(2, '0');
              const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
              return orderDateStr === currentReport.date;
            });
            
            // Calculate manager sales by department
            dayOrders.forEach((order: any) => {
              const userRole = order.userRole?.toLowerCase();
              if (userRole === 'manager' || userRole === 'admin') {
                if (order.department === 'candy-counter' && !order.isAfterClosing) {
                  managerSalesByDept.candyCounter += order.total;
                } else if (order.department === 'candy-counter' && order.isAfterClosing) {
                  managerSalesByDept.afterClosing += order.total;
                } else if (order.department === 'box-office') {
                  managerSalesByDept.boxOffice += order.total;
                }
              }
            });
            
            const totalManagerSales = managerSalesByDept.candyCounter + managerSalesByDept.afterClosing + managerSalesByDept.boxOffice;
            
            if (totalManagerSales === 0) return null;
            
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manager Sales by Department</Text>
                <Text style={styles.sectionDescription}>Manager sales breakdown by candy counter and after closing</Text>
                <View style={styles.departmentGrid}>
                  {managerSalesByDept.candyCounter > 0 && (
                    <View style={styles.departmentCard}>
                      <Text style={styles.departmentName}>Candy Counter</Text>
                      <Text style={styles.departmentSubtitle}>Manager Sales</Text>
                      <Text style={styles.departmentSales}>
                        ${formatCurrency(managerSalesByDept.candyCounter)}
                      </Text>
                      <Text style={styles.departmentOrders}>
                        Manager concession sales
                      </Text>
                    </View>
                  )}
                  
                  {managerSalesByDept.afterClosing > 0 && (
                    <View style={styles.departmentCard}>
                      <Text style={styles.departmentName}>After Closing</Text>
                      <Text style={styles.departmentSubtitle}>Manager Sales</Text>
                      <Text style={styles.departmentSales}>
                        ${formatCurrency(managerSalesByDept.afterClosing)}
                      </Text>
                      <Text style={styles.departmentOrders}>
                        Manager ticket sales
                      </Text>
                    </View>
                  )}
                  
                  {managerSalesByDept.boxOffice > 0 && (
                    <View style={styles.departmentCard}>
                      <Text style={styles.departmentName}>Box Office</Text>
                      <Text style={styles.departmentSubtitle}>Manager Sales</Text>
                      <Text style={styles.departmentSales}>
                        ${formatCurrency(managerSalesByDept.boxOffice)}
                      </Text>
                      <Text style={styles.departmentOrders}>
                        Manager box office sales
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={[styles.paymentRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: TheatreColors.surfaceLight }]}>
                  <Text style={[styles.paymentLabel, { fontWeight: 'bold', fontSize: 16 }]}>Total Manager Sales:</Text>
                  <Text style={[styles.paymentValue, { fontWeight: 'bold', color: TheatreColors.accent, fontSize: 18 }]}>${formatCurrency(totalManagerSales)}</Text>
                </View>
              </View>
            );
          })()}

          {/* Other Staff Performance */}
          <View style={[styles.section, (isTrainingMode || settings.trainingMode) && styles.trainingSection]}>
            <Text style={styles.sectionTitle}>
              Other Staff Performance{(isTrainingMode || settings.trainingMode) ? ' 🎓 (Training)' : ''}
            </Text>
            <Text style={styles.sectionDescription}>
              Staff and ushers - includes all sales transactions
              {(isTrainingMode || settings.trainingMode) ? ' (Training Data)' : ''}
            </Text>
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
          <View style={[styles.section, (isTrainingMode || settings.trainingMode) && styles.trainingSection]}>
            <Text style={styles.sectionTitle}>
              Users Logged In Today{(isTrainingMode || settings.trainingMode) ? ' 🎓 (Training)' : ''}
            </Text>
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
              {(isTrainingMode || settings.trainingMode) && (
                <Text style={styles.trainingFooterText}> • 🎓 Training Mode</Text>
              )}
            </Text>
            {(isTrainingMode || settings.trainingMode) && (
              <Text style={styles.trainingFooterNotice}>
                This report contains practice data only and is not saved to permanent records.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Usher Report Access Modal */}
      <UsherReportAccess
        visible={showUsherAccess}
        onClose={handleUsherAccessClose}
        onAccessGranted={handleUsherAccessGranted}
      />
    </>
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
  showPaymentSection: {
    marginTop: 16,
  },
  showPaymentCard: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  showPaymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  userListContainer: {
    marginTop: 8,
  },
  managerUserText: {
    color: TheatreColors.primary,
    fontWeight: '500',
    fontSize: 11,
  },
  staffUserText: {
    color: TheatreColors.accent,
    fontWeight: '500',
    fontSize: 11,
  },
  moreUsersText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: TheatreColors.textSecondary,
  },
  trainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.warning,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  trainingBannerText: {
    flex: 1,
  },
  trainingBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
    marginBottom: 4,
  },
  trainingBannerSubtitle: {
    fontSize: 14,
    color: TheatreColors.background,
    opacity: 0.9,
  },
  trainingSummaryCard: {
    borderWidth: 2,
    borderColor: TheatreColors.warning,
    backgroundColor: TheatreColors.surface,
  },
  trainingSection: {
    borderWidth: 1,
    borderColor: TheatreColors.warning,
    backgroundColor: TheatreColors.surface,
  },
  trainingLabel: {
    fontSize: 14,
    color: TheatreColors.warning,
  },
  trainingIndicator: {
    fontSize: 12,
    color: TheatreColors.warning,
  },
  trainingFooterText: {
    fontSize: 12,
    color: TheatreColors.warning,
    fontWeight: '600',
  },
  trainingFooterNotice: {
    fontSize: 11,
    color: TheatreColors.warning,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Department Performance Overview Styles
  departmentPerformanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  departmentPerformanceCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
  },
  departmentPerformanceHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  departmentPerformanceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  departmentPerformanceSubtitle: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  departmentPerformanceSales: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    marginBottom: 4,
    textAlign: 'center',
  },
  departmentPerformanceOrders: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  departmentPerformanceFees: {
    fontSize: 12,
    color: TheatreColors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  departmentStaffList: {
    gap: 6,
  },
  departmentStaffHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  departmentStaffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
  },
  departmentStaffName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  departmentStaffSales: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  managerStaffText: {
    color: TheatreColors.primary,
  },
  regularStaffText: {
    color: TheatreColors.text,
  },
  moreStaffText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  noStaffText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  departmentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  departmentSummaryItem: {
    alignItems: 'center',
  },
  departmentSummaryLabel: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  departmentSummaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.accent,
    textAlign: 'center',
  },
  usherAccessContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noAccessContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  accessButton: {
    backgroundColor: TheatreColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  accessButtonText: {
    color: TheatreColors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});