# React Native / Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-config
-keep class com.areyousafeapp.BuildConfig { *; }

# Google Sign-In
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# OkHttp (used by many RN libs)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Notifee
-keep class io.invertase.notifee.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep ViewManagers
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

# Keep custom modules
-keep class com.areyousafeapp.WidgetModule { *; }
-keep class com.areyousafeapp.CheckInWidget { *; }

# Suppress warnings for missing optional classes
-dontwarn com.facebook.react.**
-dontwarn javax.annotation.**
