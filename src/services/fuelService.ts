/**
 * Fuel tracking helpers.
 *
 * Average consumption uses the standard full-tank → full-tank method:
 * for each pair of consecutive full-tank refuels, distance = current odometer
 * - previous odometer; liters = liters added at the current refuel.
 * L/100km = liters / distance * 100.
 */
import { FuelRecord } from '../types';

export interface FuelSegment {
  record: FuelRecord; // the "to" record (must be full tank)
  liters: number;
  distanceKm: number;
  lPer100km: number;
}

export interface FuelStats {
  segments: FuelSegment[];
  avgLPer100km: number | null;
  totalLiters: number;
  totalCost: number;
  avgPricePerLiter: number | null;
  count: number;
}

/** Sort fuel records chronologically (oldest first is the active order). */
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
    if (!curr.isFullTank) continue; // only compute up to a full-tank refuel
    const distanceKm = curr.odometer - prev.odometer;
    if (distanceKm <= 0) continue; // guard against zero/negative distance
    const lPer100km = (curr.liters / distanceKm) * 100;
    segments.push({
      record: curr,
      liters: curr.liters,
      distanceKm,
      lPer100km,
    });
  }

  const totalLiters = records.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalLitersInSegments = segments.reduce((sum, s) => sum + s.liters, 0);
  const totalDistanceInSegments = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const perLiterTotals = records
    .filter(r => r.liters > 0 && r.cost > 0)
    .reduce((sum, r) => sum + r.cost / r.liters, 0);
  const perLiterCount = records.filter(r => r.liters > 0 && r.cost > 0).length;

  const avgLPer100km =
    totalDistanceInSegments > 0
      ? (totalLitersInSegments / totalDistanceInSegments) * 100
      : null;

  return {
    segments,
    avgLPer100km,
    totalLiters,
    totalCost,
    avgPricePerLiter: perLiterCount > 0 ? perLiterTotals / perLiterCount : null,
    count: records.length,
  };
}