#!/usr/bin/env python3
import json
from pathlib import Path

for make_file in [Path('public/config/makes/toyota.json'), Path('public/config/makes/peugeot.json')]:
    with open(make_file, 'r') as f:
        data = json.load(f)
    print(make_file)
    missing = 0
    for model in data['models']:
        for engine in model['engines']:
            for field in ['brakeFluidType','coolantType','gearboxOilType','gearboxOilCapacity']:
                if field not in engine:
                    missing += 1
                    print(f" missing: {model['name']} {engine.get('engineCode')} field {field}")
    print('total missing fields:', missing)
    print('---')
