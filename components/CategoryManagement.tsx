import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { X, Plus, Trash2, Tag } from 'lucide-react-native';
import { Category } from '@/types/pos';

interface CategoryManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function CategoryManagement({ visible, onClose }: CategoryManagementProps) {
  const { availableCategories, addCategory, removeCategory } = usePOS();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-') as Category;
    
    if (availableCategories.includes(categoryId)) {
      Alert.alert('Error', 'This category already exists');
      return;
    }

    try {
      setIsLoading(true);
      await addCategory(categoryId);
      setNewCategoryName('');
      Alert.alert('Success', 'Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCategory = async (category: Category) => {
    if (availableCategories.length <= 1) {
      Alert.alert('Error', 'You must have at least one category');
      return;
    }

    Alert.alert(
      'Remove Category',
      `Are you sure you want to remove "${category}"? Products in this category will be moved to "${availableCategories.filter(c => c !== category)[0]}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await removeCategory(category);
              Alert.alert('Success', 'Category removed successfully!');
            } catch (error) {
              console.error('Error removing category:', error);
              Alert.alert('Error', 'Failed to remove category. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Tag size={24} color={TheatreColors.accent} />
            <Text style={styles.title}>Category Management</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={TheatreColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add New Category</Text>
            <Text style={styles.sectionDescription}>
              Create custom categories to organize your products
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Enter category name (e.g., Snacks, Drinks)"
                placeholderTextColor={TheatreColors.textSecondary}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.addButton, isLoading && styles.addButtonDisabled]}
                onPress={handleAddCategory}
                disabled={isLoading}
              >
                <Plus size={20} color={TheatreColors.background} />
                <Text style={styles.addButtonText}>
                  {isLoading ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Categories</Text>
            <Text style={styles.sectionDescription}>
              Manage your existing product categories
            </Text>
            
            <View style={styles.categoriesList}>
              {availableCategories.map((category) => (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Tag size={20} color={TheatreColors.accent} />
                    <Text style={styles.categoryName}>
                      {formatCategoryName(category)}
                    </Text>
                  </View>
                  
                  {availableCategories.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveCategory(category)}
                      disabled={isLoading}
                    >
                      <Trash2 size={18} color={TheatreColors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Important Notes</Text>
            <Text style={styles.infoText}>
              • You must have at least one category{"\n"}
              • Removing a category will move its products to the first available category{"\n"}
              • Category names are automatically formatted for consistency
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TheatreColors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.success,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  removeButton: {
    padding: 8,
  },
  infoSection: {
    backgroundColor: TheatreColors.surfaceLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    lineHeight: 20,
  },
});