import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { TabletUtils } from '@/constants/tablet-utils';

export function useTabletLayout() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [isTablet, setIsTablet] = useState(() => TabletUtils.isTablet());
  const [isLandscape, setIsLandscape] = useState(() => TabletUtils.isLandscape());
  const [isFoldable, setIsFoldable] = useState(() => TabletUtils.isFoldable());
  const [foldableState, setFoldableState] = useState(() => TabletUtils.getFoldableState());
  const [deviceType, setDeviceType] = useState(() => TabletUtils.getDeviceType());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setIsTablet(TabletUtils.isTablet());
      setIsLandscape(TabletUtils.isLandscape());
      setIsFoldable(TabletUtils.isFoldable());
      setFoldableState(TabletUtils.getFoldableState());
      setDeviceType(TabletUtils.getDeviceType());
    });

    return () => subscription?.remove();
  }, []);

  return {
    dimensions,
    isTablet,
    isLandscape,
    isFoldable,
    foldableState,
    deviceType,
    getProductGridColumns: () => {
      return TabletUtils.getProductGridColumns();
    },
    getCartWidth: () => {
      return TabletUtils.getCartWidth();
    },
    getResponsivePadding: (phonePadding: number, tabletPadding: number, desktopPadding?: number, foldablePadding?: number) => {
      return TabletUtils.getResponsivePadding(phonePadding, tabletPadding, desktopPadding, foldablePadding);
    },
    getResponsiveFontSize: (phoneFontSize: number, tabletFontSize: number, desktopFontSize?: number, foldableFontSize?: number) => {
      return TabletUtils.getResponsiveFontSize(phoneFontSize, tabletFontSize, desktopFontSize, foldableFontSize);
    },
    getResponsiveColumns: (phoneColumns: number, tabletColumns: number, desktopColumns?: number, foldableColumns?: number) => {
      return TabletUtils.getResponsiveColumns(phoneColumns, tabletColumns, desktopColumns, foldableColumns);
    },
  };
}