package com.carservice.reminder;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    /**
     * Latest top safe-area inset (status bar + display cutout) in dp, published
     * to the web layer as the CSS custom property --safe-area-inset-top.
     */
    private int topInsetDp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must run AFTER super.onCreate: Capacitor's BridgeActivity applies
        // AppTheme.NoActionBar inside super.onCreate. Calling enable() earlier
        // forces Window.getDecorView() with the launch theme, which leaks a
        // native framework ActionBar over the web UI.
        super.onCreate(savedInstanceState);

        // Render into the display cutout (punch-hole) so the app fills the full
        // screen, including behind the (visible) status bar. Android 15+ forces
        // this (ALWAYS) for edge-to-edge apps; set it explicitly for API 28-34.
        // ALWAYS exists only from API 30, so fall back to SHORT_EDGES on
        // API 28-29.
        WindowManager.LayoutParams attrs = getWindow().getAttributes();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        // Enable edge-to-edge on all API levels for backward compatibility.
        EdgeToEdge.enable(this);
        registerPlugin(AppUpdatePlugin.class);

        // Why this listener exists:
        // `SystemBars.insetsHandling: 'disable'` keeps the app full-bleed and
        // injects nothing, and Chromium only reports a correct
        // env(safe-area-inset-top) from WebView 140 on (the fix for
        // issues.chromium.org/40699457) - older WebViews report 0, which let the
        // toolbar title slide under the status bar clock. So read the real inset
        // here and publish it as --safe-area-inset-top, the exact custom
        // property Capacitor's own `insetsHandling: 'css'` mode injects, which
        // Ionic maps to --ion-safe-area-top. Insets are returned untouched: the
        // decor view is NOT padded, so the app stays full-bleed (banner, tab
        // bar and footer clearance are unaffected) and only the CSS value moves.
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            topInsetDp = Math.round(bars.top / getResources().getDisplayMetrics().density);
            applyTopInset();
            return insets;
        });

        // The value lives as an inline style on <html>, so re-apply it after
        // every page load (cold start, reload, WebView restored by the OS).
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                applyTopInset();
            }
        });
    }

    private void applyTopInset() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        final WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(
            "document.documentElement.style.setProperty('--safe-area-inset-top','" + topInsetDp + "px')",
            null));
    }
}
