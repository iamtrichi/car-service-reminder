/**
 * Fuel / energy tracking helpers.
 *
 * The refuel log tracks BOTH fuel (ICE/HEV) and electricity (BEV/PHEV):
 * - fuel records hold liters -> consumption in L/100km
 * - electric records hold kWh (stored in the historical `liters` field) -> kWh/100km
 *
 * Consumption always uses the standard full-tank -> full-tank method:
 * for each pair of consecutive full events (tank full or battery full), distance =
 * current odometer - previous odometer; amount = the amount added at the current
 * refuel/charge. Per 100 km = amount / distance x 100.
 *
 * For PHEVs (which log both kinds), per-type L/100km and kWh/100km are inherently
 * approximate (one odometer delta mixes both energy sources), so we also expose a
 * combined `avgCostPer100km` over all full->full segments.
 *
 * `liters` is the historical field name; for electric records it holds kWh.
 * Back-compat: records without `energyType` are treated as fuel records.
 */
import { FuelRecord, Vehicle, EnergyType } from '../types';

export type VehicleEnergy = EnergyType | 'both'; // 'both' = plug-in hybrid (PHEV)

/**
 * Classify a vehicle by its fuel type + engine name. The engine name is the
 * reliable disambiguator: some make configs label plug-in hybrids with
 * fuelType: "Electric" (e.g. Audi e-tron PHEV, Alfa Tonale Plug-in Hybrid).
 */
export function classifyEnergy(fuelType?: string, engineName?: string): VehicleEnergy {
  const fuel = (fuelType || '').toLowerCase();
  const name = (engineName || '').toLowerCase();
  if (fuel.includes('electric')) {
    return /plug-?in|phev|hybrid/i.test(name) ? 'both' : 'electric';
  }
  return 'fuel';
}

/** Convenience wrapper for `classifyEnergy` from a vehicle's own fields. */
export function getVehicleEnergyType(v: Pick<Vehicle, 'fuelType' | 'engineName'>): VehicleEnergy {
  return classifyEnergy(v.fuelType, v.engineName);
}

/** True when a record logs electricity (kWh) instead of fuel (liters). */
export function isElectricRecord(r: FuelRecord): boolean {
  return (r.energyType || 'fuel') === 'electric';
}

export interface FuelSegment {
  record: FuelRecord; // the "to" record (must be full — tank or battery)
  energy: number; // L (fuel) or kWh (electric) added at the current event
  distanceKm: number;
  per100km: number; // L/100km or kWh/100km depending on record.energyType
}

export interface FuelStats {
  segments: FuelSegment[];
  avgLPer100km: number | null; // fuel-energy segments only (L/100km)
  avgKwhPer100km: number | null; // electric-energy segments only (kWh/100km)
  totalLiters: number; // fuel records' liters
  totalKwh: number; // electric records' kWh
  totalCost: number; // ALL records' cost (fuel + electric)
  avgPricePerLiter: number | null; // fuel records only
  avgPricePerKwh: number | null; // electric records only
  avgCostPer100km: number | null; // ALL full->full segments — combined cost per 100km (PHEV economy)
  count: number; // all records
}

/** Sort energy records chronologically (oldest first is the active order). */
export function sortFuelRecords(records: FuelRecord[]): FuelRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() ||
             a.odometer - b.odometer
  );
}

export function calcFuelConsumption(records: FuelRecord[]): FuelStats {
  const sorted = sortFuelRecords(records);
  const segments: FuelSegment[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!curr.isFullTank) continue; // only compute up to a full refuel/charge
    const distanceKm = curr.odometer - prev.odometer;
    if (distanceKm <= 0) continue; // guard against zero/negative distance
    segments.push({
      record: curr,
      energy: curr.liters,
      distanceKm,
      per100km: (curr.liters / distanceKm) * 100,
    });
  }

  const fuelRecs = records.filter(r => !isElectricRecord(r));
  const evRecs = records.filter(isElectricRecord);

  const totalLiters = fuelRecs.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalKwh = evRecs.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  const fuelSegs = segments.filter(s => !isElectricRecord(s.record));
  const evSegs = segments.filter(s => isElectricRecord(s.record));
  const fuelDist = fuelSegs.reduce((sum, s) => sum + s.distanceKm, 0);
  const evDist = evSegs.reduce((sum, s) => sum + s.distanceKm, 0);

  const avgLPer100km =
    fuelDist > 0
      ? (fuelSegs.reduce((sum, s) => sum + s.energy, 0) / fuelDist) * 100
      : null;
  const avgKwhPer100km =
    evDist > 0
      ? (evSegs.reduce((sum, s) => sum + s.energy, 0) / evDist) * 100
      : null;

  const perLiterTotals = fuelRecs
    .filter(r => r.liters > 0 && r.cost > 0)
    .reduce((sum, r) => sum + r.cost / r.liters, 0);
  const perLiterCount = fuelRecs.filter(r => r.liters > 0 && r.cost > 0).length;
  const perKwhTotals = evRecs
    .filter(r => r.liters > 0 && r.cost > 0)
    .reduce((sum, r) => sum + r.cost / r.liters, 0);
  const perKwhCount = evRecs.filter(r => r.liters > 0 && r.cost > 0).length;

  const totalSegDist = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const totalSegCost = segments.reduce((sum, s) => sum + (s.record.cost || 0), 0);
  const avgCostPer100km = totalSegDist > 0 ? (totalSegCost / totalSegDist) * 100 : null;

  return {
    segments,
    avgLPer100km,
    avgKwhPer100km,
    totalLiters,
    totalKwh,
    totalCost,
    avgPricePerLiter: perLiterCount > 0 ? perLiterTotals / perLiterCount : null,
    avgPricePerKwh: perKwhCount > 0 ? perKwhTotals / perKwhCount : null,
    avgCostPer100km,
    count: records.length,
  };
}