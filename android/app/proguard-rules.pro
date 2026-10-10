# ProGuard and R8 rules for DawaSnap AI (in.dawasnap.app)
# Production release obfuscation and shrinking configuration

# 1. Preserve source file and line numbers for Firebase Crashlytics stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# 2. Preserve annotations and JavaScript Interfaces for Capacitor WebView bridge
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# 3. Capacitor core and plugin bindings
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.PluginMethod { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 4. Google Play Services & Firebase SDKs
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn com.google.android.libraries.identity.googleid.**
-keep class androidx.credentials.** { *; }
-dontwarn androidx.credentials.**

-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Firebase Messaging (FCM)
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.messaging.**

# Firebase Crashlytics
-keepattributes *Annotation*,SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keep class com.google.firebase.crashlytics.** { *; }
-dontwarn com.google.firebase.crashlytics.**

# 5. Kotlin Coroutines & Standard Library
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# 6. Android Support & AndroidX components
-keep class androidx.** { *; }
-dontwarn androidx.**
