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
    },
  },
};

export default config;