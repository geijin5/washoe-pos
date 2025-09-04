import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Product } from '@/types/pos';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';
import { Star } from 'lucide-react-native';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ProductCard({ product, onPress, onLongPress }: ProductCardProps) {
  // Get product image - prioritize custom image, then regular image, then fallback
  const getProductImage = (product: Product) => {
    // First priority: custom uploaded image
    if (product.customImage) {
      return product.customImage;
    }
    
    // Second priority: regular image URL
    if (product.image) {
      return product.image;
    }
    
    // Fallback to predefined images based on product name
    const imageMap: { [key: string]: string } = {
      'Tuskegee': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
      'Sorting Cube': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
      'Samsung-40': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop',
      'Shoe-Puma2': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
      'Panasonic-65': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop',
      'Ring-DBERSC': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
      'Ring-DSER': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
      'Treat Ball': 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=200&fit=crop',
      'Tot Tutors BR': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
      'Tea set': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&h=200&fit=crop',
      'Shoe-Nike': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
      'Sassy FSB': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
      'Ring-SCLDR': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
      'Ring-RDSR': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
      'NOW 41': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    };
    
    return imageMap[product.name] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop';
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: getProductImage(product) }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {product.isPopular && (
          <View style={styles.popularBadge}>
            <Star size={12} color={TheatreColors.background} fill={TheatreColors.background} />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    aspectRatio: 1,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    flex: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: TheatreColors.accent,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: TabletUtils.getResponsivePadding(8, 12),
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  name: {
    fontSize: TabletUtils.getResponsiveFontSize(12, 14),
    fontWeight: '600',
    color: TheatreColors.background,
    textAlign: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
});