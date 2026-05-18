import { Vehicle, ServiceInterval, ServiceRecord } from '../types';

const STORAGE_KEYS = {
  vehicles: 'csr_vehicles',
  serviceIntervals: 'csr_service_intervals',
  serviceRecords: 'csr_service_records',
};

function getItem<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Vehicles
export function getVehicles(): Vehicle[] {
  return getItem<Vehicle>(STORAGE_KEYS.vehicles);
}

export function saveVehicle(vehicle: Vehicle): void {
  const vehicles = getVehicles();
  const idx = vehicles.findIndex(v => v.id === vehicle.id);
  if (idx >= 0) {
    vehicles[idx] = vehicle;
  } else {
    vehicles.push(vehicle);
  }
  setItem(STORAGE_KEYS.vehicles, vehicles);
}

export function deleteVehicle(id: string): void {
  const vehicles = getVehicles().filter(v => v.id !== id);
  setItem(STORAGE_KEYS.vehicles, vehicles);
  // Also delete intervals and records for this vehicle
  const intervals = getServiceIntervals().filter(si => si.vehicleId !== id);
  setItem(STORAGE_KEYS.serviceIntervals, intervals);
  const records = getServiceRecords().filter(sr => sr.vehicleId !== id);
  setItem(STORAGE_KEYS.serviceRecords, records);
}

// Service Intervals
export function getServiceIntervals(): ServiceInterval[] {
  return getItem<ServiceInterval>(STORAGE_KEYS.serviceIntervals);
}

export function getServiceIntervalsByVehicle(vehicleId: string): ServiceInterval[] {
  return getServiceIntervals().filter(si => si.vehicleId === vehicleId);
}

export function saveServiceInterval(interval: ServiceInterval): void {
  const intervals = getServiceIntervals();
  const idx = intervals.findIndex(i => i.id === interval.id);
  if (idx >= 0) {
    intervals[idx] = interval;
  } else {
    intervals.push(interval);
  }
  setItem(STORAGE_KEYS.serviceIntervals, intervals);
}

export function saveServiceIntervals(intervals: ServiceInterval[]): void {
  const existing = getServiceIntervals();
  const nonVehicle = existing.filter(i => i.vehicleId !== intervals[0]?.vehicleId);
  setItem(STORAGE_KEYS.serviceIntervals, [...nonVehicle, ...intervals]);
}

export function deleteServiceInterval(id: string): void {
  const intervals = getServiceIntervals().filter(i => i.id !== id);
  setItem(STORAGE_KEYS.serviceIntervals, intervals);
}

// Service Records
export function getServiceRecords(): ServiceRecord[] {
  return getItem<ServiceRecord>(STORAGE_KEYS.serviceRecords);
}

export function getServiceRecordsByVehicle(vehicleId: string): ServiceRecord[] {
  return getServiceRecords().filter(sr => sr.vehicleId === vehicleId);
}

export function saveServiceRecord(record: ServiceRecord): void {
  const records = getServiceRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  setItem(STORAGE_KEYS.serviceRecords, records);
}