import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carservice.reminder',
  appName: 'Car Service Reminder',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1b4f89',
      sound: 'beep.wav',
    },
    SplashScreen: {
      launchShowDuration: 4000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    // Android 15+ enforces edge-to-edge. SystemBars (bundled with
    // @capacitor/core 8). 'disable' stops the plugin padding the decor view
    // so the UI is full-bleed; the WebView's env(safe-area-inset-*)
    // (viewport-fit=cover) supplies the insets instead.
    SystemBars: {
      insetsHandling: 'disable',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;