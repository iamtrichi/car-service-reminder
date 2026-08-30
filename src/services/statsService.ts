/**
 * Expense & fuel statistics engine (pure functions, no IO).
 */
import { Vehicle, ServiceRecord, FuelRecord, VehicleDocument } from '../types';
import { calcFuelConsumption, sortFuelRecords } from './fuelService';

export type ExpensePeriod = 'all' | 'm3' | 'm6' | 'm12' | 'year';

export interface MonthlyBucket {
  key: string; // 'YYYY-MM'
  label: string; // short month+year label
  fuelCost: number;
  serviceCost: number;
  documentCost: number;
  total: number;
}

export interface VehicleBreakdown {
  vehicleId: string;
  name: string;
  fuel: number;
  services: number;
  documents: number;
  total: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  amount: number;
  count: number;
  share: number; // 0..1 of total spend
}

export interface ExpenseStats {
  totalSpent: number;
  fuelSpent: number;
  serviceSpent: number;
  documentSpent: number;
  fuelCount: number;
  serviceCount: number;
  documentCount: number;
  monthly: MonthlyBucket[];
  perVehicle: VehicleBreakdown[];
  categories: CategoryBreakdown[];
  avgPerMonth: number;
  avgConsumption: number | null; // L/100km
}

export interface ExpenseStatsInput {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  vehicleDocuments: VehicleDocument[];
  vehicleId?: string; // filter to one vehicle; empty/__all__ = all
  period: ExpensePeriod;
}

function applyPeriod<T extends { date?: string; performedAtDate?: string; issueDate?: string }>(
  items: T[],
  period: ExpensePeriod
): T[] {
  if (period === 'all') return items;
  const now = new Date();
  let from: Date | null = null;

  if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'm3' || period === 'm6' || period === 'm12') {
    const months = period === 'm3' ? 3 : period === 'm6' ? 6 : 12;
    from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  }

  if (!from) return items;
  const fromTime = from.getTime();
  return items.filter(item => {
    const date = item.date || item.performedAtDate || item.issueDate;
    if (!date) return true;
    return new Date(date).getTime() >= fromTime;
  });
}

/** Build a monthly chart keyed YYYY-MM, filling in empty months within the period. */
function buildMonthlyBuckets(period: ExpensePeriod): Map<string, MonthlyBucket> {
  const now = new Date();
  const map = new Map<string, MonthlyBucket>();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'year') {
    start.setMonth(0);
  } else if (period === 'm3') {
    start.setMonth(start.getMonth() - 2);
  } else if (period === 'm6') {
    start.setMonth(start.getMonth() - 5);
  } else if (period === 'm12') {
    start.setMonth(start.getMonth() - 11);
  }

  // For 'all' we don't pre-fill; buckets are created on demand.
  if (period !== 'all') {
    const cursor = new Date(start);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, {
        key,
        label: `${monthNames[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`,
        fuelCost: 0,
        serviceCost: 0,
        documentCost: 0,
        total: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return map;
}

function monthKey(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Flatten a vehicle document into its paid-issuance expense entries.
 * The current issuance is always first, followed by any archived renewals,
 * each carrying the issueDate (falling back to an empty string) and cost.
 * Returns only entries that actually have a cost.
 */
function flattenDocumentExpenses(d: VehicleDocument): { date: string; cost: number }[] {
  const out: { date: string; cost: number }[] = [];
  if ((d.cost ?? 0) > 0) {
    out.push({ date: d.issueDate || '', cost: d.cost || 0 });
  }
  for (const r of d.renewals || []) {
    if ((r.cost ?? 0) > 0) {
      out.push({ date: r.issueDate || '', cost: r.cost || 0 });
    }
  }
  return out;
}
export function getExpenseStats(input: ExpenseStatsInput): ExpenseStats {
  const { vehicles, serviceRecords, fuelRecords, vehicleDocuments, vehicleId, period } = input;

  const vehFree = !vehicleId || vehicleId === '__all__';
  const vehRecords = (vehFree ? serviceRecords : serviceRecords.filter(r => r.vehicleId === vehicleId));
  const vehFuel = (vehFree ? fuelRecords : fuelRecords.filter(r => r.vehicleId === vehicleId));
  const vehDocuments = (vehFree ? vehicleDocuments : vehicleDocuments.filter(d => d.vehicleId === vehicleId));

  const records = applyPeriod(vehRecords, period);
  const fuels = applyPeriod(vehFuel, period);
  // Flatten each document into its paid issuances (current + archived renewals)
  // so renewals keep their own issueDate/cost and remain in the correct month.
  const docExpenses = vehDocuments.flatMap(flattenDocumentExpenses);
  const documents = applyPeriod(docExpenses, period);

  const serviceSpent = records.reduce((s, r) => s + (r.cost || 0), 0);
  const fuelSpent = fuels.reduce((s, r) => s + (r.cost || 0), 0);
  const documentSpent = documents.reduce((s, d) => s + d.cost, 0);
  const totalSpent = serviceSpent + fuelSpent + documentSpent;

  const serviceCount = records.filter(r => (r.cost || 0) > 0).length;
  const fuelCount = fuels.length;
  const documentCount = documents.length;

  // Monthly buckets
  const monthlyMap = buildMonthlyBuckets(period);
  for (const r of records) {
    if (!r.performedAtDate) continue;
    const key = monthKey(r.performedAtDate);
    const b = monthlyMap.get(key) || { key, label: key, fuelCost: 0, serviceCost: 0, documentCost: 0, total: 0 };
    b.serviceCost += r.cost || 0;
    b.total += r.cost || 0;
    monthlyMap.set(key, b);
  }
  for (const f of fuels) {
    if (!f.date) continue;
    const key = monthKey(f.date);
    const b = monthlyMap.get(key) || { key, label: key, fuelCost: 0, serviceCost: 0, documentCost: 0, total: 0 };
    b.fuelCost += f.cost || 0;
    b.total += f.cost || 0;
    monthlyMap.set(key, b);
  }
  for (const d of documents) {
    if (!d.date || d.cost <= 0) continue;
    const key = monthKey(d.date);
    const b = monthlyMap.get(key) || { key, label: key, fuelCost: 0, serviceCost: 0, documentCost: 0, total: 0 };
    b.documentCost += d.cost;
    b.total += d.cost;
    monthlyMap.set(key, b);
  }
  const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Per vehicle breakdown
  const perVehicle: VehicleBreakdown[] = [];
  const targetVehicles = vehFree ? vehicles : vehicles.filter(v => v.id === vehicleId);
  for (const v of targetVehicles) {
    const sv = vehRecords.filter(r => r.vehicleId === v.id).reduce((s, r) => s + (r.cost || 0), 0);
    const fl = vehFuel.filter(r => r.vehicleId === v.id).reduce((s, r) => s + (r.cost || 0), 0);
    const dc = vehDocuments
      .filter(d => d.vehicleId === v.id)
      .flatMap(flattenDocumentExpenses)
      .reduce((s, d) => s + d.cost, 0);
    perVehicle.push({
      vehicleId: v.id,
      name: v.make && v.model ? `${v.make} ${v.model}` : v.name,
      fuel: fl,
      services: sv,
      documents: dc,
      total: sv + fl + dc,
    });
  }

  // Category breakdown (service record names + Fuel pseudo-category)
  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const f of fuels) {
    const cat = categoryMap.get('__fuel__') || { amount: 0, count: 0 };
    cat.amount += f.cost || 0;
    cat.count += 1;
    categoryMap.set('__fuel__', cat);
  }
  for (const r of records) {
    const key = r.name || r.serviceType || 'Other';
    const cat = categoryMap.get(key) || { amount: 0, count: 0 };
    cat.amount += r.cost || 0;
    cat.count += 1;
    categoryMap.set(key, cat);
  }
  for (const d of documents) {
    if (d.cost <= 0) continue;
    const cat = categoryMap.get('__doc__') || { amount: 0, count: 0 };
    cat.amount += d.cost;
    cat.count += 1;
    categoryMap.set('__doc__', cat);
  }
  const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([id, v]) => ({
      id,
      name: id === '__fuel__' ? '__fuel__' : id,
      amount: v.amount,
      count: v.count,
      share: totalSpent > 0 ? v.amount / totalSpent : 0,
    }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Averages
  const distinctMonths = new Set(monthly.filter(b => b.total > 0).map(b => b.key));
  const avgPerMonth = distinctMonths.size > 0 ? totalSpent / distinctMonths.size : totalSpent > 0 ? totalSpent : 0;

  // Average consumption (L/100km) across the selected scope
  let avgConsumption: number | null = null;
  const scopedVehicles = vehFree
    ? vehicles.filter(v => vehFuel.some(f => f.vehicleId === v.id))
    : (vehFuel.length > 0 ? vehicles.filter(v => v.id === vehicleId) : []);
  if (scopedVehicles.length > 0) {
    const consumed = scopedVehicles.map(v => {
      const stats = calcFuelConsumption(vehFuel.filter(f => f.vehicleId === v.id));
      return stats.avgLPer100km;
    }).filter((x): x is number => x !== null);
    if (consumed.length > 0) {
      avgConsumption = consumed.reduce((s, c) => s + c, 0) / consumed.length;
    }
  }

  return {
    totalSpent,
    fuelSpent,
    serviceSpent,
    documentSpent,
    fuelCount,
    serviceCount,
    documentCount,
    monthly,
    perVehicle,
    categories,
    avgPerMonth,
    avgConsumption,
  };
}

/** Reprocess raw service/fuel/documents into period-filtered ordered lists. */
export function prepareExpensePeriod(
  period: ExpensePeriod,
  serviceRecords: ServiceRecord[],
  fuelRecords: FuelRecord[],
  vehicleDocuments: VehicleDocument[],
  vehicleId?: string
) {
  const vehFree = !vehicleId || vehicleId === '__all__';
  const records = vehFree ? serviceRecords : serviceRecords.filter(r => r.vehicleId === vehicleId);
  const fuels = vehFree ? fuelRecords : fuelRecords.filter(r => r.vehicleId === vehicleId);
  const docs = vehFree ? vehicleDocuments : vehicleDocuments.filter(d => d.vehicleId === vehicleId);
  return {
    serviceRecords: applyPeriod(records, period),
    fuelRecords: applyPeriod(sortFuelRecords(fuels), period),
    vehicleDocuments: applyPeriod(docs, period),
  };
}