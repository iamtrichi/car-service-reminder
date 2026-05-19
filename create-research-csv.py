#!/usr/bin/env python3
import csv

# Read completely missing specs and create a research-ready CSV
missing_data = []
with open("completely-missing-specs.csv", 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        missing_data.append({
            'make': row['make'],
            'model': row['model'],
            'engine_code': row['engine_code'],
            'engine_name': row['engine_name'],
            'displacement': row['displacement'],
            'fuelType': row.get('fuelType', 'Unknown'),
            'hp': row.get('hp', 'Unknown'),
            'oilNorm': row['oilNorm'],
            'oilCapacity': row['oilCapacity'],
            'brakeFluidType': row['brakeFluidType'] if row['brakeFluidType'] != 'MISSING' else '',
            'coolantType': row['coolantType'] if row['coolantType'] != 'MISSING' else '',
            'gearboxOilType': row['gearboxOilType'] if row['gearboxOilType'] != 'MISSING' else '',
            'gearboxOilCapacity': row['gearboxOilCapacity'] if row['gearboxOilCapacity'] != 'MISSING' else '',
            'status': 'NEEDS_RESEARCH',
            'notes': 'Research official manufacturer specs'
        })

# Sort by make, then model for easier research
missing_data.sort(key=lambda x: (x['make'], x['model']))

# Save organized research CSV
if missing_data:
    with open("DATA_FOR_RESEARCH.csv", 'w', newline='') as f:
        fieldnames = [
            'make', 'model', 'engine_code', 'engine_name', 'displacement', 'fuelType', 'hp',
            'oilNorm', 'oilCapacity', 
            'brakeFluidType', 'coolantType', 'gearboxOilType', 'gearboxOilCapacity',
            'status', 'notes'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(missing_data)

# Create summary by make
print("=== Data Ready for Research ===\n")
makes_summary = {}
for row in missing_data:
    make = row['make']
    if make not in makes_summary:
        makes_summary[make] = {'count': 0, 'models': set()}
    makes_summary[make]['count'] += 1
    makes_summary[make]['models'].add(row['model'])

for make in sorted(makes_summary.keys()):
    count = makes_summary[make]['count']
    models = ', '.join(sorted(makes_summary[make]['models']))
    print(f"\n{make} ({count} entries)")
    print(f"  Models: {models}")

print("\n\n✓ File saved: DATA_FOR_RESEARCH.csv")
print("  This file is organized by Make and is ready for research")
