import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Triggers a light vibration / touch haptic for button clicks, toggles, and UI interactions.
 */
export async function triggerLightHaptic(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Ignored if browser blocks
      }
    }
  }
}

/**
 * Triggers a medium vibration for swipe thresholds, drag releases, and modal openings.
 */
export async function triggerMediumHaptic(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (e) {}
    }
  }
}

/**
 * Triggers a heavy tactile bump for critical actions (e.g. deletion, reset).
 */
export async function triggerHeavyHaptic(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch (e) {}
    }
  }
}

/**
 * Triggers a crisp selection tick (for picking items, tab switching, gesture navigation).
 */
export async function triggerSelectionHaptic(): Promise<void> {
  try {
    await Haptics.selectionChanged();
  } catch (error) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch (e) {}
      }
    }
  }
}

/**
 * Triggers a success notification pattern for completed actions (dose logged, saved, synced).
 */
export async function triggerSuccessHaptic(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 50, 80]);
      } catch (e) {}
    }
  }
}

/**
 * Triggers a warning pattern for expiring medicines or low stock.
 */
export async function triggerWarningHaptic(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch (e) {}
    }
  }
}

/**
 * Triggers an error pattern for failures or invalid input.
 */
export async function triggerErrorHaptic(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 50, 80, 50, 100]);
      } catch (e) {}
    }
  }
}

/**
 * Direct vibration pattern on the user's mobile device.
 */
export async function triggerDeviceVibration(pattern: number | number[] = 20): Promise<void> {
  try {
    if (typeof pattern === 'number') {
      await Haptics.vibrate({ duration: pattern });
    } else {
      await Haptics.vibrate({ duration: pattern[0] || 40 });
    }
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
}
