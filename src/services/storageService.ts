import { Vehicle, ServiceInterval, ServiceRecord } from '../types';
import { getItem, setItem } from './preferencesService';

const STORAGE_KEYS = {
  vehicles: 'csr_vehicles',
  serviceIntervals: 'csr_service_intervals',
  serviceRecords: 'csr_service_records',
};

function getArray<T>(key: string): T[] {
  const data = getItem<T[]>(key);
  return data ?? [];
}

function setArray<T>(key: string, data: T[]): void {
  setItem(key, data);
}

// Vehicles
export function getVehicles(): Vehicle[] {
  return getArray<Vehicle>(STORAGE_KEYS.vehicles);
}

export function saveVehicle(vehicle: Vehicle): void {
  const vehicles = getVehicles();
  const idx = vehicles.findIndex(v => v.id === vehicle.id);
  if (idx >= 0) {
    vehicles[idx] = vehicle;
  } else {
    vehicles.push(vehicle);
  }
  setArray(STORAGE_KEYS.vehicles, vehicles);
}

export function deleteVehicle(id: string): void {
  const vehicles = getVehicles().filter(v => v.id !== id);
  setArray(STORAGE_KEYS.vehicles, vehicles);
  // Also delete intervals and records for this vehicle
  const intervals = getServiceIntervals().filter(si => si.vehicleId !== id);
  setArray(STORAGE_KEYS.serviceIntervals, intervals);
  const records = getServiceRecords().filter(sr => sr.vehicleId !== id);
  setArray(STORAGE_KEYS.serviceRecords, records);
}

// Service Intervals
export function getServiceIntervals(): ServiceInterval[] {
  return getArray<ServiceInterval>(STORAGE_KEYS.serviceIntervals);
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
  setArray(STORAGE_KEYS.serviceIntervals, intervals);
}

export function saveServiceIntervals(intervals: ServiceInterval[]): void {
  const existing = getServiceIntervals();
  const nonVehicle = existing.filter(i => i.vehicleId !== intervals[0]?.vehicleId);
  setArray(STORAGE_KEYS.serviceIntervals, [...nonVehicle, ...intervals]);
}

export function deleteServiceInterval(id: string): void {
  const intervals = getServiceIntervals().filter(i => i.id !== id);
  setArray(STORAGE_KEYS.serviceIntervals, intervals);
}

// Service Records
export function getServiceRecords(): ServiceRecord[] {
  return getArray<ServiceRecord>(STORAGE_KEYS.serviceRecords);
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
  setArray(STORAGE_KEYS.serviceRecords, records);
}