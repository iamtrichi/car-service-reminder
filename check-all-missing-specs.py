#!/usr/bin/env python3
import json
from pathlib import Path

base = Path('public/config/makes')
missing_by_make = {}
for json_file in sorted(base.glob('*.json')):
    if json_file.name in ['all-makes-models.json', 'missing-models-report.json']:
        continue
    with open(json_file, 'r') as f:
        data = json.load(f)
    missing = 0
    engine_missing = 0
    for model in data.get('models', []):
        for engine in model.get('engines', []):
            fields = ['brakeFluidType','coolantType','gearboxOilType','gearboxOilCapacity']
            if any(field not in engine for field in fields):
                engine_missing += 1
                missing += sum(1 for field in fields if field not in engine)
    if engine_missing:
        missing_by_make[data.get('make', json_file.stem)] = (engine_missing, missing)
        print(f"{json_file.name}: {engine_missing} engines missing {missing} fields")

print('\nSummary:')
for make, (engines, fields) in missing_by_make.items():
    print(f"{make}: {engines} engines missing {fields} fields")
print(f"Total makes with missing entries: {len(missing_by_make)}")
