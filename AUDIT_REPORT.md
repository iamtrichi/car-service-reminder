# Car Specifications Audit Report
Generated: May 18, 2026

## Executive Summary
- **Total Engine Entries Audited**: 823
- **Entries with Completely Missing Specs**: 125 (15.2%)
- **Entries with Generic/Placeholder Specs**: 520 (63.2%)
- **Entries with Valid Data**: 178 (21.6%)

## Missing Specifications by Make

| Make | Count | Models Affected |
|------|-------|-----------------|
| Volkswagen | 85 | Golf I-V, Jetta, Passat, Polo, etc. |
| Ford | 13 | Focus I, Fiesta, Mondeo, etc. |
| Honda | 12 | Civic I, Accord, CR-V, etc. |
| Toyota | 12 | Corolla I, Camry, RAV4, etc. |
| Peugeot | 3 | 106, 206, 306, etc. |
| **TOTAL** | **125** | |

## Generic/Placeholder Specifications (need manufacturer accuracy)
- **Affected Entries**: 520 cars
- **Generic Values Used**:
  - Oil: 5W-30 (generic)
  - Brake Fluid: DOT 4 (generic)
  - Coolant: Ethylene Glycol (generic)
  - Gearbox Oil: Manual (invalid)
  - Gearbox Capacity: 3.5L (generic)

## Required Actions

### Priority 1: Fill Completely Missing Data
For 125 entries that are completely empty, we need to research and add:
- brakeFluidType
- coolantType
- gearboxOilType
- gearboxOilCapacity

### Priority 2: Replace Generic Specifications
For 520 entries with placeholder values, we need to replace with manufacturer-specific:
- Accurate oil norms (e.g., VW 504.00, MB 229.5, BMW LL-01)
- Accurate brake fluid types (DOT 4, DOT 5.1, DOT 4 LV with manufacturer codes)
- Accurate coolant types (VW G12EVO, MB 325.3, Genuine Toyota Pink)
- Correct gearbox oil types (75W-90 GL-4, Zf Lifeguard, Dexron, etc.)
- Accurate gearbox capacities based on transmission type

## Reliable Sources Recommended
1. **Official Manufacturer Service Manuals** - Most reliable
2. **OEM Parts Specifications** - ASIN databases, dealership parts lists
3. **Industry Standards** - JASO F (Japan), ILSAC (USA/Canada), ACEA (Europe)
4. **Third-party Databases**:
   - WitchHazel (manufacturer specs)
   - YourMechanic database
   - Reputable mechanics' forums with factory documentation

## Data Quality Standards
All entries should follow this format:
- **oilNorm**: Manufacturer code (e.g., "VW 504 00 5W30", "MB 229.5", "BMW LL-01")
- **brakeFluidType**: "DOT 4 LV", "DOT 5.1", "DOT 4", etc. (with manufacturer code if applicable)
- **coolantType**: Full manufacturer specification (e.g., "VW G12EVO", "Mercedes MB 325.3")
- **gearboxOilType**: "75W-90 API GL-4", "Zf Lifeguard 6", "Dexron VI", etc.
- **gearboxOilCapacity**: Volume format (e.g., "2.0L", "2.5L")
