#!/usr/bin/env python3
import json
from pathlib import Path

# Manufacturer-specific specs based on OEM standards
manufacturer_specs = {
    'Alfa Romeo': {'brakeFluidType': 'DOT 4', 'coolantType': 'Alfa Romeo G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Audi': {'brakeFluidType': 'DOT 4 LV', 'coolantType': 'VW G12EVO', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'BMW': {'brakeFluidType': 'DOT 4 LV', 'coolantType': 'BMW Coolant Blue', 'gearboxOilType': 'BMW Castrol RX Super', 'gearboxOilCapacity': '2.5L'},
    'BYD': {'brakeFluidType': 'DOT 4', 'coolantType': 'BYD Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Chevrolet': {'brakeFluidType': 'DOT 4', 'coolantType': 'Dex-Cool Orange', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Chery': {'brakeFluidType': 'DOT 4', 'coolantType': 'Chery Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Chrysler': {'brakeFluidType': 'DOT 4', 'coolantType': 'Mopar 5-Year Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Citroen': {'brakeFluidType': 'DOT 4', 'coolantType': 'Citroën G12 Red', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Dacia': {'brakeFluidType': 'DOT 4', 'coolantType': 'Renault Coolant G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Daewoo': {'brakeFluidType': 'DOT 4', 'coolantType': 'Daewoo Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Fiat': {'brakeFluidType': 'DOT 4', 'coolantType': 'Fiat Liquido Refrigerante', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Ford': {'brakeFluidType': 'DOT 4', 'coolantType': 'Motorcraft Orange', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'GWM': {'brakeFluidType': 'DOT 4', 'coolantType': 'GWM Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Honda': {'brakeFluidType': 'DOT 4', 'coolantType': 'Honda Genuine Coolant Blue', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '1.7L'},
    'Hyundai': {'brakeFluidType': 'DOT 4', 'coolantType': 'Hyundai Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Jeep': {'brakeFluidType': 'DOT 4', 'coolantType': 'Mopar Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Jetour': {'brakeFluidType': 'DOT 4', 'coolantType': 'Jetour Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Kia': {'brakeFluidType': 'DOT 4', 'coolantType': 'Kia Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Lancia': {'brakeFluidType': 'DOT 4', 'coolantType': 'Lancia Coolant G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Mazda': {'brakeFluidType': 'DOT 4', 'coolantType': 'Mazda Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '1.6L'},
    'Mercedes': {'brakeFluidType': 'DOT 4 LV', 'coolantType': 'MB 325.3 Red', 'gearboxOilType': 'MB 236.14 Atf', 'gearboxOilCapacity': '8.5L'},
    'MG': {'brakeFluidType': 'DOT 4', 'coolantType': 'MG Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Mini': {'brakeFluidType': 'DOT 4 LV', 'coolantType': 'BMW Coolant Blue', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Mitsubishi': {'brakeFluidType': 'DOT 4', 'coolantType': 'Mitsubishi Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Nissan': {'brakeFluidType': 'DOT 4', 'coolantType': 'Nissan Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Opel': {'brakeFluidType': 'DOT 4', 'coolantType': 'Opel Coolant G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Peugeot': {'brakeFluidType': 'DOT 4', 'coolantType': 'Peugeot G12 Red', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Proton': {'brakeFluidType': 'DOT 4', 'coolantType': 'Proton Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Renault': {'brakeFluidType': 'DOT 4', 'coolantType': 'Renault Coolant G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Seat': {'brakeFluidType': 'DOT 4', 'coolantType': 'VW G12 Red', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Skoda': {'brakeFluidType': 'DOT 4', 'coolantType': 'VW G12 Red', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Smart': {'brakeFluidType': 'DOT 4', 'coolantType': 'Daimler/Mercedes G12', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '1.5L'},
    'Subaru': {'brakeFluidType': 'DOT 4', 'coolantType': 'Subaru Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Suzuki': {'brakeFluidType': 'DOT 4', 'coolantType': 'Suzuki Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '1.7L'},
    'Toyota': {'brakeFluidType': 'DOT 4', 'coolantType': 'Toyota Genuine Coolant Pink', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Volkswagen': {'brakeFluidType': 'DOT 4 LV', 'coolantType': 'VW G12EVO', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
    'Volvo': {'brakeFluidType': 'DOT 4', 'coolantType': 'Volvo Genuine Coolant', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.5L'},
    'Cupra': {'brakeFluidType': 'DOT 4', 'coolantType': 'VW G12 Red', 'gearboxOilType': '75W-90 API GL-4', 'gearboxOilCapacity': '2.0L'},
}

updated_count = 0
for json_path in sorted(Path('public/config/makes').glob('*.json')):
    if json_path.name in ['all-makes-models.json', 'missing-models-report.json']:
        continue
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    make = data.get('make', json_path.stem)
    specs = manufacturer_specs.get(make)
    
    if not specs:
        print(f'WARNING: No specs defined for {make}')
        continue
    
    make_updated = 0
    for model in data.get('models', []):
        for engine in model.get('engines', []):
            # Check if engine has generic specs
            if (engine.get('coolantType') == 'Ethylene Glycol' or 
                engine.get('gearboxOilType') == 'Manual'):
                # Update with manufacturer-specific specs
                for field, value in specs.items():
                    if field not in engine or engine.get(field) in ['Ethylene Glycol', 'Manual', '3.5L', 'DOT 4']:
                        engine[field] = value
                make_updated += 1
    
    if make_updated:
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
            f.write('\n')
        print(f'{make}: updated {make_updated} engines')
        updated_count += make_updated

print(f'\n✓ Total updated: {updated_count} engines')
