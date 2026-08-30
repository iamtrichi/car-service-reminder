import { Vehicle, ServiceInterval, ServiceRecord, FuelRecord, VehicleDocument } from '../types';
import { getItem, setItem } from './preferencesService';

const STORAGE_KEYS = {
  vehicles: 'csr_vehicles',
  serviceIntervals: 'csr_service_intervals',
  serviceRecords: 'csr_service_records',
  fuelRecords: 'csr_fuel_records',
  vehicleDocuments: 'csr_vehicle_documents',
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
  // Also delete intervals, records and fuel records for this vehicle
  const intervals = getServiceIntervals().filter(si => si.vehicleId !== id);
  setArray(STORAGE_KEYS.serviceIntervals, intervals);
  const records = getServiceRecords().filter(sr => sr.vehicleId !== id);
  setArray(STORAGE_KEYS.serviceRecords, records);
  const fuelRecords = getFuelRecords().filter(fr => fr.vehicleId !== id);
  setArray(STORAGE_KEYS.fuelRecords, fuelRecords);
  const vehicleDocuments = getVehicleDocuments().filter(d => d.vehicleId !== id);
  setArray(STORAGE_KEYS.vehicleDocuments, vehicleDocuments);
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

export function deleteServiceRecord(id: string): void {
  const records = getServiceRecords().filter(r => r.id !== id);
  setArray(STORAGE_KEYS.serviceRecords, records);
}

// Fuel Records
export function getFuelRecords(): FuelRecord[] {
  return getArray<FuelRecord>(STORAGE_KEYS.fuelRecords);
}

export function getFuelRecordsByVehicle(vehicleId: string): FuelRecord[] {
  return getFuelRecords().filter(fr => fr.vehicleId === vehicleId);
}

export function saveFuelRecord(record: FuelRecord): void {
  const records = getFuelRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  setArray(STORAGE_KEYS.fuelRecords, records);
}

export function deleteFuelRecord(id: string): void {
  const records = getFuelRecords().filter(r => r.id !== id);
  setArray(STORAGE_KEYS.fuelRecords, records);
}

// Vehicle Documents
export function getVehicleDocuments(): VehicleDocument[] {
  return getArray<VehicleDocument>(STORAGE_KEYS.vehicleDocuments);
}

export function getDocumentsByVehicle(vehicleId: string): VehicleDocument[] {
  return getVehicleDocuments().filter(d => d.vehicleId === vehicleId);
}

export function saveVehicleDocument(document: VehicleDocument): void {
  const documents = getVehicleDocuments();
  const idx = documents.findIndex(d => d.id === document.id);
  if (idx >= 0) {
    documents[idx] = document;
  } else {
    documents.push(document);
  }
  setArray(STORAGE_KEYS.vehicleDocuments, documents);
}

export function deleteVehicleDocument(id: string): void {
  const documents = getVehicleDocuments().filter(d => d.id !== id);
  setArray(STORAGE_KEYS.vehicleDocuments, documents);
}