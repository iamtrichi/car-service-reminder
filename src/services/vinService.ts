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