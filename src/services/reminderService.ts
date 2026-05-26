import { ServiceInterval, Vehicle, EngineSpec } from '../types';
import { addMonths, differenceInDays, parseISO, isBefore } from 'date-fns';

export interface ReminderStatus {
  interval: ServiceInterval;
  vehicle: Vehicle;
  status: 'overdue' | 'due_soon' | 'ok';
  remainingKm: number | null;
  remainingDays: number | null;
  nextDueKm: number | null;
  nextDueDate: string | null;
}

export interface ServiceForecastItem {
  interval: ServiceInterval;
  vehicle: Vehicle;
  status: 'overdue' | 'upcoming';
  /** How many km until due (negative for overdue, positive for upcoming) */
  remainingKm: number | null;
  /** How many days until due (negative for overdue, positive for upcoming) */
  remainingDays: number | null;
  /** The mileage at which this service will be due */
  dueAtKm: number | null;
  /** The date at which this service will be due */
  dueDate: string | null;
  /** Category for display grouping */
  category: 'missed' | 'upcoming_km';
  /** Relevant engine spec fields to show */
  fluidSpecs: {
    oilNorm?: string;
    brakeFluidType?: string;
    coolantType?: string;
    gearboxOilType?: string;
    gearboxOilCapacity?: string;
  };
}

export function calculateReminderStatus(
  interval: ServiceInterval,
  vehicle: Vehicle,
  warningKm: number = 1000,
  warningDays: number = 30
): Omit<ReminderStatus, 'vehicle' | 'interval'> {
  let status: 'overdue' | 'due_soon' | 'ok' = 'ok';
  let remainingKm: number | null = null;
  let remainingDays: number | null = null;
  let nextDueKm: number | null = null;
  let nextDueDate: string | null = null;

  // Check by mileage
  if (interval.intervalMileage && vehicle.currentMileage != null) {
    const lastMileage = interval.lastPerformedMileage ?? 0;
    const nextKm = lastMileage + interval.intervalMileage;
    nextDueKm = nextKm;
    remainingKm = nextKm - vehicle.currentMileage;

    if (remainingKm <= 0) {
      status = 'overdue';
    } else if (remainingKm <= warningKm) {
      status = 'due_soon';
    }
  }

  // Check by date
  if (interval.intervalMonths && interval.lastPerformedDate) {
    try {
      const lastDate = parseISO(interval.lastPerformedDate);
      const nextDate = addMonths(lastDate, interval.intervalMonths);
      nextDueDate = nextDate.toISOString().split('T')[0];
      remainingDays = differenceInDays(nextDate, new Date());

      if (remainingDays <= 0) {
        status = 'overdue';
      } else if (remainingDays <= warningDays) {
        status = 'due_soon';
      }
    } catch {
      // Invalid date, skip
    }
  } else if (interval.intervalMonths && !interval.lastPerformedDate && vehicle.purchaseDate) {
    // First time - use purchase date as baseline
    try {
      const lastDate = parseISO(vehicle.purchaseDate);
      const nextDate = addMonths(lastDate, interval.intervalMonths);
      nextDueDate = nextDate.toISOString().split('T')[0];
      remainingDays = differenceInDays(nextDate, new Date());

      if (remainingDays <= 0) {
        status = 'overdue';
      } else if (remainingDays <= warningDays) {
        status = 'due_soon';
      }
    } catch {
      // skip
    }
  }

  return { status, remainingKm, remainingDays, nextDueKm, nextDueDate };
}

/**
 * Computes the forecast for upcoming services within the next 10000km
 * and missed services (overdue).
 */
export function getUpcomingServiceForecast(
  vehicle: Vehicle,
  intervals: ServiceInterval[],
  engineSpec: EngineSpec | null
): ServiceForecastItem[] {
  const forecast: ServiceForecastItem[] = [];
  const forecastKmWindow = 10000;

  for (const interval of intervals) {
    const status = calculateReminderStatus(interval, vehicle);
    const fluidSpecs = getFluidSpecsForService(interval, engineSpec);

    // Track overdue services
    if (status.status === 'overdue') {
      forecast.push({
        interval,
        vehicle,
        status: 'overdue',
        remainingKm: status.remainingKm,
        remainingDays: status.remainingDays,
        dueAtKm: status.nextDueKm,
        dueDate: status.nextDueDate,
        category: 'missed',
        fluidSpecs,
      });
      continue;
    }

    // Check mileage-based upcoming services within the window
    if (interval.intervalMileage && vehicle.currentMileage != null) {
      const lastMileage = interval.lastPerformedMileage ?? 0;
      const nextKm = lastMileage + interval.intervalMileage;
      const remaining = nextKm - vehicle.currentMileage;

      // If it will become due within the next 10000km
      if (remaining > 0 && remaining <= forecastKmWindow) {
        forecast.push({
          interval,
          vehicle,
          status: 'upcoming',
          remainingKm: remaining,
          remainingDays: status.remainingDays,
          dueAtKm: nextKm,
          dueDate: status.nextDueDate,
          category: 'upcoming_km',
          fluidSpecs,
        });
      }
    }

    // Also check if the time-based reminder is coming up but mileage wasn't tracked
    if (!interval.intervalMileage && status.remainingDays !== null && status.remainingDays > 0 && status.remainingDays <= 30) {
      // Only add if not already added above
      if (!forecast.find(f => f.interval.id === interval.id)) {
        forecast.push({
          interval,
          vehicle,
          status: 'upcoming',
          remainingKm: null,
          remainingDays: status.remainingDays,
          dueAtKm: null,
          dueDate: status.nextDueDate,
          category: 'upcoming_km',
          fluidSpecs,
        });
      }
    }
  }

  // Sort: missed first (most overdue first), then upcoming (soonest first)
  forecast.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === 'missed' ? -1 : 1;
    }
    // Within same category, sort by most urgent (smallest/d smallest remaining value)
    const aRemaining = a.remainingKm ?? a.remainingDays ?? Infinity;
    const bRemaining = b.remainingKm ?? b.remainingDays ?? Infinity;
    return aRemaining - bRemaining;
  });

  return forecast;
}

/**
 * Returns the relevant engine fluid specs for a service type.
 */
function getFluidSpecsForService(
  interval: ServiceInterval,
  engineSpec: EngineSpec | null
): { oilNorm?: string; brakeFluidType?: string; coolantType?: string; gearboxOilType?: string; gearboxOilCapacity?: string } {
  const specs: { oilNorm?: string; brakeFluidType?: string; coolantType?: string; gearboxOilType?: string; gearboxOilCapacity?: string } = {};

  if (!engineSpec) return specs;

  switch (interval.serviceType) {
    case 'oil_change':
    case 'oil_filter':
      if (engineSpec.oilNorm) specs.oilNorm = engineSpec.oilNorm;
      break;
    case 'brake_fluid':
      if (engineSpec.brakeFluidType) specs.brakeFluidType = engineSpec.brakeFluidType;
      break;
    case 'coolant':
      if (engineSpec.coolantType) specs.coolantType = engineSpec.coolantType;
      break;
    case 'transmission_fluid':
      if (engineSpec.gearboxOilType) specs.gearboxOilType = engineSpec.gearboxOilType;
      if (engineSpec.gearboxOilCapacity) specs.gearboxOilCapacity = engineSpec.gearboxOilCapacity;
      break;
  }

  return specs;
}

export function getAllReminders(
  intervals: ServiceInterval[],
  vehicles: Vehicle[]
): ReminderStatus[] {
  const reminders: ReminderStatus[] = [];

  for (const interval of intervals) {
    const vehicle = vehicles.find(v => v.id === interval.vehicleId);
    if (!vehicle) continue;

    const status = calculateReminderStatus(interval, vehicle);
    reminders.push({ interval, vehicle, ...status });
  }

  // Sort: overdue first, then due_soon, then ok
  reminders.sort((a, b) => {
    const order = { overdue: 0, due_soon: 1, ok: 2 };
    const aOrder = order[a.status];
    const bOrder = order[b.status];
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Within same status, sort by remaining km/days (most urgent first)
    const aRemaining = a.remainingKm ?? a.remainingDays ?? Infinity;
    const bRemaining = b.remainingKm ?? b.remainingDays ?? Infinity;
    return aRemaining - bRemaining;
  });

  return reminders;
}