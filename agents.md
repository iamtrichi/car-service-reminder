# Car Service Reminder — AI Agent Guide

## Project Overview

Ionic React + Capacitor mobile app for tracking car service intervals. Stores all data locally in `localStorage`. No backend or API required.

- **Framework**: Ionic React 8 + React 18 + TypeScript
- **State Management**: Zustand (store/vehicleStore.ts)
- **Persistence**: localStorage via src/services/storageService.ts
- **Navigation**: React Router 5
- **Native**: Capacitor 6 (Android)
- **Build**: Vite 5
- **Config Data**: Static JSON files in public/config/ (car makes, models, engine specs, service intervals)
- **Ads**: @capacitor-community/admob

## Project Structure

```
src/
├── App.tsx                          # Root: Ionic setup, routing, ad init
├── pages/
│   ├── Dashboard.tsx                # Vehicle list with status summaries
│   ├── AddVehicle.tsx               # Add/edit vehicle + cascading make/model/engine selector
│   ├── VehicleDetail.tsx            # Vehicle detail with tabs (Upcoming/Services/Fluids/History)
│   └── Reminders.tsx                # Global reminders list (grouped cards for overdue/due_soon + flat OK list)
├── components/
│   ├── EngineDetailModal.tsx        # Modal for editing engine details (hp, fuel, turbo, fluids)
│   ├── Menu.tsx                     # Side menu
│   ├── SearchSelectModal.tsx        # Searchable select modal for make/model/engine
│   └── ServiceCard.tsx              # Card component grouping services by vehicle with status indicator
├── services/
│   ├── storageService.ts            # localStorage CRUD for vehicles, intervals, records
│   ├── serviceConfigService.ts      # Loads config JSON: makes, models, engine variants, service rules
│   ├── reminderService.ts           # Calculates reminder status (overdue/due_soon/ok) and forecasts
│   └── vinService.ts                # VIN decoding (local rules-based)
├── store/
│   └── vehicleStore.ts              # Zustand store: vehicles[], serviceIntervals[], serviceRecords[]
├── types/
│   └── index.ts                     # All TypeScript types and enums
└── theme/
    └── variables.css                # Ionic CSS variables
```

## Key Types (src/types/index.ts)

```typescript
Vehicle {
  id: string; name: string; make: string; model: string; year: number;
  licensePlate?: string; vin?: string;
  engineCode?: string; engineName?: string; hp?: number;
  engineDisplacement?: string; fuelType?: string; isTurbo?: boolean;
  currentMileage: number; purchaseDate?: string; createdAt: string;
  oilNorm?: string; brakeFluidType?: string; coolantType?: string;
  gearboxOilType?: string; gearboxOilCapacity?: string;
}

ServiceInterval {
  id: string; vehicleId: string; serviceType: ServiceType; name: string;
  intervalMileage: number | null; intervalMonths: number | null;
  lastPerformedMileage: number | null; lastPerformedDate: string | null;
  isRecurring: boolean; notes?: string;
}

ServiceRecord {
  id: string; vehicleId: string; serviceIntervalId?: string;
  serviceType: ServiceType; name: string;
  performedAtMileage: number; performedAtDate: string;
  cost?: number; notes?: string; workshop?: string;
}

EngineVariant { engineCode: string; engineName: string; hp: number;
  displacement?: string; fuelType?: string; isTurbo?: boolean;
  oilNorm?: string; brakeFluidType?: string; coolantType?: string;
  gearboxOilType?: string; gearboxOilCapacity?: string; }

EngineSpec { engineCode: string; engineName?: string; fuelType?: string;
  isTurbo?: boolean; displacement?: string; oilCapacity?: string;
  oilNorm?: string; brakeFluidType?: string; coolantType?: string;
  gearboxOilType?: string; gearboxOilCapacity?: string; }
```

ServiceType is an enum: `OIL_CHANGE = 'oil_change'`, `OIL_FILTER`, `AIR_FILTER`, `CABIN_FILTER`, `FUEL_FILTER`, `BRAKE_FLUID`, `COOLANT`, `SPARK_PLUGS`, `TIMING_BELT`, `WATER_PUMP`, `BRAKE_PADS`, `BRAKE_DISCS`, `TIRE_ROTATION`, `BATTERY`, `TRANSMISSION_FLUID`, `CLUTCH`, `SHOCK_ABSORBERS`, `AC_SERVICE`, `DPF_FILTER`, `EGR_CLEANING`, `GLOW_PLUGS`, `OTHER`

## Data Flow

### State Management (Zustand)

- Store: `useVehicleStore` — single store with `vehicles[]`, `serviceIntervals[]`, `serviceRecords[]`
- Actions: `loadData()`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()`, `updateMileage()`, `performService()`, `addCustomInterval()`, `removeInterval()`, `addServiceRecord()`, `updateServiceInterval()`
- **IMPORTANT**: Every state mutation must also call the corresponding `storageService.save*()` function to persist to localStorage. Zustand state + localStorage must stay in sync.
- On app load, `App.tsx` calls `loadData()` which reads all data from localStorage into the store.

### Persistence (src/services/storageService.ts)

- All data stored in localStorage under keys: `csr_vehicles`, `csr_service_intervals`, `csr_service_records`
- Storage keys use prefixes (`csr_`) to avoid collisions
- All functions are synchronous (localStorage is sync)
- `saveVehicle()` does upsert (find by id, update or push)
- `deleteVehicle()` also cascades: deletes all intervals and records for that vehicle

### Config Data (public/config/)

- `service-intervals.json` — contains `engineSpecs[]`, service rules, generic intervals
- `makes/all-makes-models.json` — index of all make files
- `makes/{make}.json` — per-make data with models[], each model has engineVariants[]
  - Each make file includes an `"imageUrl"` field (e.g. `"/public/thumb/renault.png"`) pointing to a brand logo in `public/thumb/`
  - The `SearchSelectModal` automatically displays the brand logo in an `IonAvatar` when the user searches for a make to add
  - Logos come from the `car-logos-dataset` workspace repo and are stored as PNG files in `public/thumb/`
  - When adding a new make JSON file, always include `"imageUrl": "/public/thumb/{filename}.png"` right after the `"make"` line
- Loaded at runtime via `fetch()` (static JSON files served from `/config/...`)
- Service `serviceConfigService.ts` handles loading, caching, and normalization

## Important Patterns & Rules

### 1. No Early Return After Hooks

**CRITICAL**: Never put an `if (condition) return (...)` before all React hooks (useState, useMemo, useEffect). This causes "Rendered fewer hooks than expected" errors with Ionic's page caching.

✅ **Correct pattern**: Always render the full component with all hooks in the same order. Use inline conditionals in JSX instead:

```tsx
// ❌ BAD: hooks inside main body, early return before JSX
const VehicleDetail = () => {
  const [x, setX] = useState(); // hooks here
  if (!vehicle) return <NotFound />; // early return — ZERO hooks
  // hooks also here — React breaks when the early return fires
};

// ✅ GOOD: all hooks always called, conditional rendering inside JSX
const VehicleDetail = () => {
  const [x, setX] = useState(); // hooks here — always called
  const [y, setY] = useState(); // always called
  return (
    <IonContent>
      {!vehicle ? (
        <NotFound />
      ) : (
        <FullContent />
      )}
    </IonContent>
  );
};
```

### 2. Vehicle → engineSpec → Fluid Specs Chain

The `VehicleDetail` page uses `engineSpec` (merged from config + vehicle data) to display fluid specs in the Fluids tab.

- `useEffect` on mount calls `getEngineSpecsForVehicle(vehicle)` which looks up config JSON
- Config defaults **must be merged** with the vehicle's own fluid specs: vehicle values take precedence
- After saving fluid specs or engine details, the `engineSpec` state **must be refreshed immediately** (not just rely on useEffect, which may not re-fire in time)
- Pattern in `handleSaveFluidSpecs`: call `setEngineSpec(prev => ({ ...prev, oilNorm: updated.oilNorm || prev.oilNorm, ... }))` after `updateVehicle()`

### 3. Fluid Spec Edit Modal Pre-population

When opening the "Edit Fluid Specs" modal:
- Pre-fill inputs from `vehicle.oilNorm || engineSpec.oilNorm || ''` — vehicle data first (user overrides), then config defaults

When opening the "Edit Engine Details" modal:
- Pass `initialData` prop with the vehicle's current engine fields
- Use a `key` prop on the modal component that increments on each open to force a fresh mount
- The modal's `useEffect` should reinitialize state when `isOpen` becomes `true`

### 4. Modals Always Render

All modals (Perform Service, Edit Mileage, Edit Fluid Specs, Engine Detail) are **always rendered in the JSX** with `isOpen` controlling visibility — they are never conditionally mounted. This ensures hooks remain consistent.

Exception: `EngineDetailModal` IS conditionally mounted with `{vehicle && <EngineDetailModal ... />}` because it is a **child component** with its own hooks, so it's safe.

### 5. Delete Vehicle

- Delete the vehicle FIRST (triggers Zustand state update + localStorage write), then navigate away
- Use `history.replace('/dashboard')` (not `.push()`) to avoid stacking navigation
- Guard with `if (!vehicle) return;` since the handler can fire from action sheet even after state changes
- No `setTimeout` — everything is synchronous

### 6. Ionic Page Caching

Ionic `IonRouterOutlet` can keep pages in the DOM after navigation (page caching). This means:
- `useEffect` cleanup functions may not fire
- Components can receive re-renders after they're "navigated away from"
- Never rely on component unmount to clean up — use explicit state resets instead

### 7. Making Changes to Config JSON

The config files under `public/config/` contain:
- `service-intervals.json` — engine specs with fluid recommendations, service rules
- `makes/*.json` — car models with engine variants

When adding or updating config data:
- Use provided scripts in `scripts/` directory (e.g., `scrape-automobile-tn.js`, `scrape-ford-data.py`, `populate-engines.js`)
- The `all-makes-models.json` index must be kept in sync with individual make files
- Run `update-missing-specs.py` or `fill-empty-engines.cjs` to fill gaps in engine data

### 8. Vehicle Info Card Pattern

The vehicle info card on VehicleDetail displays:
- License plate, VIN, Engine details, Purchase date in a 2-column grid
- Current mileage in a clickable area that opens the edit mileage modal
- Status summary chips (overdue/due_soon counts)

### 9. Tabs Pattern (VehicleDetail)

Four tabs: Upcoming → Services → Fluids → History
- **Upcoming**: Forecast for next 10,000 km (missed + upcoming services with remaining km/days)
- **Services**: All configured service intervals with status indicators (overdue/due_soon/ok)
- **Fluids**: Fluid specifications with inline icons and edit button
- **History**: Past service records sorted by date (newest first)

### 10. Cascading Selectors (AddVehicle)

Make → Model → Engine uses a 3-level cascading selector with SearchSelectModal:
- Select Make → loads models via `getModelsForMake()`
- Select Model → loads engines via `getEngineVariantsForModel()`
- Select Engine → auto-generates service intervals via `getRecommendedIntervals()`
- Custom values allowed via `allowCustom` prop on SearchSelectModal

### 11. IonIcon Imports

Ionicons icons are imported as named exports from 'ionicons/icons':
`import { car, create, trash, checkmark, hammer, add, informationCircle, time, speedometer, calendar, alertCircle, settings, water, thermometer } from 'ionicons/icons';`

Some icons have different names in the library vs their display:
- `water` = water drop icon (for engine oil / coolant)
- `thermometer` = temperature icon (for coolant)
- `settings` = gear icon (for gearbox oil / configure)
- `informationCircle` = info circle (for fluid specs / info)

### 12. Color System

Standard Ionic colors: `primary`, `secondary`, `success`, `warning`, `danger`, `medium`, `light`, `dark`
Custom CSS colors can be defined in `src/theme/variables.css`

## Reminders Page — Grouped Service Cards

The `Reminders.tsx` page groups overdue and due-soon reminders by vehicle into `ServiceCard` components.

- **ServiceCard** (`src/components/ServiceCard.tsx`): Shows a 50×50px rounded square status indicator (red `! Overdue` / amber `• Due soon` with 7px border-radius), the primary service name as title, overdue/due info as subtitle, and vehicle name + model inline at the right. Additional services for the same vehicle appear as IonChips below a separator.
- **Priority logic**: Engine/gearbox oil services (`oil_change`, `oil_filter`, `transmission_fluid`) are prioritized as the card title.
- **Section titles**: "Overdue" section uses `reminders.needsAttention` (e.g., "Needs attention") with zero-padded count (e.g., `(03)` / `(12)`). "Due Soon" section uses `reminders.comingUp` (e.g., "Coming up this month").
- **OK services** remain as a flat list.
- An "end of list" message (`reminders.endOfList`) appears at the bottom of the page.

## Common Tasks

### Add a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add menu item in `src/components/Menu.tsx`

### Add a New Service Type
1. Add enum value to `ServiceType` in `src/types/index.ts`
2. Add label in `SERVICE_TYPE_LABELS` in `src/types/index.ts`
3. Add entry in `getServiceName()` in `src/services/serviceConfigService.ts`
4. Add rule/service definition in `public/config/service-intervals.json`

### Add a New Fluid Spec Field to Vehicle
1. Add field to `Vehicle` interface in `types/index.ts`
2. Add field to `EngineSpec` and `EngineVariant` interfaces
3. Update `handleSaveEngine` and `handleSaveFluidSpecs` in VehicleDetail
4. Add modal input in the Edit Fluid Specs modal
5. Update `engineSpec` merging in the useEffect
6. Display the field in the Fluids tab
7. Persist in `AddVehicle.tsx` save handler

## Build & Run Commands

```bash
npm run dev              # Browser dev server at localhost:5173
npm run build            # Web build to dist/
npm run build && npx cap sync android   # Sync web build to Android
npx cap open android     # Open Android Studio
npx cap run android      # Build and run on device/emulator
cd android && ./gradlew assembleDebug   # Build debug APK
cd android && ./gradlew assembleRelease  # Build release APK
```

## VIN Service

The VIN service (`src/services/vinService.ts`) is a local rules-based decoder using WMI codes for most makes. It decodes VINs client-side without external APIs.