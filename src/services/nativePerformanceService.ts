import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';
import { triggerLightHaptic, triggerMediumHaptic } from '../utils/haptics';

interface PerformanceOptions {
  /**
   * Return true if a modal, drawer, page, or search state was consumed/closed.
   * Return false if the user is on the main screen and back press can exit/minimize.
   */
  handleBackButton?: () => boolean;
}

let activeBackButtonHandler: (() => boolean) | null = null;
let lastBackPressTime = 0;
let exitToastTimeout: any = null;
let isPerformanceInitialized = false;

/**
 * Dynamically updates the active back button handler across all pages and modals.
 */
export function setNativeBackButtonHandler(handler: () => boolean): void {
  activeBackButtonHandler = handler;
}

/**
 * Displays a lightweight native exit confirmation toast at the bottom of the screen.
 */
function showExitToast(): void {
  try {
    const existing = document.getElementById('native-exit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'native-exit-toast';
    toast.textContent = 'Press back again to exit DawaLens';
    toast.style.cssText = `
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(30, 41, 59, 0.92);
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      z-index: 99999;
      pointer-events: none;
      transition: opacity 0.25s ease-in-out;
      opacity: 0;
      backdrop-filter: blur(8px);
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    clearTimeout(exitToastTimeout);
    exitToastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  } catch (e) {
    // Non-fatal fallback
  }
}

/**
 * Initializes native Android performance & system back button integration:
 * - Hides splash screen cleanly without white flashes
 * - Sets status bar theme and background
 * - Configures keyboard resize to prevent UI jumping/lag
 * - Configures Android hardware back button for all pages, modals, and views
 */
export async function initNativePerformance(options: PerformanceOptions = {}): Promise<() => void> {
  if (options.handleBackButton) {
    activeBackButtonHandler = options.handleBackButton;
  }

  if (isPerformanceInitialized) {
    return () => {};
  }
  isPerformanceInitialized = true;

  if (Capacitor.isNativePlatform()) {
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
    try {
      await CapApp.addListener('backButton', async ({ canGoBack }) => {
        // Check if any open page/modal/drawer/state can be closed first
        if (activeBackButtonHandler && activeBackButtonHandler()) {
          triggerLightHaptic();
          return;
        }

        // At the main dashboard root: handle double-press to minimize/exit
        const now = Date.now();
        if (now - lastBackPressTime < 2000) {
          triggerMediumHaptic();
          CapApp.minimizeApp();
        } else {
          lastBackPressTime = now;
          triggerLightHaptic();
          showExitToast();
        }
      });
    } catch (e) {
      console.warn('Native backButton listener error:', e);
    }
  }

  // Also support Web/PWA browser popstate for back button consistency
  const popStateHandler = (e: PopStateEvent) => {
    if (activeBackButtonHandler && activeBackButtonHandler()) {
      e.preventDefault();
      triggerLightHaptic();
    }
  };
  window.addEventListener('popstate', popStateHandler);

  return () => {
    window.removeEventListener('popstate', popStateHandler);
  };
}
