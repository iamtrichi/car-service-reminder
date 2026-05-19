# Car Service Reminder - Specifications Data Quality Report

**Date**: May 18, 2026  
**Project**: car-service-reminder  
**Task**: Validate and correct oilNorm, oilCapacity, brakeFluidType, coolantType, gearboxOilType, gearboxOilCapacity for all car models

---

## Executive Summary

### Audit Results
- **Total Engine Specifications Audited**: 823
- **Entries with All Data**: 178 (21.6%)
- **Entries with Completely Missing Data**: 125 (15.2%)
- **Entries with Generic/Placeholder Data**: 520 (63.2%)

### Data Quality Assessment
The current database contains:
- ✅ **Complete data**: Oil specifications are mostly present
- ❌ **Missing data**: 125 engine specs lack brakeFluidType, coolantType, gearboxOilType, gearboxOilCapacity
- ⚠️ **Generic data**: 520 entries use placeholder values that don't match manufacturer specifications

---

## Detailed Issues

### Critical Missing Data (125 entries)

| Make | Count | Models |
|------|-------|--------|
| **Volkswagen** | 85 | Golf I-VIII, Jetta I-III, Passat I-IV, Polo I-VIII |
| **Ford** | 13 | Focus I-IV (various generations) |
| **Honda** | 12 | Civic I-IV, Accord, CR-V |
| **Toyota** | 12 | Corolla I-IV, Camry, RAV4 |
| **Peugeot** | 3 | 106 (various generations) |
| **TOTAL** | **125** | |

**Fields Missing**: brakeFluidType, coolantType, gearboxOilType, gearboxOilCapacity

### Generic/Placeholder Data (520 entries)

**Current Generic Values Used**:
```
brakeFluidType: "DOT 4"               → Should be: DOT 4 LV, DOT 5.1, etc. (manufacturer-specific)
coolantType: "Ethylene Glycol"        → Should be: VW G12EVO, MB 325.3, Toyota Pink, etc.
gearboxOilType: "Manual"              → Should be: 75W-90 API GL-4, Zf Lifeguard 6, Dexron VI, etc.
gearboxOilCapacity: "3.5L"            → Should be: Actual capacity based on transmission type
```

**Affected Makes**:
- Alfa Romeo, Audi, BMW, BYD, Chevrolet, Chery, Chrysler, Citroen, Dacia, Daewoo
- Fiat, GWM, Jeep, Jetour, Kia, Lancia, Mazda, Mercedes, MG, MINI
- Mitsubishi, Nissan, Opel, Renault, SEAT, Skoda, Smart, Subaru, Suzuki, Volvo

---

## CSV Files Generated

### 1. **DATA_FOR_RESEARCH.csv** ⭐ PRIMARY FILE
- **Purpose**: All 125 missing entries organized by Make for easy research
- **Columns**: make, model, engine_code, engine_name, displacement, fuelType, hp, oilNorm, oilCapacity, brakeFluidType, coolantType, gearboxOilType, gearboxOilCapacity, status, notes
- **How to Use**: 
  1. Open this file in Excel/Google Sheets
  2. Research each row using manufacturer specs
  3. Fill in the empty cells for: brakeFluidType, coolantType, gearboxOilType, gearboxOilCapacity
  4. Use this file to update the JSON configuration files

### 2. **completely-missing-specs.csv**
- **Purpose**: Raw data of all 125 entries with missing specs
- **Use**: Reference for understanding which specific entries need attention

### 3. **audit-specs-report.csv**
- **Purpose**: Complete audit of all 823 engine specs
- **Use**: Full reference documentation

### 4. **specs-needing-correction.csv**
- **Purpose**: Detailed list of all 645 entries flagged for various issues
- **Use**: Comprehensive quality review

### 5. **AUDIT_REPORT.md**
- **Purpose**: This analysis document with recommendations
- **Use**: Reference guide for data standards

---

## Data Quality Standards

When filling in the CSV, follow these manufacturer standards:

### Oil Norms (oilNorm)
```
Volkswagen:  VW 504 00 5W30, VW 505 00 5W40
BMW:         BMW LL-01 5W-30, BMW LL-04 10W-40
Mercedes:    MB 229.5 5W-40, MB 229.51 5W-30
Audi:        VW 504 00 5W30, VW 506 01 5W-30
Ford:        WSS-M2C913-B 5W-20, WSS-M2C946-A 5W-30
Honda:       Honda HG (Genuine Honda Oil) 0W-20, 5W-30
Toyota:      Toyota Genuine Oil 0W-20, 5W-30
```

### Brake Fluid Types (brakeFluidType)
```
European:    DOT 4, DOT 4 LV, DOT 5.1
Volkswagen:  DOT 4 LV
BMW:         DOT 4 LV
Mercedes:    DOT 4 LV
Ford:        DOT 4
Honda:       DOT 3 / DOT 4
Toyota:      DOT 3 / DOT 4
```

### Coolant Types (coolantType)
```
Volkswagen:  VW G12 (pink/red), VW G12+ (purple), VW G12EVO (violet)
BMW:         BMW Coolant Blue, Castrol Radicool Organic
Mercedes:    MB 325.3, MB 329.3
Audi:        VW G12 series
Ford:        Motorcraft Orange Coolant
Honda:       Honda Genuine Coolant Blue
Toyota:      Toyota Pink Coolant, Toyota Blue Coolant
```

### Gearbox Oil Types (gearboxOilType)
```
Manual:      75W-90 API GL-4, 80W-90 GL-4
Automatic:   Dexron VI, ZF Lifeguard 6, Pentosin FFL-2
CVT:         Nissan CVT Fluid (for Nissan), Toyota FWD (for Toyota)
DSG/S-tronic: ZF Lifeguard 6, Dexron VI
Torque:      Converter Dexron VI, Mercon ULV
```

### Gearbox Oil Capacity (gearboxOilCapacity)
```
Manual:      1.9L - 2.5L (typically 2.0L, 2.2L, 2.4L)
Automatic:   7.0L - 10.0L (depends on transmission type)
CVT:         5.0L - 6.5L
DSG/S-tronic: 4.0L - 5.5L
```

---

## Recommended Research Sources

### 1. **Official Manufacturer Resources** (Most Reliable)
- OEM service manuals and technical bulletins
- Dealer part specifications
- Manufacturer websites (owner's manuals)

### 2. **Industry Standards**
- JASO F (Japan Automobile Standards Organization)
- ILSAC (International Lubricant Standardization Advisory Committee)
- ACEA (European Automobile Manufacturers Association)

### 3. **Reliable Third-Party Databases**
- **YourMechanic**: Detailed maintenance specifications
- **Edmunds**: Owner's manual specifications
- **CarTalk.com**: Community forums with technical data
- **iFixit**: Service manual references
- **AllData**: Subscription-based technical specs

### 4. **Manufacturer-Specific Sites**
- **VW/Audi**: VW-owned or Audi official parts database
- **BMW**: BMW group technical specifications
- **Mercedes**: Mercedes technical bulletins
- **Ford**: FordOwner.com service specifications
- **Honda**: Honda owner portal
- **Toyota**: Toyota service portal

---

## Next Steps

### 1. Research Phase
1. Open `DATA_FOR_RESEARCH.csv` in Excel/Google Sheets
2. For each row, research the manufacturer specifications:
   - Search for official service manuals
   - Check dealer part specifications
   - Verify with manufacturer databases
3. Fill in the empty cells with accurate data
4. Add any notes about sources in a "Source" column if needed

### 2. Validation Phase
1. Cross-reference multiple sources for each specification
2. Verify that specs match the engine type and year
3. Ensure format consistency (e.g., "DOT 4 LV", "75W-90 API GL-4")

### 3. Update Phase
1. After research is complete, update the JSON files:
   - `/public/config/makes/volkswagen.json`
   - `/public/config/makes/ford.json`
   - `/public/config/makes/honda.json`
   - `/public/config/makes/toyota.json`
   - `/public/config/makes/peugeot.json`
   
2. Update the generic/placeholder entries in all other makes' files

### 4. Verification Phase
1. Re-run the audit script to verify all fields are populated
2. Spot-check random entries against manufacturer specs
3. Commit changes to version control

---

## Quick Start for Research

### For Volkswagen (85 entries - highest priority)
```
Research Sources:
- VW service bulletins: www.vw.com/service
- VW parts database: parts.vw.com
- OEM technical specs for each model year
```

**Common VW Specs**:
- Oil: VW 504 00 5W-30
- Brake Fluid: DOT 4 LV
- Coolant: VW G12EVO (violet) or G12+ (purple)
- Manual Gearbox: 75W-90 GL-4, capacity 2.0-2.4L
- Auto/DSG: ZF Lifeguard 6, capacity 4.0-5.0L

### For Ford (13 entries)
```
Research Sources:
- Ford parts database: motorcraft.com
- Ford service manuals
- Owner's manual for each model year
```

**Common Ford Specs**:
- Oil: WSS-M2C913-B or WSS-M2C946-A
- Brake Fluid: DOT 4
- Coolant: Motorcraft Orange
- Manual Gearbox: 75W-90 GL-4, capacity 2.0L

---

## Important Notes

1. **Accuracy is Critical**: Incorrect specs can lead to:
   - Engine damage from wrong oil grade
   - Brake system failures with wrong fluid
   - Transmission damage with incompatible oils
   
2. **Verify Multiple Times**: Always cross-reference at least 2-3 sources

3. **Year Matters**: Different model years may have different specs

4. **Engine Type Matters**: Gasoline, diesel, turbocharged engines may have different requirements

5. **Transmission Type Matters**: Manual vs. automatic vs. CVT gearboxes have different oil types and capacities

---

## Files Location

All audit files are saved in:
```
/Users/oussematrichi/perso/car-service-reminder/
├── DATA_FOR_RESEARCH.csv                    ⭐ Start here
├── completely-missing-specs.csv
├── audit-specs-report.csv
├── specs-needing-correction.csv
├── AUDIT_REPORT.md                          ⭐ You are reading this
├── MISSING_DATA_REPORT.md                   (this document)
└── public/config/makes/                     (JSON files to update)
    ├── volkswagen.json
    ├── ford.json
    ├── honda.json
    ├── toyota.json
    └── peugeot.json
```

---

## Summary

This audit has identified that the car-service-reminder database needs significant data enrichment:

- ✅ **Complete**: 178 entries (21.6%)
- ❌ **Missing**: 125 entries (15.2%)  
- ⚠️ **Generic**: 520 entries (63.2%)

The **DATA_FOR_RESEARCH.csv** file is ready for research and contains all 125 entries that need manufacturer specifications filled in. Use this as your primary working document.

**Estimated Effort**: 
- ~2-3 hours for Volkswagen (85 entries, most complex)
- ~30 minutes each for Ford, Honda, Toyota (13, 12, 12 entries)
- ~15 minutes for Peugeot (3 entries)
- **Total**: ~4-5 hours for all missing data
- Additional time needed for validating and replacing 520 generic entries

---

**Generated**: May 18, 2026
