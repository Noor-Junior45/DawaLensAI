# DawaLens AI - Android Native App & Release Setup

This project is now fully configured as a native Android app powered by **Capacitor 8**, **Firebase SDK**, **Push/FCM Messaging**, **Local Notifications**, **Firebase Crashlytics**, and a pre-configured **Release Signing Keystore**.

---

## 1. Application Identifiers & Configuration
- **Package Name (App ID)**: `in.dawalens.app`
- **Application Name**: `DawaLens AI: Medicine Tracker`
- **Firebase Project ID**: `gen-lang-client-0044881146`
- **Google Services Config**:
  - `android/app/google-services.json` (Active)
  - `google-services.json` (Root backup)

---

## 2. Release Signing Keystore Information
A production-ready PKCS12 release keystore file has been generated and pre-configured into Gradle:
- **Keystore File Location**: `android/app/release.keystore` (and `keystore/release.keystore`)
- **Key Alias**: `dawalens-key`
- **Store Password**: `dawalens123`
- **Key Password**: `dawalens123`
- **Key Algorithm**: RSA 2048-bit, 10,000 days validity
- **Properties File**: `android/keystore.properties`

The `android/app/build.gradle` is already wired to sign all release builds with this keystore automatically.

---

## 3. Integrated Native Plugins & SDKs
1. **Firebase Cloud Messaging & Push Notifications (`@capacitor/push-notifications`)**:
   - Registered with FCM for remote push notifications and message handling.
2. **Local Notifications (`@capacitor/local-notifications`)**:
   - High-importance notification channels (`medicine_alerts` and `medicine_reminders`).
   - Android `AlarmManager` exact scheduling (`allowWhileIdle: true`) to wake device even when app is killed or device is in Doze mode.
3. **Firebase Crashlytics (`@capacitor-firebase/crashlytics`)**:
   - Gradle Crashlytics plugin enabled in `android/build.gradle` and `android/app/build.gradle`.
   - Global unhandled exception & promise rejection shields sending native crash reports.
4. **Native Google Play Services Authentication (`@capacitor-firebase/authentication`)**:
   - One-tap native Android authentication sheet synchronized with Firebase.
5. **Native App Lifecycle & Performance**:
   - Splash Screen (`@capacitor/splash-screen`)
   - Status Bar styling (`@capacitor/status-bar`)
   - Hardware Back Button handler (`@capacitor/app`)
   - Keyboard auto-resizing (`@capacitor/keyboard`)
   - Haptic Feedback engine (`@capacitor/haptics`)

---

## 4. How to Build the Native Android App

### Syncing latest web changes to Android:
```bash
npm run build
npx cap sync android
```

### To Build a Signed Release APK (for direct installation / testing):
Open the terminal or open the `android` folder in **Android Studio**:
```bash
cd android
./gradlew assembleRelease
```
The signed APK will be output at:
`android/app/build/outputs/apk/release/app-release.apk`

### To Build a Signed Android App Bundle (AAB for Google Play Store upload):
```bash
cd android
./gradlew bundleRelease
```
The signed bundle will be output at:
`android/app/build/outputs/bundle/release/app-release.aab`
Upload this `.aab` file directly to the **Google Play Console** under Production / Closed Testing.

### To Run in Android Studio:
```bash
npx cap open android
```
Select your connected Android device or emulator and press **Run (Play)**.

---

## 5. Chrome & Browser Notifications (Web Push)
- **Permission**: The app requests notification permission when enabling "Push & Chrome Alerts" in Settings.
- **Service Worker**: `public/sw.js` and `public/firebase-messaging-sw.js` handle incoming web push notifications in the background.
- **Testing**: In Settings Modal under "Push & Chrome Alerts", click **Send Test** to verify native Chrome desktop/mobile notifications.
- **Server Sync**: Active medicine schedules and device push tokens sync via `/api/sync-expiry-schedule` and `/api/notifications/register-token`, allowing the 24/7 server cron worker to dispatch expiry alerts automatically.

