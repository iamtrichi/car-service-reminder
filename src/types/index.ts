export enum ServiceType {
  OIL_CHANGE = 'oil_change',
  OIL_FILTER = 'oil_filter',
  AIR_FILTER = 'air_filter',
  CABIN_FILTER = 'cabin_filter',
  FUEL_FILTER = 'fuel_filter',
  BRAKE_FLUID = 'brake_fluid',
  COOLANT = 'coolant',
  SPARK_PLUGS = 'spark_plugs',
  TIMING_BELT = 'timing_belt',
  WATER_PUMP = 'water_pump',
  BRAKE_PADS = 'brake_pads',
  BRAKE_DISCS = 'brake_discs',
  TIRE_ROTATION = 'tire_rotation',
  BATTERY = 'battery',
  TRANSMISSION_FLUID = 'transmission_fluid',
  CLUTCH = 'clutch',
  SHOCK_ABSORBERS = 'shock_absorbers',
  AC_SERVICE = 'ac_service',
  DPF_FILTER = 'dpf_filter',
  EGR_CLEANING = 'egr_cleaning',
  GLOW_PLUGS = 'glow_plugs',
  OTHER = 'other',
}

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  engineCode?: string;
  engineName?: string;
  hp?: number;
  engineDisplacement?: string;
  fuelType?: string;
  isTurbo?: boolean;
  currentMileage: number;
  purchaseDate?: string;
  createdAt: string;
}

export interface ServiceInterval {
  id: string;
  vehicleId: string;
  serviceType: ServiceType;
  name: string;
  intervalMileage: number | null;
  intervalMonths: number | null;
  lastPerformedMileage: number | null;
  lastPerformedDate: string | null;
  isRecurring: boolean;
  notes?: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  serviceIntervalId?: string;
  serviceType: ServiceType;
  name: string;
  performedAtMileage: number;
  performedAtDate: string;
  cost?: number;
  notes?: string;
  workshop?: string;
}

export interface VinDecodeResult {
  make: string;
  model: string;
  year: number;
  engineCode?: string;
  engineName?: string;
  hp?: number;
  engineDisplacement?: string;
  fuelType?: string;
  isTurbo?: boolean;
  cylinders?: string;
}

export interface EngineSpec {
  engineCode: string;
  engineName?: string;
  fuelType?: string;
  isTurbo?: boolean;
  displacement?: string;
  oilCapacity?: string;
  oilNorm?: string;
  brakeFluidType?: string;
  coolantType?: string;
  gearboxOilType?: string;
  gearboxOilCapacity?: string;
}

// New interfaces for the cascading make/model/engine data
export interface EngineVariant {
  engineCode: string;
  engineName: string;
  hp: number;
  displacement?: string;
  fuelType?: string;
  isTurbo?: boolean;
}

export interface ModelData {
  name: string;
  years?: string;
  imageUrl?: string;
  engineVariants?: EngineVariant[];
  engines?: EngineVariant[];
}

export interface MakeData {
  name: string;
  imageUrl?: string;
  models: ModelData[];
}

export interface ServiceConfig {
  version: number;
  generic: Record<string, { mileage: number; months: number }>;
  services: ServiceDefinition[];
  rules: RuleGroup[];
  engineSpecs: EngineSpec[];
  makes: MakeData[];
}

interface ServiceDefinition {
  type: ServiceType;
  name: string;
  defaultMileage: number;
  defaultMonths: number;
  description?: string;
}

interface RuleGroup {
  condition: RuleCondition;
  adjustments: Record<string, Adjustment>;
  add_services?: string[];
  remove_services?: string[];
}

interface RuleCondition {
  fuelType?: string;
  turbo?: boolean;
  engineCode?: string;
  engineDisplacementMin?: number;
  engineDisplacementMax?: number;
  make?: string;
  model?: string;
}

interface Adjustment {
  mileage?: number;
  months?: number;
}

export type PagePath = '/dashboard' | '/add-vehicle' | '/vehicle' | '/reminders' | '/settings';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.OIL_CHANGE]: 'Oil Change',
  [ServiceType.OIL_FILTER]: 'Oil Filter',
  [ServiceType.AIR_FILTER]: 'Air Filter',
  [ServiceType.CABIN_FILTER]: 'Cabin Filter',
  [ServiceType.FUEL_FILTER]: 'Fuel Filter',
  [ServiceType.BRAKE_FLUID]: 'Brake Fluid',
  [ServiceType.COOLANT]: 'Coolant',
  [ServiceType.SPARK_PLUGS]: 'Spark Plugs',
  [ServiceType.TIMING_BELT]: 'Timing Belt',
  [ServiceType.WATER_PUMP]: 'Water Pump',
  [ServiceType.BRAKE_PADS]: 'Brake Pads',
  [ServiceType.BRAKE_DISCS]: 'Brake Discs',
  [ServiceType.TIRE_ROTATION]: 'Tire Rotation',
  [ServiceType.BATTERY]: 'Battery',
  [ServiceType.TRANSMISSION_FLUID]: 'Transmission Fluid',
  [ServiceType.CLUTCH]: 'Clutch',
  [ServiceType.SHOCK_ABSORBERS]: 'Shock Absorbers',
  [ServiceType.AC_SERVICE]: 'AC Service',
  [ServiceType.DPF_FILTER]: 'DPF Filter',
  [ServiceType.EGR_CLEANING]: 'EGR Cleaning',
  [ServiceType.GLOW_PLUGS]: 'Glow Plugs',
  [ServiceType.OTHER]: 'Other',
};