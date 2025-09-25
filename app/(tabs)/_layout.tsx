import { Tabs } from "expo-router";
import { ShoppingCart, Package, Receipt, Settings, BarChart3, GraduationCap } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TheatreColors } from "@/constants/theatre-colors";
import { TabletUtils } from "@/constants/tablet-utils";
import { POSProvider, usePOS } from "@/hooks/pos-store";
import { useAuth } from "@/hooks/auth-store";
import { UserProfile } from "@/components/UserProfile";

function TrainingModeIndicator() {
  const { settings } = usePOS();
  const { isTrainingMode } = useAuth();
  
  if (!isTrainingMode && !settings.trainingMode) return null;
  
  return (
    <View style={styles.trainingIndicator}>
      <GraduationCap size={16} color={TheatreColors.background} />
      <Text style={styles.trainingText}>TRAINING MODE</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { hasPermission } = useAuth();

  return (
    <POSProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: TheatreColors.accent,
          tabBarInactiveTintColor: TheatreColors.textSecondary,
          tabBarStyle: {
            backgroundColor: TheatreColors.surface,
            borderTopColor: TheatreColors.surfaceLight,
            height: TabletUtils.getResponsivePadding(60, 80),
            paddingBottom: TabletUtils.getResponsivePadding(8, 12),
            paddingTop: TabletUtils.getResponsivePadding(8, 12),
          },
          tabBarLabelStyle: {
            fontSize: TabletUtils.getResponsiveFontSize(12, 14),
            fontWeight: '600',
          },
          tabBarIconStyle: {
            marginBottom: TabletUtils.getResponsivePadding(2, 4),
          },
          headerStyle: {
            backgroundColor: TheatreColors.surface,
            height: TabletUtils.getResponsivePadding(90, 110),
          },
          headerTitleStyle: {
            fontSize: TabletUtils.getResponsiveFontSize(18, 22),
            fontWeight: 'bold',
          },
          headerTintColor: TheatreColors.text,
          headerRight: () => (
            <View style={styles.headerRight}>
              <TrainingModeIndicator />
              <UserProfile compact showLogout />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="pos"
          options={{
            title: "POS",
            tabBarIcon: ({ color }) => <ShoppingCart size={TabletUtils.getResponsiveFontSize(24, 28)} color={color} />,
            headerTitle: "Washoe Point of Sale",
          }}
        />
        {hasPermission('canManageProducts') && (
          <Tabs.Screen
            name="products"
            options={{
              title: "Products",
              tabBarIcon: ({ color }) => <Package size={TabletUtils.getResponsiveFontSize(24, 28)} color={color} />,
              headerTitle: "Manage Products",
            }}
          />
        )}
        {hasPermission('canViewOrders') && (
          <Tabs.Screen
            name="orders"
            options={{
              title: "Orders",
              tabBarIcon: ({ color }) => <Receipt size={TabletUtils.getResponsiveFontSize(24, 28)} color={color} />,
              headerTitle: "Order History",
            }}
          />
        )}
        {hasPermission('canManageSettings') && (
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ color }) => <Settings size={TabletUtils.getResponsiveFontSize(24, 28)} color={color} />,
              headerTitle: "System Settings",
            }}
          />
        )}
        {hasPermission('canViewReports') && (
          <Tabs.Screen
            name="reports"
            options={{
              title: "Reports",
              tabBarIcon: ({ color }) => <BarChart3 size={TabletUtils.getResponsiveFontSize(24, 28)} color={color} />,
              headerTitle: "Nightly Reports",
            }}
          />
        )}
      </Tabs>
    </POSProvider>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trainingText: {
    color: TheatreColors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
});