import { Tabs } from "expo-router";
import { ShoppingCart, Package, Receipt, Settings, BarChart3 } from "lucide-react-native";
import React from "react";
import { TheatreColors } from "@/constants/theatre-colors";
import { TabletUtils } from "@/constants/tablet-utils";
import { POSProvider } from "@/hooks/pos-store";
import { useAuth } from "@/hooks/auth-store";
import { UserProfile } from "@/components/UserProfile";

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
          headerRight: () => <UserProfile compact showLogout />,
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