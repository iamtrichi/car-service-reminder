#!/usr/bin/env python3
import csv

# Create CSV for missing specs only
missing_specs_csv = []
all_specs = []

with open("audit-specs-report.csv", 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        all_specs.append(row)
        
        # Flag issues
        issues = []
        if row['brakeFluidType'] == 'MISSING' or row['brakeFluidType'] == '':
            issues.append('brake_fluid')
        if row['coolantType'] == 'MISSING' or row['coolantType'] == '':
            issues.append('coolant')
        if row['gearboxOilType'] == 'MISSING' or row['gearboxOilType'] == '':
            issues.append('gearbox_oil')
        if row['gearboxOilCapacity'] == 'MISSING' or row['gearboxOilCapacity'] == '':
            issues.append('gearbox_capacity')
            
        # Check for generic values
        if row['coolantType'] == 'Ethylene Glycol' and row['oilNorm'] == '5W-30':
            issues.append('generic_specs')
            
        if issues:
            row['issues'] = ','.join(issues)
            missing_specs_csv.append(row)

# Save CSV with issues
with open("specs-needing-correction.csv", 'w', newline='') as f:
    fieldnames = list(all_specs[0].keys()) + ['issues']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(missing_specs_csv)

print(f"Created specs-needing-correction.csv with {len(missing_specs_csv)} entries needing review\n")

# Show summary
issues_by_category = {}
for spec in missing_specs_csv:
    issues = spec.get('issues', '').split(',')
    for issue in issues:
        if issue not in issues_by_category:
            issues_by_category[issue] = []
        car_name = spec['make'] + ' ' + spec['model']
        issues_by_category[issue].append(car_name)

print("Issues by category:")
for issue, cars in sorted(issues_by_category.items()):
    print(f"\n{issue}: {len(cars)} cars")
    for car in cars[:3]:  # Show first 3
        print(f"  - {car}")
    if len(cars) > 3:
        print(f"  ... and {len(cars)-3} more")

unique_cars = set()
for spec in missing_specs_csv:
    unique_cars.add(spec['make'] + ' ' + spec['model'])

print(f"\n\nTotal unique cars needing correction: {len(unique_cars)}")
