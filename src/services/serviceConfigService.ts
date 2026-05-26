import { ServiceConfig, ServiceInterval, ServiceType, VinDecodeResult, EngineSpec, MakeData, ModelData, EngineVariant } from '../types';

const MAKE_INDEX_PATH = '/config/makes/all-makes-models.json';
const MAKE_FILE_BASE_PATH = '/config/makes/';

interface MakeIndexEntry {
  make: string;
  file: string;
}

interface MakeIndex {
  makes: MakeIndexEntry[];
  totalMakes?: number;
  lastUpdated?: string;
  note?: string;
}

interface RawMakeIndexEntry {
  make?: string;
  name?: string;
  file?: string;
  path?: string;
}

interface RawMakeIndex {
  makes?: RawMakeIndexEntry[];
  totalMakes?: number;
  lastUpdated?: string;
  note?: string;
}

interface RawMakeData extends MakeData {
  make?: string;
}

/** Strip common diacritics from a string for accent-insensitive comparison */
function normalizeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeMakeData(makeData: RawMakeData): MakeData {
  if (!makeData.name && makeData.make) {
    makeData.name = makeData.make;
  }
  // Fix relative image URLs to be absolute (prepend /) so they work from any route
  if (makeData.imageUrl && !makeData.imageUrl.startsWith('http') && !makeData.imageUrl.startsWith('/')) {
    makeData.imageUrl = '/' + makeData.imageUrl.replace(/^\.\//, '');
  }
  if (makeData.models) {
    makeData.models.forEach(model => {
      if (model.imageUrl && !model.imageUrl.startsWith('http') && !model.imageUrl.startsWith('/')) {
        model.imageUrl = '/' + model.imageUrl.replace(/^\.\//, '');
      }
    });
  }
  return makeData;
}

function normalizeMakeIndex(rawIndex: RawMakeIndex): MakeIndex {
  return {
    makes: (rawIndex.makes || [])
      .map(entry => ({
        make: (entry.make || entry.name || '').trim(),
        file: (entry.file || entry.path || '').trim(),
      }))
      .filter(entry => entry.make && entry.file),
    totalMakes: rawIndex.totalMakes,
    lastUpdated: rawIndex.lastUpdated,
    note: rawIndex.note,
  };
}

let cachedConfig: ServiceConfig | null = null;
let cachedMakeIndex: MakeIndex | null = null;
const cachedMakeFiles: Record<string, MakeData> = {};

/**
 * Loads the car make index from the bundled JSON file in config/makes.
 */
async function loadMakeIndex(): Promise<MakeIndex> {
  if (cachedMakeIndex) return cachedMakeIndex;

  try {
    const response = await fetch(MAKE_INDEX_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load make index: ${response.status}`);
    }
    const rawIndex: RawMakeIndex = await response.json();
    const index = normalizeMakeIndex(rawIndex);
    cachedMakeIndex = index;
    return index;
  } catch (error) {
    console.error('Failed to load make index:', error);
    return { makes: [] };
  }
}

/**
 * Loads a single make file from config/makes based on the make name.
 */
async function loadMakeFile(makeName: string): Promise<MakeData | null> {
  const index = await loadMakeIndex();
  const normalizedMake = normalizeDiacritics(makeName.trim().toLowerCase());
  const entry = index.makes.find(m => normalizeDiacritics(m.make.trim().toLowerCase()) === normalizedMake);
  if (!entry) return null;
  if (cachedMakeFiles[entry.file]) return cachedMakeFiles[entry.file];

  try {
    const response = await fetch(`${MAKE_FILE_BASE_PATH}${entry.file}`);
    if (!response.ok) {
      throw new Error(`Failed to load make file ${entry.file}: ${response.status}`);
    }
    const rawMakeData: RawMakeData = await response.json();
    const makeData = normalizeMakeData(rawMakeData);
    cachedMakeFiles[entry.file] = makeData;
    return makeData;
  } catch (error) {
    console.error('Failed to load make file:', error);
    return null;
  }
}

/**
 * Preload and cache all make files listed in the make index.
 */
export async function preloadAllMakes(): Promise<void> {
  const index = await loadMakeIndex();
  await Promise.all(index.makes.map(async entry => {
    if (cachedMakeFiles[entry.file]) return;
    try {
      const response = await fetch(`${MAKE_FILE_BASE_PATH}${entry.file}`);
      if (!response.ok) throw new Error(`Failed to load make file ${entry.file}: ${response.status}`);
      const rawMakeData: RawMakeData = await response.json();
      cachedMakeFiles[entry.file] = normalizeMakeData(rawMakeData);
    } catch (err) {
      console.error('preloadAllMakes: error loading', entry.file, err);
    }
  }));
}

/**
 * Loads the service intervals config from the bundled JSON file.
 */
export async function loadServiceConfig(): Promise<ServiceConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const response = await fetch('/config/service-intervals.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    const config: ServiceConfig = await response.json();
    cachedConfig = config;
    return config;
  } catch (error) {
    console.error('Failed to load service config:', error);
    return {
      version: 0,
      generic: {
        oil_change: { mileage: 10000, months: 12 },
      },
      services: [
        { type: ServiceType.OIL_CHANGE, name: 'Oil Change', defaultMileage: 10000, defaultMonths: 12 },
      ],
      rules: [],
      engineSpecs: [],
      makes: [],
    };
  }
}

/** Get all makes */
export async function getMakes(): Promise<MakeData[]> {
  const index = await loadMakeIndex();
  // Ensure we have the make files cached for fast access
  if (Object.keys(cachedMakeFiles).length === 0 && index.makes.length > 0) {
    await preloadAllMakes();
  }

  // Prefer cached make files (complete data). Fall back to index names.
  return index.makes.map(entry => cachedMakeFiles[entry.file] || ({ name: entry.make, models: [] } as MakeData));
}

/** Get models for a specific make name */
export async function getModelsForMake(makeName: string): Promise<ModelData[]> {
  const index = await loadMakeIndex();
  const normalized = normalizeDiacritics(makeName.trim().toLowerCase());
  const entry = index.makes.find(m => normalizeDiacritics(m.make.trim().toLowerCase()) === normalized);
  if (entry) {
    const cached = cachedMakeFiles[entry.file] || await loadMakeFile(makeName);
    return cached?.models || [];
  }

  const config = await loadServiceConfig();
  const make = config.makes?.find(m => m.name.toLowerCase() === makeName.toLowerCase());
  return make?.models || [];
}

/** Get engine variants for a specific model within a make */
export async function getEngineVariantsForModel(makeName: string, modelName: string): Promise<EngineVariant[]> {
  const models = await getModelsForMake(makeName);
  const model = models.find(m => m.name.toLowerCase() === modelName.toLowerCase());
  return model?.engineVariants || model?.engines || [];
}

/**
 * Gets engine specifications for a given engine code.
 */
export async function getEngineSpecsForVehicle(vehicle: {
  engineCode?: string;
  engineName?: string;
  fuelType?: string;
}): Promise<EngineSpec | null> {
  const config = await loadServiceConfig();
  if (!config.engineSpecs || config.engineSpecs.length === 0) return null;

  // Try to match by engineCode first (exact match)
  if (vehicle.engineCode) {
    const code = vehicle.engineCode.toLowerCase();
    const match = config.engineSpecs.find(s =>
      s.engineCode.toLowerCase() === code
    );
    if (match) return match;

    // Some make files append 't' for turbo (e.g. "H4Bt" vs "H4B")
    if (code.endsWith('t')) {
      const stripped = code.slice(0, -1);
      const matchStripped = config.engineSpecs.find(s =>
        s.engineCode.toLowerCase() === stripped
      );
      if (matchStripped) return matchStripped;
    }
  }

  // Fallback: match by engine name
  if (vehicle.engineName) {
    const nameLower = vehicle.engineName.toLowerCase();
    const match = config.engineSpecs.find(s => {
      if (!s.engineName) return false;
      return nameLower.includes(s.engineName.toLowerCase()) ||
        s.engineName.toLowerCase().includes(nameLower);
    });
    if (match) return match;
  }

  return null;
}

/**
 * Generates smart default service intervals based on VIN decode result
 * and the rules in the config file.
 */
export async function getRecommendedIntervals(
  vehicleId: string,
  vinInfo?: VinDecodeResult | null
): Promise<ServiceInterval[]> {
  const config = await loadServiceConfig();
  let activeServices = [...config.services];

  if (vinInfo) {
    for (const rule of config.rules) {
      if (matchesCondition(rule.condition, vinInfo)) {
        for (const [serviceType, adj] of Object.entries(rule.adjustments)) {
          const svc = activeServices.find(s => s.type === serviceType);
          if (svc) {
            if (adj.mileage !== undefined) svc.defaultMileage = adj.mileage;
            if (adj.months !== undefined) svc.defaultMonths = adj.months;
          }
        }
        if (rule.remove_services) {
          activeServices = activeServices.filter(
            s => !rule.remove_services!.includes(s.type)
          );
        }
        if (rule.add_services) {
          for (const addType of rule.add_services) {
            if (!activeServices.find(s => s.type === addType)) {
              const generic = config.generic[addType];
              if (generic) {
                activeServices.push({
                  type: addType as ServiceType,
                  name: getServiceName(addType),
                  defaultMileage: generic.mileage || 0,
                  defaultMonths: generic.months || 0,
                });
              }
            }
          }
        }
      }
    }
  }

  return activeServices.map((svc, index) => ({
    id: `${vehicleId}_${svc.type}_${Date.now()}_${index}`,
    vehicleId,
    serviceType: svc.type as ServiceType,
    name: svc.name,
    intervalMileage: svc.defaultMileage || null,
    intervalMonths: svc.defaultMonths || null,
    lastPerformedMileage: null,
    lastPerformedDate: null,
    isRecurring: true,
  }));
}

function matchesCondition(
  condition: {
    fuelType?: string;
    turbo?: boolean;
    engineCode?: string;
    engineDisplacementMin?: number;
    engineDisplacementMax?: number;
    make?: string;
    model?: string;
  },
  vinInfo: VinDecodeResult
): boolean {
  if (condition.fuelType) {
    const fuel = (vinInfo.fuelType || '').toLowerCase();
    const condFuel = condition.fuelType.toLowerCase();
    if (!fuel.includes(condFuel) && !condFuel.includes(fuel)) {
      if (condFuel === 'gasoline' && !fuel.startsWith('gas') && fuel !== 'gasoline') return false;
      if (condFuel === 'diesel' && fuel !== 'diesel') return false;
      if (condFuel !== 'gasoline' && condFuel !== 'diesel' && !fuel.includes(condFuel)) return false;
    }
  }
  if (condition.turbo !== undefined) {
    if ((vinInfo.isTurbo || false) !== condition.turbo) return false;
  }
  if (condition.engineCode) {
    const code = (vinInfo.engineCode || '').toLowerCase();
    if (!code.includes(condition.engineCode.toLowerCase())) return false;
  }
  if (condition.engineDisplacementMin !== undefined || condition.engineDisplacementMax !== undefined) {
    const disp = parseFloat(vinInfo.engineDisplacement || '0');
    if (condition.engineDisplacementMin !== undefined && disp < condition.engineDisplacementMin) return false;
    if (condition.engineDisplacementMax !== undefined && disp > condition.engineDisplacementMax) return false;
  }
  if (condition.make) {
    if ((vinInfo.make || '').toLowerCase() !== condition.make.toLowerCase()) return false;
  }
  if (condition.model) {
    if ((vinInfo.model || '').toLowerCase() !== condition.model.toLowerCase()) return false;
  }
  return true;
}

function getServiceName(type: string): string {
  const names: Record<string, string> = {
    oil_change: 'Oil Change',
    oil_filter: 'Oil Filter',
    air_filter: 'Air Filter',
    cabin_filter: 'Cabin Filter',
    fuel_filter: 'Fuel Filter',
    brake_fluid: 'Brake Fluid',
    coolant: 'Coolant',
    spark_plugs: 'Spark Plugs',
    timing_belt: 'Timing Belt',
    water_pump: 'Water Pump',
    brake_pads: 'Brake Pads',
    brake_discs: 'Brake Discs',
    tire_rotation: 'Tire Rotation',
    battery: 'Battery',
    transmission_fluid: 'Transmission Fluid',
    clutch: 'Clutch',
    shock_absorbers: 'Shock Absorbers',
    ac_service: 'AC Service',
    dpf_filter: 'DPF Filter',
    egr_cleaning: 'EGR Cleaning',
    glow_plugs: 'Glow Plugs',
    multi_point_inspection: 'Multi-Point Inspection',
    battery_coolant: 'Battery Coolant',
    twelve_volt_battery: '12-Volt Battery',
    wiper_blades: 'Wiper Blades',
    other: 'Other',
  };
  return names[type] || type;
}