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
      // Using Credential Manager without offline scopes (Google ID Token includes email, name, photo)
      let result: any = null;
      try {
        result = await FirebaseAuthentication.signInWithGoogle();
      } catch (credMgrErr: any) {
        console.warn('Credential Manager sign-in attempt warning, falling back to legacy Play Services:', credMgrErr);
        // If Credential Manager is unavailable or fails, fallback to legacy GoogleSignInClient
        result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });
      }

      // 2. If native credential was returned, synchronize with Firebase Web SDK
      if (result?.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(
          result.credential.idToken,
          result.credential.accessToken || undefined
        );
        const userCredential = await signInWithCredential(auth, credential);
        return {
          success: true,
          user: userCredential.user,
        };
      }

      // 3. If native user object was returned directly by plugin / OAuth activity
      if (result?.user) {
        const idTokenRes = await FirebaseAuthentication.getIdToken().catch(() => null);
        if (idTokenRes?.token) {
          try {
            const credential = GoogleAuthProvider.credential(idTokenRes.token);
            const userCredential = await signInWithCredential(auth, credential);
            return {
              success: true,
              user: userCredential.user,
            };
          } catch (syncErr) {
            console.warn('Native token sync warning:', syncErr);
          }
        }
      }

      // 4. Check if Firebase currentUser was populated
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
      if (
        errMsg.includes('cancelled') ||
        errMsg.includes('canceled') ||
        errMsg.includes('12501') ||
        errMsg.includes('Closed by user')
      ) {
        return {
          success: false,
          isCancelled: true,
          error: 'Sign in was cancelled',
        };
      }

      return {
        success: false,
        error: formatAuthError(nativeError),
      };
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
