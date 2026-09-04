# ============================================================
# Capacitor / Cordova ProGuard Rules
# ============================================================
# These rules keep classes that Capacitor and its plugins
# access via reflection, from JavaScript, or via annotations.
# Everything else is free to be shrunk and obfuscated by R8.

# --- Capacitor core bridge & plugin framework ---
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class org.chromium.** { *; }

# --- Keep annotation-based plugin discovery ---
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.Permission class * { *; }
-keep @com.getcapacitor.annotation.ActivityCallback class * { *; }
-keep @com.getcapacitor.annotation.PermissionCallback class * { *; }
-keep @com.getcapacitor.annotation.PluginMethod class * { *; }

# --- Keep JavaScript interface methods (JS -> native bridge) ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Keep native methods (called from native code) ---
-keepclassmembers class * {
    native <methods>;
}

# --- Keep Parcelable / Serializable / Enum ---
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# --- Keep R references from Cordova plugins ---
-keepclassmembers class **.R$* {
    public static <fields>;
}

# --- Don't warn about missing Capacitor/Cordova deps ---
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
-dontwarn org.chromium.**
-dontwarn android.webkit.**

# --- Keep WebView internals used by Capacitor ---
-keep class android.webkit.WebViewClient { *; }
-keep class android.webkit.WebChromeClient { *; }
-keep class android.webkit.ValueCallback { *; }

# --- Keep AndroidX classes used by Capacitor plugins ---
-keep class androidx.appcompat.app.AppCompatActivity { *; }
-keep class androidx.fragment.app.Fragment { *; }
-keep class androidx.core.app.ActivityCompat { *; }

# --- Keep Google Play Core (In-App Updates) ---
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**
