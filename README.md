# Car Service Reminder

An Ionic React + Capacitor mobile app for tracking and managing car service intervals. Store all data locally — no backend required.

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Android Studio** (for Android builds)
- **Java 17** (bundled with Android Studio)
- **Android SDK** API 34+ (via Android Studio SDK Manager)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (browser)
npm run dev
```

Open http://localhost:5173 in your browser.

## Development (Browser)

```bash
npm run dev
```

The app runs entirely in the browser. Config data (car makes, models, service intervals) is loaded from `public/config/`.

## Build Web App

```bash
npm run build
```

Output goes to the `dist/` directory.

## Android Setup

### 1. Add Android Platform (first time only)

```bash
npx cap add android
```

### 2. Sync Web Changes to Android

After making changes to the web code (TypeScript/CSS/HTML), sync them to the Android project:

```bash
npm run build && npx cap sync android
```

This runs the web build, then copies `dist/` assets into `android/app/src/main/assets/public/`.

### 3. Open in Android Studio

```bash
npx cap open android
```

### 4. Build APK

**From Android Studio:**
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**From command line:**

```bash
cd android && ./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Build Release APK / AAB

```bash
# Generate a signing keystore (one time)
keytool -genkey -v -keystore release.keystore -alias car-service -keyalg RSA -keysize 2048 -validity 10000

# Build signed release AAB
cd android && ./gradlew bundleRelease

# Build signed release APK
cd android && ./gradlew assembleRelease
```

Then place `release.keystore` in the `android/app/` directory and configure signing in `android/app/build.gradle`.

---

## Complete Workflow

```bash
# 1. Make code changes

# 2. Build the web app
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. Run on device / build APK from Android Studio
```

---

## Updating Android Resources (App Icon & Splash Screen)

### Prerequisites

Install the Capacitor Assets plugin:

```bash
npm install @capacitor/assets
```

### Generate Resources

1. **Create a source icon** — a 1024×1024px PNG file (e.g., `assets/icon.png`)
2. **Create a source splash** — a 2732×2732px PNG file (e.g., `assets/splash.png`)
3. **Run the assets generator:**

```bash
npx capacitor-assets generate --iconBackgroundColor "#3880ff" --splashBackgroundColor "#3880ff"
```

This generates all required Android (and iOS) icon sizes and splash screen variants.

### Manual Resource Replacement (without plugin)

If you prefer to replace resources manually:

**App Icon:**
1. Create icons at all required sizes (48×48, 72×72, 96×96, 144×144, 192×192, 512×512)
2. Replace the files in `android/app/src/main/res/mipmap-*/`
   - `ic_launcher.png` — app icon
   - `ic_launcher_round.png` — round icon variant

**Splash Screen:**
1. Replace `android/app/src/main/res/drawable/splash.png` and `android/app/src/main/res/drawable-land-hdpi/splash.png`

### Update Capacitor Config

After updating resources, update `capacitor.config.ts` if needed:

```ts
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
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3880ff',
    },
  },
};

export default config;
```

### Re-sync after resource changes

```bash
npx cap sync android
```

---

## Project Structure

```
car-service-reminder/
├── android/                     # Native Android project (Capacitor)
│   └── app/src/main/
│       ├── assets/public/       # Copied web build output
│       ├── java/.../MainActivity.java
│       └── res/                 # Android resources (icons, splash)
├── public/
│   └── config/
│       ├── service-intervals.json   # Service rules + engine specs
│       └── makes/                   # Car make/model/engine data
│           ├── renault.json
│           ├── ford.json
│           └── ...
├── src/
│   ├── App.tsx                  # Root app with routing
│   ├── pages/                   # App pages
│   │   ├── Dashboard.tsx
│   │   ├── AddVehicle.tsx
│   │   ├── VehicleDetail.tsx
│   │   └── Reminders.tsx
│   ├── services/                # Business logic
│   │   ├── reminderService.ts
│   │   ├── serviceConfigService.ts
│   │   ├── storageService.ts
│   │   └── vinService.ts
│   ├── store/vehicleStore.ts    # Zustand state management
│   └── types/index.ts           # TypeScript type definitions
├── capacitor.config.ts          # Capacitor configuration
├── package.json
└── README.md
```

## Technologies

- **Ionic React** — UI framework
- **Capacitor** — Native mobile runtime
- **React Router** — Navigation
- **Zustand** — State management
- **date-fns** — Date calculations
- **TypeScript** — Type safety