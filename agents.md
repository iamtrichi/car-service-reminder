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
│   ├── VehicleDetail.tsx            # Vehicle detail with tabs (Upcoming/Services/Fluids/History/Expenses)
│   ├── FuelPage.tsx                 # Dedicated per-vehicle fuel log page (/vehicle/:vehicleId/fuel)
│   ├── Reminders.tsx                # Global reminders list (grouped cards for overdue/due_soon + flat OK list)
│   ├── Statistics.tsx               # Global expense/fuel statistics (all vehicles + per-vehicle + period filter)
│   ├── Settings.tsx                 # App settings (currency selector supports ALL device currencies)
│   └── ContactUs.tsx               # Contact form: car make/model/engine/year + message -> opens email client
├── components/
│   ├── EngineDetailModal.tsx        # Modal for editing engine details (hp, fuel, turbo, fluids)
│   ├── FuelTab.tsx                  # Per-vehicle fuel log: fill-ups, L/100km (full-tank method), totals
│   ├── FuelSummaryCard.tsx          # Compact fuel summary card on the Upcoming tab -> opens FuelPage
│   ├── ExpensesTab.tsx              # Per-vehicle expense statistics (summary cards, category breakdown)
│   ├── MonthlyBarChart.tsx          # Pure-CSS stacked monthly spending bar chart (fuel + services)
│   ├── Menu.tsx                     # Side menu
│   ├── SearchSelectModal.tsx        # Searchable select modal for make/model/engine
│   └── ServiceCard.tsx              # Card component grouping services by vehicle with status indicator
├── services/
│   ├── storageService.ts            # localStorage CRUD for vehicles, intervals, records, fuel records
│   ├── serviceConfigService.ts      # Loads config JSON: makes, models, engine variants, service rules
│   ├── reminderService.ts           # Calculates reminder status (overdue/due_soon/ok) and forecasts
│   ├── fuelService.ts               # Fuel consumption (L/100km via full-tank pairs), totals, avg price
│   ├── statsService.ts              # Expense statistics: totals, monthly buckets, per-vehicle, categories
│   ├── currencyService.ts           # ALL-currencies support: detect, list (Intl.supportedValuesOf), format
│   └── vinService.ts                # VIN decoding (local rules-based)
├── store/
│   └── vehicleStore.ts              # Zustand store: vehicles[], serviceIntervals[], serviceRecords[], fuelRecords[]
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

- Store: `useVehicleStore` — single store with `vehicles[]`, `serviceIntervals[]`, `serviceRecords[]`, `fuelRecords[]`
- Actions: `loadData()`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()`, `updateMileage()`, `performService()`, `addCustomInterval()`, `removeInterval()`, `addServiceRecord()`, `updateServiceInterval()`, `addFuelRecord()`, `updateFuelRecord()`, `deleteFuelRecord()`
- **IMPORTANT**: Every state mutation must also call the corresponding `storageService.save*()` function to persist to localStorage. Zustand state + localStorage must stay in sync.
- On app load, `App.tsx` calls `loadData()` which reads all data from localStorage into the store.

### Persistence (src/services/storageService.ts)

- All data stored in localStorage under keys: `csr_vehicles`, `csr_service_intervals`, `csr_service_records`, `csr_fuel_records`
- Storage keys use prefixes (`csr_`) to avoid collisions
- All functions are synchronous (localStorage is sync)
- `saveVehicle()` does upsert (find by id, update or push)
- `deleteVehicle()` also cascades: deletes all intervals, records, and fuel records for that vehicle

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

Exceptions: `EngineDetailModal` and `ExpensesTab` may be conditionally mounted because they are **child components with their own hooks** (e.g., `{vehicle && <EngineDetailModal ... />}` or `{activeTab === 'expenses' && <ExpensesTab ... />}`), so the parent's hook order stays stable. `FuelTab` is rendered by the dedicated `FuelPage` route (not by `VehicleDetail`).

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

Four tabs: Dashboard → Services → Fluids → Expenses
- **Dashboard** (the segment label is `vehicleDetail.tabUpcoming`, displayed as "Dashboard"; internal state value stays `'upcoming'`): Forecast for next 10,000 km (missed + upcoming services with remaining km/days). Also hosts the `FuelSummaryCard` entry point to the fuel page.
- **Services**: All configured service intervals with status indicators (overdue/due_soon/ok). A "History" entry item sits just before the services list and opens the history view.
- **Fluids**: Fluid specifications with inline icons and edit button
- **History**: Not a segment button — a sub-view of Services reached via the entry item; past service records sorted by date (newest first), costs rendered via `formatCurrency()`, with a "Back to Services" item at the top.
- **Expenses**: Per-vehicle spending statistics — `ExpensesTab` child component (CSS bar chart via `MonthlyBarChart`)

`ExpensesTab` is a **child component mounted conditionally** inside the `activeTab` switch (safe — it owns its hooks). Tab switch fires the interstitial ad for `history`, `fluids`, and `expenses`.

## Fuel Tracking

- **`FuelRecord`** (src/types): `{ id, vehicleId, date, odometer, liters, cost, isFullTank, station?, notes? }`
- **Storage**: persisted under `csr_fuel_records`; `deleteVehicle()` cascades and removes fuel records too.
- **Store**: `fuelRecords[]` in `useVehicleStore` + `addFuelRecord`, `updateFuelRecord`, `deleteFuelRecord`.
- **Consumption**: `calcFuelConsumption()` in `src/services/fuelService.ts` uses the full-tank → full-tank method (distance = current odometer − previous odometer; liters = liters added at the current full-tank refuel). Zero/negative distance segments are skipped.
- **Mileage sync**: forward-only — vehicle `currentMileage` is set to `max(currentMileage, odometer)` whenever a fuel or service record is saved. Enforced centrally in the Zustand store via the `bumpVehicleMileage()` helper (used by `addFuelRecord`, `updateFuelRecord`, `addServiceRecord`, `updateServiceRecord`, `performService`). `FuelTab.handleSave` also calls `updateMileage()` explicitly; both paths never roll mileage back.
- **Display order**: fuel logs render **odometer-descending (biggest mileage first)** on `FuelPage`/the fuel list. Consumption math (`sortFuelRecords`/`calcFuelConsumption`) intentionally stays chronological (oldest-first) because the full-tank method needs consecutive pairs.
- **Navigation**: the **Fuel** tab lives on a dedicated page `FuelPage` (`/vehicle/:vehicleId/fuel`). The Upcoming tab shows a compact clickable `FuelSummaryCard` (avg L/100km, total liters, total spend, record count) that opens it via `history.push(\`/vehicle/${vehicle.id}/fuel\`)`.

## Document Tracking

Vehicle documents (registration / carte grise, insurance, vignette, technical inspection, other) are tracked with optional expiry dates so expiring / expired docs surface on the Reminders page.

- **Types**: `DocumentType` enum (`registration`, `insurance`, `vignette`, `technical_inspection`, `other`) and `VehicleDocument` in `src/types/index.ts`: `{ id, vehicleId, documentType, name, expiryDate: string|null, issueDate?, cost?, notes?, renewals? }`.
- **Renewal history**: when an existing paid document is saved again with a different issue date (a renewal), `DocumentsPage.handleSave` archives the previous `{ issueDate, cost, notes }` into `renewals[]` (`DocumentRenewal[]`) instead of overwriting it. Same-date corrections just overwrite. This keeps the old expense visible in statistics.
- **Lifetime docs**: `expiryDate === null` means no renewal (e.g. carte grise). **Registration defaults to lifetime ON** (Tunisia convention) but the user can toggle it off.
- **Status logic**: `getDocumentStatus(expiryDate, today?)` in `src/services/documentService.ts` returns `{ status: 'lifetime'|'expired'|'expiring_soon'|'valid', daysRemaining | null }`. `EXPIRING_SOON_DAYS = 30`. Pure function — reusable anywhere.
- **Ordering**: `DOCUMENT_TYPES` lists the form's type order; `defaultsToLifetime(type)` and `getDefaultDocumentName(type)` (returns a `documentTypes.*` key, `null` for `OTHER`).
- **Storage**: persisted under `csr_vehicle_documents` (`storageService` CRUD); `deleteVehicle()` cascades and removes documents too.
- **Store**: `vehicleDocuments[]` in `useVehicleStore` + `addVehicleDocument`, `updateVehicleDocument`, `deleteVehicleDocument`.
- **UI**:
  - `DocumentsCard` (compact clickable summary card) on the VehicleDetail **Dashboard (upcoming)** tab opens the documents page at `/vehicle/:vehicleId/documents`.
  - `DocumentsPage` (`/vehicle/:vehicleId/documents`) — full add/edit/delete flow: type selector (localized via `documentTypes.*`), name (autofilled, editable, required for `OTHER`), **lifetime toggle**, expiry date (required when renewable), optional issue date + notes, status-sorted list.
  - `Reminders.tsx` lists a **"Documents to renew"** section (`documents.sectionTitle`) for expired / expiring-soon docs, grouped with vehicle context; the empty-state check also considers document alerts.
- **Localization**: type names use `documentTypes.*` (keys match enum values, incl. `technical_inspection`), status text uses `documents.*`. `getDefaultDocumentName` returns a `documentTypes.*` key consumed via `t('documentTypes.' + key)`.

## Expense Statistics

- **`src/services/statsService.ts`** — `getExpenseStats()` returns totals (fuel vs services vs documents), monthly buckets (`YYYY-MM` with empty months filled for fixed periods), per-vehicle breakdown, category breakdown (service record names + a `__fuel__` pseudo category + a `__doc__` documents category), averages, and fleet L/100km.
- Periods: `all | m3 | m6 | m12 | year`. The per-vehicle **Expenses tab** (`ExpensesTab`) and the global **Statistics page** (`/statistics`) both consume this service.
- Charts are **pure CSS** (`MonthlyBarChart`), no chart library.
- **Document renewals count as expenses**: `getExpenseStats` flattens each `VehicleDocument` via `flattenDocumentExpenses()` into its paid issuances (current `cost`/`issueDate` + each `renewal.cost`/`renewal.issueDate`), so a renewed document's previous cost still appears in totals, monthly buckets, per-vehicle breakdown, and categories — in its original month.
- **Refresh on visit**: `Statistics.tsx` calls `loadData()` in `useIonViewWillEnter`; `VehicleDetail.tsx` calls `loadData()` whenever the `'expenses'` tab is opened. So expenses always recalculate from the latest persisted service/document/fuel records (covers Ionic page caching and mutations that bypassed the store).
- **Service costs**: the Perform Service modal's cost input uses both `onIonChange` and `onIonInput` (controlled number input) so typed costs are captured. Logged services are editable/deletable from the History tab (`updateServiceRecord` / `deleteServiceRecord` in the store + `storageService`); all changes reflect immediately in expenses via the reactive Zustand store.

## Currency System (ALL currencies)

- **`src/services/currencyService.ts`**:
  - `getSupportedCurrencies()` — populated from `Intl.supportedValuesOf('currency')` **merged with** the full static `ISO4217_FALLBACK` list (deduped), so **every ISO 4217 code (including TND) is always present** even if the WebView's ICU data is partial. Localized names/symbols come from `Intl.DisplayNames` / `Intl.NumberFormat` so every currency displays correctly in the device locale.
  - `detectDeviceCurrency()` — **timezone-first** detection: `Intl.DateTimeFormat().resolvedOptions().timeZone` → IANA `TIMEZONE_REGION` map → `REGION_CURRENCY` map. This detects the user's actual location (e.g. English-language phone in Tunisia → `Africa/Tunis` → `TN` → TND) instead of mapping the phone language (which would yield GBP). Falls back to the `navigator.language` region, then `TND`.
  - `getCurrency()/setCurrency()/resetCurrency()` — persisted under `csr_currency` (added to `preferencesService.KNOWN_KEYS`).
  - `formatCurrency(amount)` — `Intl.NumberFormat` currency formatting in the device locale.
- **Rule**: every cost shown anywhere must use `formatCurrency()` — never hard-code `TND`. The Settings page (`/settings`) lets the user pick any supported currency or revert to the device default.
- **Settings**: route `/settings` (already declared in the `PagePath` type), menu item with the `settings` icon. The currency picker is a **self-contained searchable modal** in `Settings.tsx` (NOT `SearchSelectModal`): an `IonSearchbar` filters `currencies` by **code, name, or symbol**, a "Use device default" row is pinned at the top (shows detected code/symbol/name), the currently-selected row shows a checkmark, and an empty-state message appears when nothing matches. Tapping a row saves via `handleSelect()` and closes the modal.

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

## Interactive Coach Marks Walkthrough (First-Run Onboarding Tour)

A field-by-field **coach marks** tour that guides the user through setting up their first vehicle, adding documents, logging fuel, and viewing expenses. Built with a custom `CoachMarks` overlay (no third-party library), rendered into `App.tsx` so it persists across page navigation.

### The 23-step flow

| Steps | Page | Targets the user interacts with |
|-------|------|--------------------------------|
| 1 | Dashboard | "Add Vehicle" button |
| 2–10 | AddVehicle | Vehicle name → Make selector → Model selector → Engine selector → Year → Current mileage → Purchase date → Last service (km) → Last service (date) |
| 11 | Dashboard | The newly added vehicle card (tour resumes here after Save) |
| 12–15 | VehicleDetail → DocumentsPage | Documents card → Add button → Cost → **Back button (return to vehicle details)** |
| 16–22 | VehicleDetail → FuelPage | Fuel card → Log Fuel button → Odometer → Liters → Cost → Save → **Back button (return to vehicle details)** |
| 23 | VehicleDetail | Expenses tab — **final step**: the tour completes the moment the user taps it |

The AddVehicle page has **no Save-button coach mark**: after the last input (last-service-date, step 10) the dimming is lifted, the user keeps the natural page scroll, taps Save, and the tour picks back up on the Dashboard vehicle card (step 11) once the route changes to `/dashboard`.

### Architecture

- **`src/components/CoachMarks.tsx`** — the overlay component. Renders 4 absolutely-positioned dim divs (`rgba(0,0,0,0.72)`) that create a "spotlight frame" around the target element (top, bottom, left, right), leaving the target fully visible and tappable. A white rounded-rect ring marks the spotlight. A tooltip card near the target shows the step title, description, progress dots (one per step), and Skip / Next (or Finish on the last step) buttons — **Next renders only on fillable-input steps**; tappable steps (selectors, cards, Add/Save/Back buttons, the final Expenses tab) set `hideNext: true` because tapping the highlighted element itself is the action that advances the tour.
- **Targets** use `[data-tour="..."]` selectors. Each page/child component adds the `data-tour` attribute on the elements to highlight (e.g. `data-tour="vehicle-name"`, `data-tour="last-service-km"`, `data-tour="doc-cost"`). Card child components (`DocumentsCard`, `FuelSummaryCard`) accept and forward `data-tour` via their props.
- **Steps are defined** as a `STEPS[]` array in `CoachMarks.tsx`, each entry: `{ target, titleKey, descKey, route, position }` plus optional flags (`autoAdvance` + `isValid` for input steps, `advanceOnModalOpen` for launcher buttons, `advanceOnModalClose` for the step whose target is inside the modal that closes — e.g. the document cost field and the fuel save button, `completeOnClick` for the final step, `hideNext` to show Skip only on tappable-action steps).
- **i18n** — titles and descriptions use the `tour.*` namespace (e.g. `tour.step1Title`, `tour.step1Desc`, `tour.skip`, `tour.next`, `tour.finish`) translated in all 5 locales.

### Key mechanics (golden rules)

1. **Route-change-only auto-advance** — the tour advances to the next step ONLY when the route actually changes (tracked via `prevPathnameRef`), never merely when the pathname matches. Same-page input steps advance automatically when the field passes its validator (`autoAdvance` + `isValid`); non-input same-page steps advance via the Next button. This prevents same-page steps from auto-skipping.
2. **Modal suppression** — when an `ion-modal.show-modal` (detected via `ionModalDidPresent` / `ionModalDidDismiss` events) opens that does NOT contain the step's target (e.g. the make/model/engine `SearchSelectModal`), the ENTIRE coach-mark overlay (spotlight + dimming + tooltip) is hidden so the full-screen modal stays clean and fully usable; the overlay reappears as soon as the user closes the modal. When the presented modal DOES contain the target (the Documents form modal, the Fuel form modal), the spotlight + tooltip stay visible on the field.
3. **Element polling** — `findTarget()` polls `document.querySelector(step.target)` every 200ms (up to ~60s) so steps whose target only exists after a modal opens eventually resolve. Until found, the tooltip renders centered (no spotlight) so the user is never stuck with a blank screen.
4. **Baseline reset** — `prevPathnameRef` is re-seeded whenever the tour transitions into the active state (first launch or Settings replay) so a stale baseline never causes a spurious immediate advance.
5. **Modal-open / modal-close / final-click auto-advance** — launcher steps (`add-document-btn`, `log-fuel-btn`) set `advanceOnModalOpen`: the tour advances to the first in-modal field the moment the form modal presents. Steps whose target lives inside the form modal (`doc-cost`, `save-fuel-btn`) set `advanceOnModalClose`: the tour advances to the following step when the form modal dismisses — so a failed validation that keeps the modal open does not advance. The final step (`expenses-tab`) sets `completeOnClick`: tapping the target completes the tour and the user can use the app normally.
6. **Route-scoped visibility** — a step's overlay (spotlight + tooltip) renders only while the current pathname matches the step's `route`, via the shared `matchesRoute` helper (extracted from the route-advance switch). Navigating away mid-step hides the overlay and pauses target polling (so the stuck-skip never fires while paused); returning to the page re-runs polling and restores the spotlight with a fresh measurement. This keeps e.g. the vehicle-card tooltip from floating over Statistics or Settings.

### Trigger, persistence, replay

- **First launch** — `App.tsx` runs an effect after an 800ms delay that checks `getString('csr_walkthrough_shown')`. If the flag is unset, **the user has 0 vehicles**, and the current route is `/dashboard`, the tour starts over the (empty) Dashboard.
- **Persistence** — dismissing the tour (Skip, Finish, or backdrop tap) calls `setItem('csr_walkthrough_shown', 'true')`. The key is declared in `preferencesService.ts` `KNOWN_KEYS` so it survives migration.
- **Replay** — the Settings page ("Replay App Tour") calls `removeItem('csr_walkthrough_shown')`, invokes `requestShowWalkthrough()`, and navigates to `/dashboard` so the first coach mark (Add Vehicle button) resolves correctly.

### Files

| File | Purpose |
|------|---------|
| `src/components/CoachMarks.tsx` | The overlay + tooltip + step machine |
| `src/App.tsx` | Render `<CoachMarks>`, first-launch trigger, `WalkthroughContext` (exposes `requestShowWalkthrough`) |
| `src/pages/Settings.tsx` | Replay button (consumes `WalkthroughContext`) |
| `src/pages/Dashboard.tsx` | `data-tour="add-vehicle-btn"` (both empty + list states), `data-tour="vehicle-card"` (first card) |
| `src/pages/AddVehicle.tsx` | 9 `data-tour` attributes (vehicle-name, make/model/engine selectors, year, mileage, purchase-date, last-service-km, last-service-date; no Save-button mark, no services-section mark) |
| `src/pages/VehicleDetail.tsx` | `documents-card`, `fuel-card`, `expenses-tab` |
| `src/pages/DocumentsPage.tsx` | `add-document-btn`, `doc-cost`, `doc-back-btn` (header back button) |
| `src/pages/FuelPage.tsx` | `fuel-back-btn` (header back button) |
| `src/components/FuelTab.tsx` | `log-fuel-btn`, `fuel-odometer`, `fuel-liters`, `fuel-cost`, `save-fuel-btn` |
| `src/components/DocumentsCard.tsx`, `src/components/FuelSummaryCard.tsx` | Accept and forward `data-tour` prop |
| `src/services/preferencesService.ts` | `csr_walkthrough_shown` in `KNOWN_KEYS` |
| `src/locales/*.json` | `tour.*` namespace (step × title/desc + skip/next/finish) |

### How to extend (add a step)

1. Add a `data-tour="my-target"` attribute on the target element in the relevant page/component (forward the prop through any child component).
2. Insert an entry into the `STEPS[]` array in `CoachMarks.tsx` at the right position, with the correct `route` (must match `location.pathname` handling — see the route-advance `switch`).
3. Add `tour.stepNTitle` / `tour.stepNDesc` to all 5 locale files. Renumber the keys of every subsequent step (and update the matching `STEPS` entries) to keep numbering contiguous.
4. Verify the step resolves in both the browser (`npm run dev`) and on the emulator.

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

### Contact Us Page

The Contact Us page (`src/pages/ContactUs.tsx`) provides a form for users to report issues finding their car:

- **Fields**: Make* (required), Model* (required), Engine (optional), Year (optional), Message (optional)
- **Email**: Opens the device's email client with a pre-composed email to `car.services.reminders@gmail.com`
- **Subject**: Translated per locale (e.g., "Car Service Reminder - Issue finding my car")
- **Body**: Pre-filled with the car details the user entered
- **Route**: `/contact-us`
- **Menu**: Accessible from the side menu via a mail icon
- **i18n**: All form labels, placeholders, and the send button are translated in all 5 supported languages (en, fr, ar, es, pt)

### Language Selector & Flags

The side menu (`src/components/Menu.tsx`) contains an `IonSelect` language switcher at the bottom next to the globe icon (`interface="action-sheet"`).

- **5 languages, each shown with a flag emoji** in both the closed selector and the action-sheet options:
  - `en` → 🇬🇧 **English**
  - `fr` → 🇫🇷 **Français**
  - `ar` → 🇸🇦 **العربية**
  - `es` → 🇪🇸 **Español**
  - `pt` → 🇵🇹 **Português**
- The flags are plain text emojis baked into the `LANGUAGES` array in `Menu.tsx` (no image assets or network calls) — they render natively in the Android WebView and browsers.
- On change (`handleLanguageChange`): `i18n.changeLanguage(lang)` updates all translations, `document.documentElement.dir` flips to `rtl` for Arabic (else `ltr`), `document.documentElement.lang` is set, and the menu closes.
- `App.tsx` listens to `i18n.on('languageChanged')` and re-schedules mileage-reminder notifications with the new language's text.

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

## Mileage Update Notifications (Local Notifications)

A system that schedules daily Android notifications at 10:00 AM reminding users to update the mileage of each vehicle.

### Architecture

- **Plugin**: `@capacitor/local-notifications` (v6) — schedules notifications at the native Android OS level
- **Service**: `src/services/notificationService.ts` — handles permission, scheduling, canceling
- **UI Component**: `src/components/PermissionPrompt.tsx` — one-time explanation modal before requesting native permission
- **Integration point**: `src/App.tsx` — initializes scheduling on app start, listens for language changes to re-schedule with updated translations

### Key Behaviors

- **Schedule**: Daily at 10:00 AM (repeating via `every: 'day'`)
- **Per-vehicle**: Each vehicle gets its own notification with the vehicle's make/model in the body
- **Tap action**: Tapping a notification navigates to the vehicle detail page via `extra.vehicleId` in the notification payload
- **Background/closed app**: Works even when the app is not running — scheduled at the Android OS level
- **Permission**: Android 13+ requires explicit user consent. A custom explanation modal (`PermissionPrompt`) is shown once, then triggers the native `POST_NOTIFICATIONS` dialog
- **Translations**: Notification title and body use `i18n.t()` so they respect the app's current language. When the user changes language in the menu, notifications are re-scheduled with the new text
- **Duplicate prevention**: On app start, all existing mileage reminders are canceled before re-scheduling
- **Preference persistence**: Notification enabled/disabled state is saved to localStorage so the user setting survives refresh and app restart.
- **Dashboard UI sync**: Notification banner state is shared across pages so enabling notifications on Reminders immediately hides the dashboard banner.
- **Preference-aware scheduling**: Disabled notifications cancel scheduled reminders and prevent them from being recreated until the user re-enables notifications.

### Notification IDs

Mileage reminders use IDs in the range `1000-1999` (base ID + vehicle index). This range is used by `cancelMileageReminders()` to identify and clean up only mileage-related notifications.

### Files

| File | Purpose |
|------|---------|
| `src/services/notificationService.ts` | Permission, schedule, cancel, check status |
| `src/components/PermissionPrompt.tsx` | Custom one-time permission explanation modal |
| `src/App.tsx` | Initialize scheduling, handle tap navigation, language change listener |

### Testing Locally

To test notifications on an emulator, temporarily uncomment the test schedule in `notificationService.ts`:
```typescript
// Replace the production schedule with this:
schedule: {
  at: new Date(Date.now() + 5000),
},
```
Then rebuild and run. The notification will fire 5 seconds after the app starts.

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

## Release Notes Generation (Play Store)

A dedicated agent drafts the Play Store release notes in the 5-locale format Play
Console expects (`<en-US>`, `<ar>`, `<es-ES>`, `<fr-FR>`, `<pt-PT>`).

- **Drafting script**: `scripts/generate-release-notes.cjs` — reads
  `versionCode`/`versionName` from `android/app/build.gradle`, collects user-facing
  commits since the last versionCode bump, rewrites each as a bullet, translates it
  into all five locales (curated dictionary matching the published style), and
  prints the `Release notes;` block. Run via `npm run release-notes`.
  Useful flags: `--json` (structured commit data), `--from/--to` (override range),
  `--output <file>`, `--all`.
- **OpenCode agent**: `.opencode/agent/release-notes-generator.md`
- **Cline workflow**: `.clinerules/workflows/release-notes-generator.md`
  (invoke with `/release-notes-generator`)

The agent always reviews the script's draft (git history does not map 1:1 to Play
Store releases), splits compound commits, drops docs/scripts/version-bump noise,
and polishes the translations. It never bumps `versionCode`/`versionName` — that
is a manual step in `android/app/build.gradle`.

## Windows Android Emulator Environment

The Windows build/emulator environment is fully documented in the skill `skills/windows-android-emulator-setup/SKILL.md` with idempotent automation scripts in `scripts/android-env/`. Read that skill before touching the Android toolchain.

### Key facts (do not re-derive)

- **SDK root**: `%ANDROID_SDK_HOME%` or default `G:\Android` — contains everything: JDKs, cmdline-tools, packages, emulator
- **JDK split (critical)**: `sdkmanager`/`avdmanager` require `JAVA_HOME=G:\Android\jdk-17`; Gradle (`gradlew`) requires `JAVA_HOME=G:\Android\jdk-21`. Mixing these is the #1 failure cause
- **AVD**: `csr_avd` = Pixel 7, API 35, google_apis x86_64; system image `system-images;android-35;google_apis;x86_64`
- **Project wiring**: `android/local.properties` must contain `sdk.dir=G\:\\Android` (escaped colon + backslashes)
- **App**: `com.carservice.reminder`; APK output at `android/app/build/outputs/apk/debug/app-debug.apk`
- **npm build scripts**: `npm run android:debug` / `android:aab` / `android:release` wrap Gradle tasks cross-platform via `scripts/android-build.cjs` (handles JAVA_HOME + `gradlew.bat` vs `./gradlew` per OS)
- **Acceleration**: AEHD driver (needs admin to install) or WHPX if Hyper-V is on — both work

### Automation scripts (all idempotent, honor ANDROID_SDK_HOME override)

| Script | Purpose |
|---|---|
| `scripts\android-env\check-env.cmd` | PASS/FAIL audit of every component (run this FIRST) |
| `scripts\android-env\install-jdk.cmd [17\|21]` | Temurin JDK install into SDK root |
| `scripts\android-env\install-sdk.cmd` | cmdline-tools bootstrap + licenses + all SDK packages |
| `scripts\android-env\install-aehd.cmd` | AEHD package + silent driver install |
| `scripts\android-env\create-avd.cmd` | Creates `csr_avd` if missing |
| `scripts\android-env\run-emulator.cmd` | accel-check + boot + wait for BOOT_COMPLETED |
| `scripts\android-env\build-and-run.cmd` | npm build → cap sync → APK → adb install → launch |
| `scripts\android-env\build-aab.cmd` | Signed release AAB for Play Store (`bundleRelease`, uses JDK 21) |

### Agent / workflow entry points

- **OpenCode agent**: `.opencode/agent/android-env-setup.md`
- **OpenCode skill discovery**: `.opencode/skill/windows-android-emulator-setup/SKILL.md`
- **Cline workflow**: `.clinerules/workflows/setup-android-env.md` (invoke with `/setup-android-env`)

When asked to set up, fix, or verify the emulator environment: run `check-env.cmd`, fix only the FAILs with the matching script, then verify end-to-end via `run-emulator.cmd` + `build-and-run.cmd`.

## VIN Service

The VIN service (`src/services/vinService.ts`) is a local rules-based decoder using WMI codes for most makes. It decodes VINs client-side without external APIs.
