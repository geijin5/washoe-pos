import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { TabletUtils } from '@/constants/tablet-utils';

export function useTabletLayout() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [isTablet, setIsTablet] = useState(() => TabletUtils.isTablet());
  const [isLandscape, setIsLandscape] = useState(() => TabletUtils.isLandscape());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setIsTablet(TabletUtils.isTablet());
      setIsLandscape(TabletUtils.isLandscape());
    });

    return () => subscription?.remove();
  }, []);

  return {
    dimensions,
    isTablet,
    isLandscape,
    getProductGridColumns: () => {
      if (!isTablet) return 2;
      return isLandscape ? 4 : 3;
    },
    getCartWidth: () => {
      if (!isTablet) return '100%';
      return isLandscape ? '40%' : '50%';
    },
    getResponsivePadding: (phonePadding: number, tabletPadding: number) => {
      return isTablet ? tabletPadding : phonePadding;
    },
    getResponsiveFontSize: (phoneFontSize: number, tabletFontSize: number) => {
      return isTablet ? tabletFontSize : phoneFontSize;
    },
  };
}