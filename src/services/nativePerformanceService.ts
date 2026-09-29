import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';

interface PerformanceOptions {
  /**
   * Return true if a modal, drawer, or search state was consumed/closed.
   * Return false if the user is on the main screen and back press can exit/minimize.
   */
  handleBackButton?: () => boolean;
}

let isPerformanceInitialized = false;

/**
 * Initializes native Android performance features:
 * - Hides splash screen cleanly without white flashes
 * - Sets status bar theme and background
 * - Configures keyboard resize to prevent UI jumping/lag
 * - Configures Android hardware back button for silky smooth navigation
 */
export async function initNativePerformance(options: PerformanceOptions = {}): Promise<() => void> {
  if (isPerformanceInitialized) {
    return () => {};
  }
  isPerformanceInitialized = true;

  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  try {
    // 1. Configure Status Bar
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0f9d58' });
  } catch (e) {
    // Non-fatal on web/older android
  }

  try {
    // 2. Configure Keyboard mode: body resize prevents jerky layout shifts
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (e) {
    // Non-fatal
  }

  // 3. Gracefully hide splash screen after first render
  setTimeout(async () => {
    try {
      await SplashScreen.hide({
        fadeOutDuration: 250,
      });
    } catch {
      // Ignore
    }
  }, 350);

  // 4. Android Hardware Back Button listener
  let backListenerHandle: any = null;
  try {
    backListenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
      // Check if any open modal/drawer/dropdown can be closed first
      if (options.handleBackButton && options.handleBackButton()) {
        return;
      }

      // If at root and nothing open, minimize app smoothly instead of crashing
      if (!canGoBack) {
        CapApp.minimizeApp();
      } else {
        window.history.back();
      }
    });
  } catch (e) {
    console.warn('Native backButton listener error:', e);
  }

  return () => {
    if (backListenerHandle && backListenerHandle.remove) {
      backListenerHandle.remove();
    }
  };
}
