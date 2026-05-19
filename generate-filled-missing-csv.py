#!/usr/bin/env python3
import csv
import json
from pathlib import Path

# Map by make/model/engine_code to engine data
engine_map = {}
for json_path in Path('public/config/makes').glob('*.json'):
    if json_path.name in ['all-makes-models.json', 'missing-models-report.json']:
        continue
    with open(json_path, 'r') as f:
        data = json.load(f)
    for model in data.get('models', []):
        for engine in model.get('engines', []):
            key = (data.get('make', json_path.stem), model.get('name'), engine.get('engineCode'))
            engine_map[key] = engine

rows = []
with open('completely-missing-specs.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = (row['make'], row['model'], row['engine_code'])
        engine = engine_map.get(key)
        if engine:
            row['brakeFluidType'] = engine.get('brakeFluidType', '')
            row['coolantType'] = engine.get('coolantType', '')
            row['gearboxOilType'] = engine.get('gearboxOilType', '')
            row['gearboxOilCapacity'] = engine.get('gearboxOilCapacity', '')
            rows.append(row)

with open('filled-missing-specs.csv', 'w', newline='') as f:
    fieldnames = list(rows[0].keys()) if rows else []
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f'Wrote filled-missing-specs.csv with {len(rows)} rows')
