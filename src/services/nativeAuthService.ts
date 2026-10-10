import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { 
  signInWithPopup, 
  signInWithCredential, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  auth,
  googleProvider,
  browserPopupRedirectResolver 
} from '../firebase';

export interface NativeAuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
  isCancelled?: boolean;
}

function formatAuthError(error: any): string {
  if (!error) return 'Failed to sign in with Google';
  const code = error.code || '';
  const message = error.message || String(error);

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'Domain Unauthorized: Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed') || message.includes('action is invalid')) {
    return 'Google Sign-In not enabled: Please enable Google provider in Firebase Console > Authentication > Sign-in method and select a Project support email.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup blocked by browser. Please allow popups for this site and try again.';
  }
  return message;
}

/**
 * High-performance cross-platform Google Sign In service.
 * Automatically detects native Capacitor Android environment and uses Google Play Services native auth sheet,
 * while falling back to standard web popup on browser / PWA.
 */
export async function signInWithGoogleAdaptive(): Promise<NativeAuthResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // 1. Invoke native Google Play Services sign-in sheet on Android
      const result = await FirebaseAuthentication.signInWithGoogle({
        scopes: ['email', 'profile'],
      });

      // 2. If native credential was returned, synchronize with Firebase Web SDK
      if (result.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
        const userCredential = await signInWithCredential(auth, credential);
        return {
          success: true,
          user: userCredential.user,
        };
      }

      // If user object returned natively but no token, check current Firebase user
      if (auth.currentUser) {
        return {
          success: true,
          user: auth.currentUser,
        };
      }

      return {
        success: true,
      };
    } catch (nativeError: any) {
      console.warn('Native Google Sign-In attempt error:', nativeError);
      
      const errMsg = nativeError?.message || String(nativeError);
      if (errMsg.includes('cancelled') || errMsg.includes('canceled') || errMsg.includes('12501')) {
        return {
          success: false,
          isCancelled: true,
          error: 'Sign in was cancelled',
        };
      }

      // Fallback: try web popup inside WebView if native fails
      try {
        const fallbackRes = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        return {
          success: true,
          user: fallbackRes.user,
        };
      } catch (fallbackError: any) {
        if (fallbackError.code === 'auth/popup-closed-by-user') {
          return {
            success: false,
            isCancelled: true,
          };
        }
        return {
          success: false,
          error: formatAuthError(fallbackError),
        };
      }
    }
  }

  // Web / PWA flow
  try {
    const res = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return {
      success: true,
      user: res.user,
    };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return {
        success: false,
        isCancelled: true,
      };
    }
    return {
      success: false,
      error: formatAuthError(error),
    };
  }
}

/**
 * Universal sign-out handling both native Android session and Firebase Web SDK session.
 */
export async function signOutAdaptive(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch (e) {
      console.warn('Native signOut warning:', e);
    }
  }
  await signOut(auth);
}
