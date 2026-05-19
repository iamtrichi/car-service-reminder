#!/usr/bin/env python3
import json
from pathlib import Path

specs = {
    'Toyota': {
        'brakeFluidType': 'DOT 4',
        'coolantType': 'Toyota Genuine Coolant Pink',
        'gearboxOilType': '75W-90 API GL-4',
        'gearboxOilCapacity': '2.0L'
    },
    'Peugeot': {
        'brakeFluidType': 'DOT 4',
        'coolantType': 'G12',
        'gearboxOilType': '75W-90 API GL-4',
        'gearboxOilCapacity': '2.0L'
    }
}

for make, values in specs.items():
    path = Path('public/config/makes') / f'{make.lower()}.json'
    with open(path, 'r') as f:
        data = json.load(f)
    changed = 0
    for model in data.get('models', []):
        for engine in model.get('engines', []):
            missing = [field for field in values if field not in engine]
            if missing:
                for field in missing:
                    engine[field] = values[field]
                changed += 1
    print(f'{make}: updated {changed} engines')
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
