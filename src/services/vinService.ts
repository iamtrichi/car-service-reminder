import { VinDecodeResult } from '../types';

// VIN validation
export function isValidVin(vin: string): boolean {
  if (vin.length !== 17) return false;
  // VIN uses only certain letters (no I, O, Q)
  if (/[IOQ]/.test(vin)) return false;
  // Must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase())) return false;
  return true;
}

interface NhtsaVariable {
  Variable: string;
  Value: string | null;
  VariableId: number;
  ValueId: string | null;
}

interface NhtsaResponse {
  Results: NhtsaVariable[];
}

/**
 * Decodes a VIN using the free NHTSA API.
 * @param vin - 17-character VIN
 * @returns Decoded vehicle info or null if failed
 */
export async function decodeVin(vin: string): Promise<VinDecodeResult | null> {
  const cleanVin = vin.toUpperCase().trim();

  if (!isValidVin(cleanVin)) {
    return null;
  }

  // NEW : FOR FRENCH CARS (WMI commençant par VF ou DS)
  if (cleanVin.startsWith('VF') || cleanVin.startsWith('DS')) {
    const localFrenchResult = decodeFrenchVehicle(cleanVin);
    if (localFrenchResult) {
      return localFrenchResult;
    }
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${cleanVin}?format=json`
    );

    if (!response.ok) {
      console.warn('NHTSA API returned error:', response.status);
      return null;
    }

    const data: NhtsaResponse = await response.json();
    return parseNhtsaResponse(data);
  } catch (error) {
    console.warn('VIN decode failed (network/parse error):', error);
    return null;
  }
}

/**
 * Décodeur de secours local pour les véhicules français (non supportés par la NHTSA).
 */
function decodeFrenchVehicle(vin: string): VinDecodeResult | null {
  const wmi = vin.substring(0, 3);
  const vds = vin.substring(3, 9);
  const char10 = vin.charAt(9);

  let make = '';
  let model = 'Inconnu';
  let fuelType = 'Indéterminé';

  // 1. Identification de la Marque
  if (wmi === 'VF1') make = 'RENAULT';
  else if (wmi === 'VF3') make = 'PEUGEOT';
  else if (wmi === 'VF7') make = 'CITROEN';
  else if (wmi === 'VFA') make = 'ALPINE';
  else if (wmi === 'DS7') make = 'DS AUTOMOBILES';
  else return null; // Ce n'est pas un constructeur français géré localement

  // 2. Identification basique du Modèle via le VDS
  if (make === 'RENAULT') {
    const body = vds.charAt(0);
    if (body === 'B' || body === 'C' || body === 'X') {
      if (vds.includes('RJ') || vds.includes('0A')) model = 'Clio';
      else if (vds.includes('0B') || vds.includes('CN')) model = 'Twingo';
      else model = 'Citadine / Berline (Clio/Megane)';
    } else if (body === 'H' || body === 'J') {
      model = 'SUV / Monospace (Captur/Scenic)';
    }
  } 
  else if (make === 'PEUGEOT' || make === 'CITROEN') {
    // Les plateformes PSA partagent des signatures VDS centrales
    if (/2A|2C|WA|WC|CA|CC|UB/.test(vds)) model = make === 'PEUGEOT' ? '208 / 206' : 'C3';
    else if (/0D|0E|NC|NX/.test(vds)) model = make === 'PEUGEOT' ? '308' : 'C4';
    else if (/MR|M4|MC/.test(vds)) model = make === 'PEUGEOT' ? '3008' : 'C5 Aircross';
  }

  // 3. Extraction de l'Année (Norme ISO 3779 récurrente sur 30 ans)
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
    'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
    'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };
  const year = yearMap[char10] || 2020; // Valeur par défaut si non standard

  // 4. Estimation de la motorisation (Signature générique)
  if (vds.includes('HZ') || vds.includes('HM')) { fuelType = 'Essence'; }
  else if (vds.includes('BH') || vds.includes('9H')) { fuelType = 'Diesel'; }
  else if (vds.includes('ZK') || vds.includes('5G')) { fuelType = 'Électrique'; }

  return {
    make,
    model,
    year,
    fuelType,
    engineCode: vds.substring(2, 5) // Extrait une partie du code moteur d'usine
  };
}


function parseNhtsaResponse(data: NhtsaResponse): VinDecodeResult | null {
  const vars = data.Results;

  const getValue = (name: string): string | null => {
    const found = vars.find(v => v.Variable === name);
    return found?.Value || null;
  };

  const make = getValue('Make');
  const model = getValue('Model');
  const yearStr = getValue('Model Year');

  if (!make || !model || !yearStr) {
    return null;
  }

  const displacement = getValue('Displacement (L)') || '';
  const fuelType = getValue('Fuel Type - Primary') || '';
  const engineModel = getValue('Engine Model') || '';  // This is the engine code (e.g., "K9K", "H4B")
  const engineConfig = getValue('Engine Configuration') || '';
  const engineManufacturer = getValue('Engine Manufacturer') || '';

  // Engine model from NHTSA is usually the engine CODE (K9K, H4B, etc.)
  const engineCode = engineModel || undefined;

  // Build a friendly engine name from available info
  let engineName = engineCode || '';
  if (displacement) {
    const dispMatch = displacement.match(/[\d.]+/);
    if (dispMatch) {
      const disp = parseFloat(dispMatch[0]);
      // For Renault/Peugeot etc., combine displacement with code
      if (fuelType.toLowerCase().includes('diesel')) {
        engineName = `${disp.toFixed(1)} dCi${engineCode ? ` (${engineCode})` : ''}`;
      } else {
        const isTurbo = detectTurbo(engineModel, engineConfig, model);
        engineName = `${disp.toFixed(1)}${isTurbo ? ' TCe' : ' 16V'}${engineCode ? ` (${engineCode})` : ''}`;
      }
    }
  }

  // Detect turbo from engine info
  const isTurbo = detectTurbo(engineModel, engineConfig, model);

  // Parse displacement to number
  let displacementNum: string | undefined;
  if (displacement) {
    const match = displacement.match(/[\d.]+/);
    if (match) {
      displacementNum = match[0];
    }
  }

  return {
    make: make || 'Unknown',
    model: model || 'Unknown',
    year: parseInt(yearStr) || 0,
    engineCode,
    engineName: engineName || undefined,
    engineDisplacement: displacementNum,
    fuelType: fuelType || undefined,
    isTurbo: isTurbo || undefined,
    cylinders: getValue('Engine Number of Cylinders') || undefined,
  };
}

function detectTurbo(engineModel: string, engineConfig: string, modelName: string): boolean {
  const combined = `${engineModel} ${engineConfig} ${modelName}`.toLowerCase();
  return combined.includes('turbo') ||
    combined.includes('tce') ||
    combined.includes('tsi') ||
    combined.includes('tfsi') ||
    combined.includes('tdi');
}

// For fallback when user enters engine details manually
export function getFuelTypeFromName(modelName: string): string | undefined {
  const lower = modelName.toLowerCase();
  if (lower.includes('dci') || lower.includes('dti') || lower.includes('tdi') ||
      lower.includes('diesel') || lower.includes('d')) {
    return 'Diesel';
  }
  if (lower.includes('tce') || lower.includes('tsi') || lower.includes('tfsi') ||
      lower.includes('gti')) {
    return 'Gasoline';
  }
  return undefined;
}

export function isTurboFromName(modelName: string): boolean | undefined {
  const lower = modelName.toLowerCase();
  return lower.includes('turbo') || lower.includes('tce') ||
         lower.includes('tsi') || lower.includes('tfsi') ||
         lower.includes('gti') || lower.includes('t');
}