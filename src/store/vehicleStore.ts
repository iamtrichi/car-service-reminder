import { create } from 'zustand';
import { Vehicle, ServiceInterval, ServiceRecord } from '../types';
import * as storage from '../services/storageService';

interface VehicleState {
  vehicles: Vehicle[];
  serviceIntervals: ServiceInterval[];
  serviceRecords: ServiceRecord[];
  loading: boolean;

  loadData: () => void;
  addVehicle: (vehicle: Vehicle, intervals: ServiceInterval[]) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  updateMileage: (vehicleId: string, mileage: number) => void;
  updateServiceInterval: (interval: ServiceInterval) => void;
  addServiceRecord: (record: ServiceRecord) => void;
  performService: (intervalId: string, record: ServiceRecord) => void;
  addCustomInterval: (interval: ServiceInterval) => void;
  removeInterval: (id: string) => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  serviceIntervals: [],
  serviceRecords: [],
  loading: true,

  loadData: () => {
    const vehicles = storage.getVehicles();
    const serviceIntervals = storage.getServiceIntervals();
    const serviceRecords = storage.getServiceRecords();
    set({ vehicles, serviceIntervals, serviceRecords, loading: false });
  },

  addVehicle: (vehicle: Vehicle, intervals: ServiceInterval[]) => {
    storage.saveVehicle(vehicle);
    storage.saveServiceIntervals(intervals);
    set(state => ({
      vehicles: [...state.vehicles, vehicle],
      serviceIntervals: [...state.serviceIntervals, ...intervals],
    }));
  },

  updateVehicle: (vehicle: Vehicle) => {
    storage.saveVehicle(vehicle);
    set(state => ({
      vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v),
    }));
  },

  deleteVehicle: (id: string) => {
    storage.deleteVehicle(id);
    set(state => ({
      vehicles: state.vehicles.filter(v => v.id !== id),
      serviceIntervals: state.serviceIntervals.filter(i => i.vehicleId !== id),
      serviceRecords: state.serviceRecords.filter(r => r.vehicleId !== id),
    }));
  },

  updateMileage: (vehicleId: string, mileage: number) => {
    set(state => {
      const vehicles = state.vehicles.map(v =>
        v.id === vehicleId ? { ...v, currentMileage: mileage } : v
      );
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) storage.saveVehicle(vehicle);
      return { vehicles };
    });
  },

  updateServiceInterval: (interval: ServiceInterval) => {
    storage.saveServiceInterval(interval);
    set(state => ({
      serviceIntervals: state.serviceIntervals.map(i =>
        i.id === interval.id ? interval : i
      ),
    }));
  },

  addServiceRecord: (record: ServiceRecord) => {
    storage.saveServiceRecord(record);
    set(state => ({
      serviceRecords: [...state.serviceRecords, record],
    }));
  },

  performService: (intervalId: string, record: ServiceRecord) => {
    // Save the service record
    storage.saveServiceRecord(record);
    
    // Update the interval's last performed values
    set(state => {
      const intervals = state.serviceIntervals.map(i => {
        if (i.id === intervalId) {
          const updated = {
            ...i,
            lastPerformedMileage: record.performedAtMileage,
            lastPerformedDate: record.performedAtDate,
          };
          storage.saveServiceInterval(updated);
          return updated;
        }
        return i;
      });
      return {
        serviceIntervals: intervals,
        serviceRecords: [...state.serviceRecords, record],
      };
    });
  },

  addCustomInterval: (interval: ServiceInterval) => {
    storage.saveServiceInterval(interval);
    set(state => ({
      serviceIntervals: [...state.serviceIntervals, interval],
    }));
  },

  removeInterval: (id: string) => {
    storage.deleteServiceInterval(id);
    set(state => ({
      serviceIntervals: state.serviceIntervals.filter(i => i.id !== id),
    }));
  },
}));