import { useEffect, useRef, useState } from 'react';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerSelectionHaptic } from './haptics';

interface EdgeSwipeOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeThreshold?: number; // Distance in px from left edge to qualify as edge swipe
  minSwipeDistance?: number; // Minimum horizontal distance in px to trigger back
}

/**
 * Hook to support modern Android & iOS edge-swipe from left to navigate back.
 */
export function useEdgeSwipeBack({
  onBack,
  enabled = true,
  edgeThreshold = 35,
  minSwipeDistance = 60,
}: EdgeSwipeOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isEdgeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (touch.clientX <= edgeThreshold) {
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        isEdgeRef.current = true;
      } else {
        isEdgeRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeRef.current || startXRef.current === null || startYRef.current === null) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      // If user is mostly scrolling vertically, abort edge swipe
      if (deltaY > 50 && deltaX < 30) {
        isEdgeRef.current = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeRef.current || startXRef.current === null || startYRef.current === null) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      if (deltaX >= minSwipeDistance && deltaY < deltaX * 0.8) {
        triggerMediumHaptic();
        onBack();
      }

      startXRef.current = null;
      startYRef.current = null;
      isEdgeRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onBack, edgeThreshold, minSwipeDistance]);
}

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number;
}

/**
 * Hook for pull-to-refresh on mobile with tactile haptic feedback.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 70,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const hasHapticFiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || isRefreshing) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        hasHapticFiredRef.current = false;
      } else {
        startYRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      if (distance > 0 && window.scrollY <= 0) {
        // Apply friction dampening curve
        const dampened = Math.min(distance * 0.45, 120);
        setPullDistance(dampened);

        if (dampened >= threshold && !hasHapticFiredRef.current) {
          triggerSelectionHaptic();
          hasHapticFiredRef.current = true;
        } else if (dampened < threshold && hasHapticFiredRef.current) {
          hasHapticFiredRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (startYRef.current === null) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerLightHaptic();
        try {
          await onRefresh();
          triggerSuccessHaptic();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
      hasHapticFiredRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, pullDistance, isRefreshing]);

  return { pullDistance, isRefreshing };
}
