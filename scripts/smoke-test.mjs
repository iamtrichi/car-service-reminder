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
process.exit(0);