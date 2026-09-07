// Smoke test for fuel/stats pure logic (run with node, uses Node 24 type stripping)
import { calcFuelConsumption, sortFuelRecords } from '../src/services/fuelService.ts';
import { getExpenseStats } from '../src/services/statsService.ts';

const fuel = [
  { id: 'a', vehicleId: 'v1', date: '2026-01-01', odometer: 1000, liters: 40, cost: 100, isFullTank: true },
  { id: 'b', vehicleId: 'v1', date: '2026-02-01', odometer: 1500, liters: 45, cost: 120, isFullTank: true },
  { id: 'c', vehicleId: 'v1', date: '2026-03-01', odometer: 1900, liters: 20, cost: 50, isFullTank: false },
  { id: 'd', vehicleId: 'v1', date: '2026-04-01', odometer: 2300, liters: 44, cost: 110, isFullTank: true },
];

const stats = calcFuelConsumption(fuel);
console.log('segments', stats.segments.length);
console.log('avgLPer100km', stats.avgLPer100km?.toFixed(3));
console.log('totalLiters', stats.totalLiters);
console.log('totalCost', stats.totalCost);
console.log('avgPricePerLiter', stats.avgPricePerLiter?.toFixed(4));
console.log('sortedFirstLast', sortFuelRecords(fuel)[0].id, sortFuelRecords(fuel)[3].id);

// Assertions
import assert from 'assert';
assert.ok(Math.abs((stats.avgLPer100km ?? 0) - (89 / 900) * 100) < 0.001);
assert.strictEqual(stats.segments.length, 2);
assert.strictEqual(stats.totalLiters, 149);
assert.strictEqual(stats.totalCost, 380);
assert.strictEqual(sortFuelRecords(fuel)[0].id, 'a');

const expenses = getExpenseStats({
  vehicles: [{ id: 'v1', name: 'Car', make: 'VW', model: 'Golf', year: 2020, currentMileage: 2300, createdAt: 'x' }],
  serviceRecords: [
    { id: 's1', vehicleId: 'v1', serviceType: 'oil_change', name: 'oil_change', performedAtMileage: 500, performedAtDate: '2026-02-15', cost: 90 },
  ],
  fuelRecords: fuel,
  period: 'all',
});
console.log('expense total', expenses.totalSpent);
console.log('serviceCount', expenses.serviceCount, 'fuelCount', expenses.fuelCount);
console.log('monthly buckets', expenses.monthly.map(m => `${m.key}:${m.total}`).join(','));
console.log('categories', expenses.categories.map(c => `${c.id}:${c.amount}`).join(','));
console.log('avgConsumption', expenses.avgConsumption?.toFixed(3));
assert.strictEqual(expenses.totalSpent, 470);
assert.strictEqual(expenses.serviceCount, 1);
assert.strictEqual(expenses.fuelCount, 4);
assert.strictEqual(expenses.monthly.length, 4);
assert.ok(expenses.categories.some(c => c.id === 'oil_change' && c.amount === 90));
assert.ok(expenses.categories.some(c => c.id === '__fuel__' && c.amount === 380));
assert.ok(expenses.avgConsumption !== null);

// Period filter m3 (current month is 2026-04 based? we use real Date, so this is environment-dependent).
// Just sanity check it runs without throwing.
const m3 = getExpenseStats({
  vehicles: [{ id: 'v1', name: 'Car', make: 'VW', model: 'Golf', year: 2020, currentMileage: 2300, createdAt: 'x' }],
  serviceRecords: [{ id: 's1', vehicleId: 'v1', serviceType: 'oil_change', name: 'x', performedAtMileage: 500, performedAtDate: '2026-02-15', cost: 90 }],
  fuelRecords: fuel,
  period: 'm3',
});
console.log('m3 totalSpent', m3.totalSpent, 'months', m3.monthly.length);

console.log('\nALL ASSERTS PASSED ✔');
// --- EV (pure electric) consumption: full->full over kWh records -> kWh/100km ---
const ev = [
  { id: 'e1', vehicleId: 'ev1', date: '2026-01-01', odometer: 1000, liters: 40, cost: 20, isFullTank: true, energyType: 'electric' },
  { id: 'e2', vehicleId: 'ev1', date: '2026-02-01', odometer: 1400, liters: 44, cost: 22, isFullTank: true, energyType: 'electric' },
];
const evStats = calcFuelConsumption(ev);
console.log('ev avgLPer100km (expect null)', evStats.avgLPer100km);
console.log('ev avgKwhPer100km (expect 11.0)', evStats.avgKwhPer100km?.toFixed(3));
console.log('ev totalLiters (expect 0)', evStats.totalLiters, 'ev totalKwh (expect 84)', evStats.totalKwh);
assert.strictEqual(evStats.avgLPer100km, null, 'pure EV has no L/100km');
// EV segment: e2 (full) over dist 400 with e2.liters=44 -> 44/400*100 = 11.0
assert.ok(Math.abs((evStats.avgKwhPer100km ?? 0) - (44 / 400) * 100) < 0.001, 'EV kWh/100km');
assert.strictEqual(evStats.totalLiters, 0, 'EV has no liters total');
assert.strictEqual(evStats.totalKwh, 84, 'EV kWh total = sum');
assert.strictEqual(evStats.totalCost, 42, 'EV total cost = sum');

// --- PHEV (mixed fuel + electric): per-type totals + combined cost/100km ---
const phev = [
  { id: 'p1', vehicleId: 'ph1', date: '2026-01-01', odometer: 1000, liters: 40, cost: 120, isFullTank: true, energyType: 'fuel' },
  { id: 'p2', vehicleId: 'ph1', date: '2026-02-01', odometer: 1400, liters: 30, cost: 15, isFullTank: true, energyType: 'electric' },
  { id: 'p3', vehicleId: 'ph1', date: '2026-03-01', odometer: 1900, liters: 45, cost: 135, isFullTank: true, energyType: 'fuel' },
];
const phevStats = calcFuelConsumption(phev);
console.log('phev totalLiters (expect 85)', phevStats.totalLiters, 'phev totalKwh (expect 30)', phevStats.totalKwh);
console.log('phev avgCostPer100km', phevStats.avgCostPer100km?.toFixed(3));
assert.strictEqual(phevStats.totalLiters, 85, 'PHEV liters = fuel records only');
assert.strictEqual(phevStats.totalKwh, 30, 'PHEV kWh = electric records only');
// combined cost/100km over the two full->full segments:
//   e2 (electric, dist400, cost15) + e3 (fuel, dist500, cost135) -> totalSegCost=150,totalSegDist=900
assert.ok(Math.abs((phevStats.avgCostPer100km ?? 0) - (150 / 900) * 100) < 0.001, 'PHEV avgCostPer100km');

// --- Back-compat: record with NO energyType is treated as fuel ---
const legacy = [
  { id: 'l1', vehicleId: 'v9', date: '2026-01-01', odometer: 100, liters: 10, cost: 20, isFullTank: true },
  { id: 'l2', vehicleId: 'v9', date: '2026-02-01', odometer: 200, liters: 11, cost: 22, isFullTank: true },
];
const legacyStats = calcFuelConsumption(legacy);
assert.strictEqual(legacyStats.totalLiters, 21, 'legacy records count as fuel liters');
assert.strictEqual(legacyStats.totalKwh, 0, 'legacy records have no kWh');

process.exit(0);