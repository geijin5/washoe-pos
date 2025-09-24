import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { Category } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';
import { usePOS } from '@/hooks/pos-store';
import * as Haptics from 'expo-haptics';

type Department = 'box-office' | 'candy-counter' | null;

interface CategoryFilterProps {
  selected: Category | 'all' | 'candy-counter-sales' | 'after-closing-tickets';
  onSelect: (category: Category | 'all' | 'candy-counter-sales' | 'after-closing-tickets') => void;
  selectedDepartment?: Department;
}

const formatCategoryName = (category: string) => {
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
};

export function CategoryFilter({ selected, onSelect, selectedDepartment }: CategoryFilterProps) {
  const { availableCategories, getCategoryMetadata } = usePOS();
  
  // Force re-render when categories change
  React.useEffect(() => {
    console.log('CategoryFilter: Available categories changed:', availableCategories);
  }, [availableCategories]);
  
  const categories = useMemo(() => {
    console.log('CategoryFilter: Rebuilding categories list. Available categories:', availableCategories);
    const categoryOptions: { value: Category | 'all' | 'candy-counter-sales' | 'after-closing-tickets'; label: string }[] = [];
    
    // For box office: show "All" and custom categories marked as box office tickets
    if (selectedDepartment === 'box-office') {
      categoryOptions.push(
        { value: 'all', label: 'All' }
      );
      
      // Add custom categories that are marked as box office tickets
      availableCategories.forEach(category => {
        if (category !== 'box-office-tickets') {
          const metadata = getCategoryMetadata(category);
          if (metadata?.isBoxOfficeTicket === true) {
            categoryOptions.push({
              value: category,
              label: formatCategoryName(category),
            });
          }
        }
      });
      
      console.log('CategoryFilter: Box office mode - showing All and custom box office categories:', categoryOptions);
      return categoryOptions;
    }
    
    // For candy counter: show all categories except the special buttons
    categoryOptions.push({ value: 'all', label: 'All' });
    
    // Always use availableCategories from the store - this ensures real-time updates
    const categoriesToShow = availableCategories && availableCategories.length > 0 
      ? availableCategories 
      : ['after-closing-tickets', 'concessions', 'beverages', 'merchandise'] as Category[];
    
    console.log('CategoryFilter: Categories to show:', categoriesToShow);
    
    categoriesToShow.forEach(category => {
      categoryOptions.push({
        value: category,
        label: formatCategoryName(category),
      });
    });
    
    console.log('CategoryFilter: Final category options:', categoryOptions);
    return categoryOptions;
  }, [availableCategories, selectedDepartment, getCategoryMetadata]);
  
  const handleCategoryPress = async (category: Category | 'all' | 'candy-counter-sales' | 'after-closing-tickets') => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(category);
  };
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {categories.map(category => {
        const isSelected = selected === category.value;
        const categoryColor = category.value === 'all' 
          ? TheatreColors.accent 
          : category.value === 'candy-counter-sales'
          ? TheatreColors.success
          : category.value === 'after-closing-tickets'
          ? TheatreColors.warning
          : TheatreColors.categoryColors[category.value as Category] || TheatreColors.accent;

        return (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.chip,
              isSelected && { 
                backgroundColor: categoryColor,
                borderColor: categoryColor,
                shadowOpacity: 0.25,
                elevation: 8,
                transform: [{ scale: 1.02 }],
              }
            ]}
            onPress={() => handleCategoryPress(category.value)}
            activeOpacity={0.8}
            testID={`category-filter-${category.value}`}
          >
            <Text style={[
              styles.chipText,
              isSelected && styles.chipTextSelected
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: TabletUtils.getResponsivePadding(12, 16),
    maxHeight: TabletUtils.getResponsivePadding(80, 100),
  },
  content: {
    paddingHorizontal: TabletUtils.getResponsivePadding(16, 24),
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: TabletUtils.getResponsivePadding(8, 12),
  },
  chip: {
    paddingHorizontal: TabletUtils.getResponsivePadding(18, 24),
    paddingVertical: TabletUtils.getResponsivePadding(10, 14),
    borderRadius: TabletUtils.getResponsivePadding(20, 25),
    backgroundColor: TheatreColors.surface,
    minHeight: TabletUtils.getMinTouchTarget(),
    minWidth: TabletUtils.getResponsivePadding(80, 100),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: TheatreColors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginRight: TabletUtils.getResponsivePadding(8, 12),
    // Ensure consistent sizing
    flexShrink: 0,
  },
  chipText: {
    fontSize: TabletUtils.getResponsiveFontSize(13, 15),
    fontWeight: '600',
    color: TheatreColors.text,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: TheatreColors.background,
    fontWeight: 'bold',
  },
});