# Car Maintenance Reminder App - Skills & Technical Architecture

## Overview
A comprehensive Ionic React with Capacitor app that manages and reminds users about upcoming car services. The app stores all data locally (no backend required) and includes a vast database of car makes, models, and engine specifications.

## Core Features

### 1. Vehicle Management
- Add multiple vehicles with detailed specifications
- Edit and delete vehicle records
- VIN decoding integration
- Local storage using Capacitor Storage API

### 2. Service Reminder System
- Tracks upcoming services based on manufacturer recommendations
- Supports 36 car makes with comprehensive model/year/engine data
- Calculates service intervals based on mileage and time
- Customizable service history and reminders
- **Grouped reminders**: Overdue and due-soon services are grouped by vehicle into cards with status indicators (50×50px rounded square, 7px border-radius, red `! Overdue` / amber `• Due soon` text)
- **Priority card titles**: Engine/gearbox oil services (`oil_change`, `oil_filter`, `transmission_fluid`) are prioritized as the primary card title
- **Expandable service list**: Additional services for the same vehicle appear as IonChips below the card header
- **Section titles**: "Needs attention" (with zero-padded count) for overdue services, "Coming up this month" for due-soon services
- **End-of-list message**: A subtle "Nothing more to display" message at the bottom of the reminders list

### 3. Cascading Selection UI
- Make → Model → Engine selection with search functionality
- Real-time filtering as you type
- Visual selection with images and detailed specs

### 4. Contact Us / Support
- **Contact Us page** accessible from the side menu
- Form with fields: Make*, Model*, Engine, Year, and optional Message
- Opens the device's email client with a pre-composed email to `car.services.reminders@gmail.com`
- Email body includes the car details the user entered
- Fully localized in all 5 supported languages (en, fr, ar, es, pt)

## Technical Architecture

### Frontend Stack
- **Ionic React** with Capacitor for native mobile capabilities
- **TypeScript** for type safety
- **React Context API** for state management
- **Capacitor Storage API** for local data persistence
- **Capacitor Filesystem API** for config file access

### Data Structure

#### 1. Service Intervals Configuration (`public/config/service-intervals.json`)
- **Generic Intervals**: Default service intervals for all cars
- **Service Types**: 21 different service types (oil change, filters, fluids, belts, etc.)
- **Adjustment Rules**: Conditional adjustments based on fuel type, turbo, engine displacement, and specific engine codes
- **Engine Specifications**: Oil capacity, oil norm, brake fluid type, coolant type, gearbox oil specs

#### 2. Makes Database (Separate JSON files per make)
- **36 Car Makes** with comprehensive coverage:
  - Renault, Peugeot, Citroen, Volkswagen, Audi, BMW, Mercedes, Toyota, Nissan, Hyundai, Kia, Ford, Opel, Fiat, Alfa Romeo, Mitsubishi, Subaru, Suzuki, Dacia, Lancia, MG, Daewoo, Proton, Skoda, Chevrolet, Jeep, Chrysler, Honda, Mazda, Mini, Smart, Volvo, Jetour, BYD, Chery, GWM

### Data Model

#### Vehicle Object
```typescript
{
  id: string;
  make: string;
  model: string;
  year: number;
  engine: {
    engineCode: string;
    engineName: string;
    hp: number;
    fuelType: 'Gasoline' | 'Diesel';
    isTurbo: boolean;
    displacement: string;
    oilCapacity: string;
    oilNorm: string;
    brakeFluidType: string;
    coolantType: string;
    gearboxOilType: string;
    gearboxOilCapacity: string;
  };
  mileage: number;
  licensePlate?: string;
  vin?: string;
  createdAt: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
}
```

#### Service Interval Calculation
- Based on manufacturer recommendations from the comprehensive makes database
- Considers engine specifications for accurate service intervals
- Applies conditional rules based on fuel type, turbo presence, engine displacement, and specific engine codes
- Calculates next service date based on mileage and time (whichever comes first)

### Key Technical Skills Demonstrated

#### 1. Data Management
- Large-scale data generation and organization
- Efficient data loading from multiple JSON files
- Caching and state management for performance
- Local storage with Capacitor

#### 2. Cascading Selection System
- Multi-level filtering with real-time search
- Debounced search input for performance
- Keyboard navigation support
- Visual feedback and selection confirmation

#### 3. Service Calculation Engine
- Rule-based service interval calculation
- Conditional logic for different engine types
- Dynamic adjustment based on vehicle specifications
- History tracking and reminder generation

#### 4. Ionic React with Capacitor
- Native mobile capabilities (storage, filesystem)
- Responsive design for mobile devices
- Touch-friendly UI components
- Offline-first architecture

#### 5. TypeScript Mastery
- Complex type definitions for vehicle data
- Type-safe service interval calculations
- Comprehensive error handling
- Code generation for type safety

#### 6. Grouped Card UI Pattern
- Dynamic grouping of service reminders by vehicle using Map-based aggregation
- Reusable `ServiceCard` component with configurable status (overdue/due_soon)
- 50×50px rounded square status indicators with inline text styling
- IonChip-based display for secondary services with color-mix backgrounds
- Vehicle grouping sorted by most urgent reminder
- Zero-padded counts (e.g., `(03)` for counts < 10)

## Performance Optimizations

### 1. Data Loading
- Lazy loading of make-specific JSON files
- Caching of frequently accessed data
- Efficient search with debouncing
- Minimal re-renders with React.memo

### 2. Search Functionality
- Debounced input (300ms) to prevent excessive filtering
- Keyboard navigation with arrow keys and Enter
- Visual highlighting of search matches
- Quick select with Enter key

### 3. State Management
- Context API for global state
- Memoized selectors for derived data
- Efficient re-renders with React.memo
- Local state for form inputs

## Testing & Validation

### 1. Data Completeness
- All 21 major car makes covered
- Multiple models per make (from 3 to 8+ models)
- Comprehensive engine variants with all HP options
- Coverage from 1996 to present models

### 2. Service Rules
- 9 base adjustment rules for different conditions
- Specific rules for common engines (K9K, H4B, F4R, etc.)
- Engine-specific oil and fluid specifications
- Proper handling of diesel vs gasoline engines

### 3. Edge Cases
- Turbo vs non-turbo engines
- Diesel particulate filter (DPF) considerations
- Variable service intervals based on engine code
- Hybrid and electric vehicle support

## Notification System (Local Notifications)

A daily mileage update reminder system built with `@capacitor/local-notifications`.

### Key Features

- **Daily reminders**: Schedules a local Android notification at 10:00 AM every day for each vehicle
- **Per-vehicle notifications**: Each vehicle gets its own notification with the vehicle's make/model in the body, and tapping it opens the vehicle detail page
- **Native OS scheduling**: Notifications fire even when the app is closed or not running (scheduled at Android OS level via `AlarmManager`)
- **Permission management**: 
  - Custom one-time `PermissionPrompt` modal explaining why notifications are needed
  - Triggers the native Android `POST_NOTIFICATIONS` dialog (API 33+)
  - Graceful degradation if permission is denied
- **i18n support**: Notification title and body use `i18n.t()` so they respect the app's current language
- **Language change re-scheduling**: When the user switches language via the menu, notifications are automatically re-scheduled with the new translated text
- **Duplicate protection**: On app start, all previously scheduled mileage reminders are canceled before re-scheduling
- **Preference persistence**: Notification enabled/disabled state is stored in localStorage (`csr_notifications_enabled`) so the toggle persists across refreshes and restarts.
- **Context-synced banner state**: Dashboard and reminders pages share notification state via React Context, so enabling notifications on one page immediately hides the dashboard banner without needing a refresh.
- **Preference-aware scheduling**: Disabled notifications cancel scheduled reminders and prevent re-scheduling until the user re-enables them.

### Files

| File | Purpose |
|------|---------|
| `src/services/notificationService.ts` | Permission handling, schedule/cancel reminders, status checks |
| `src/components/PermissionPrompt.tsx` | Custom one-time permission explanation modal |
| `src/App.tsx` | Integration point: init scheduling, notification tap navigation, language change listener |

### Technical Implementation

- Uses `@capacitor/local-notifications` v6 (compatible with Capacitor 6)
- Notification IDs: `1000-1999` range for mileage reminders
- Schedule config: `{ every: 'day', on: { hour: 10, minute: 0 } }`
- Extra data payload: `{ vehicleId: string }` for tap-to-navigate
- Permission state tracked via `LocalNotifications.checkPermissions()` / `.requestPermissions()`
- Prompt-shown state persisted in `localStorage` under key `csr_permission_prompt_shown`

## Future Enhancements

### 1. Additional Features
- VIN scanning with camera
- Service history export
- Maintenance cost tracking
- Fuel efficiency tracking
- Repair manual integration
- Push notifications for service reminders
- Customizable notification time/schedule
- Notification snooze/dismiss actions
- In-app support chat

### 2. Data Expansion
- More detailed engine specs (torque, compression, etc.)
- Transmission type and specifications
- Brake system details
- Suspension and steering specs
- Tire pressure and size recommendations

### 3. Integration
- OBD-II connection for real-time data
- Calendar integration for service reminders
- Email/SMS notifications
- Cloud backup option

## Conclusion
This app demonstrates advanced skills in Ionic React, Capacitor, TypeScript, data management, and UI component design. The comprehensive car database with all engine variants provides a solid foundation for a powerful car maintenance reminder system.