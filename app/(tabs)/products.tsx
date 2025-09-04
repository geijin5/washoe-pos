import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { useAuth } from '@/hooks/auth-store';
import { Product, Category } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { Plus, Edit2, Trash2, X, Save, Camera, Image as ImageIcon } from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

export default function ProductsScreen() {
  return (
    <RoleGuard requiredPermission="canManageProducts">
      <ProductsContent />
    </RoleGuard>
  );
}

function ProductsContent() {
  const { products, addProduct, updateProduct, deleteProduct } = usePOS();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'tickets' as Category,
    description: '',
    isPopular: false,
    customImage: '',
  });

  const categories: Category[] = ['tickets', 'concessions', 'beverages', 'merchandise'];
  const isAdmin = user?.role === 'admin';

  const pickImage = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can upload custom images.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const imageUri = `data:image/jpeg;base64,${asset.base64}`;
          setFormData({ ...formData, customImage: imageUri });
          
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can upload custom images.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const imageUri = `data:image/jpeg;base64,${asset.base64}`;
          setFormData({ ...formData, customImage: imageUri });
          
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeImage = () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can modify custom images.');
      return;
    }
    setFormData({ ...formData, customImage: '' });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: 'tickets',
      description: '',
      isPopular: false,
      customImage: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      description: product.description || '',
      isPopular: product.isPopular || false,
      customImage: product.customImage || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      description: formData.description || undefined,
      isPopular: formData.isPopular,
      customImage: formData.customImage || undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setModalVisible(false);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteProduct(product.id);
            if (Platform.OS !== 'web') {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const categoryColor = TheatreColors.categoryColors[item.category];

    return (
      <View style={styles.productItem}>
        <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
        <View style={styles.productInfo}>
          <View style={styles.productNameRow}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.customImage && (
              <View style={styles.customImageBadge}>
                <ImageIcon size={12} color={TheatreColors.accent} />
              </View>
            )}
          </View>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Edit2 size={20} color={TheatreColors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={20} color={TheatreColors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptySubtext}>Add your first product to get started</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Plus size={28} color={TheatreColors.background} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={TheatreColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Product name"
                placeholderTextColor={TheatreColors.textSecondary}
              />

              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                placeholderTextColor={TheatreColors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryButtons}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      formData.category === cat && {
                        backgroundColor: TheatreColors.categoryColors[cat],
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Optional description"
                placeholderTextColor={TheatreColors.textSecondary}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.popularToggle}
                onPress={() => setFormData({ ...formData, isPopular: !formData.isPopular })}
              >
                <View
                  style={[
                    styles.checkbox,
                    formData.isPopular && styles.checkboxChecked,
                  ]}
                />
                <Text style={styles.popularText}>Mark as popular item</Text>
              </TouchableOpacity>

              {isAdmin && (
                <>
                  <Text style={styles.label}>Custom Image</Text>
                  {formData.customImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: formData.customImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                        <X size={16} color={TheatreColors.background} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imageUploadContainer}>
                      <Text style={styles.imageUploadText}>No custom image selected</Text>
                    </View>
                  )}
                  <View style={styles.imageButtonsContainer}>
                    <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                      <ImageIcon size={20} color={TheatreColors.accent} />
                      <Text style={styles.imageButtonText}>Choose Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                      <Camera size={20} color={TheatreColors.accent} />
                      <Text style={styles.imageButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.imageHelpText}>Only administrators can upload custom images</Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Save size={20} color={TheatreColors.background} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryIndicator: {
    width: 4,
  },
  productInfo: {
    flex: 1,
    padding: 16,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    flex: 1,
  },
  customImageBadge: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  productCategory: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TheatreColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: TheatreColors.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TheatreColors.surface,
  },
  categoryButtonText: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textTransform: 'capitalize',
  },
  categoryButtonTextActive: {
    color: TheatreColors.background,
    fontWeight: '600',
  },
  popularToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: TheatreColors.textSecondary,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
  },
  popularText: {
    fontSize: 16,
    color: TheatreColors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: TheatreColors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  saveButton: {
    backgroundColor: TheatreColors.accent,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: TheatreColors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadContainer: {
    height: 120,
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: TheatreColors.textSecondary,
    borderStyle: 'dashed',
  },
  imageUploadText: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.accent,
  },
  imageHelpText: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
});