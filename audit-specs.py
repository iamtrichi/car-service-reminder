#!/usr/bin/env python3
import json
import os
import csv
from pathlib import Path

def audit_car_specs():
    makes_dir = Path("public/config/makes")
    audit_results = []
    
    for json_file in sorted(makes_dir.glob("*.json")):
        if json_file.name in ["all-makes-models.json", "missing-models-report.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                make_name = data.get('make', 'Unknown')
                
                for model in data.get('models', []):
                    model_name = model.get('name', 'Unknown')
                    for engine in model.get('engines', []):
                        audit_results.append({
                            'make': make_name,
                            'model': model_name,
                            'engine_code': engine.get('engineCode', 'N/A'),
                            'engine_name': engine.get('engineName', 'N/A'),
                            'displacement': engine.get('displacement', 'N/A'),
                            'oilNorm': engine.get('oilNorm', 'MISSING'),
                            'oilCapacity': engine.get('oilCapacity', 'MISSING'),
                            'brakeFluidType': engine.get('brakeFluidType', 'MISSING'),
                            'coolantType': engine.get('coolantType', 'MISSING'),
                            'gearboxOilType': engine.get('gearboxOilType', 'MISSING'),
                            'gearboxOilCapacity': engine.get('gearboxOilCapacity', 'MISSING'),
                        })
        except Exception as e:
            print(f"Error reading {json_file}: {e}")
    
    # Generate summary
    print(f"\n=== CAR SPECIFICATIONS AUDIT ===\n")
    print(f"Total engine entries: {len(audit_results)}\n")
    
    # Check for missing fields
    missing_counts = {
        'oilNorm': 0,
        'oilCapacity': 0,
        'brakeFluidType': 0,
        'coolantType': 0,
        'gearboxOilType': 0,
        'gearboxOilCapacity': 0,
    }
    
    for result in audit_results:
        for field in missing_counts.keys():
            if result[field] == 'MISSING' or result[field] == '':
                missing_counts[field] += 1
    
    print("Missing/Empty Fields:")
    for field, count in missing_counts.items():
        percentage = (count / len(audit_results)) * 100
        print(f"  {field}: {count} ({percentage:.1f}%)")
    
    # Generate CSV with issues
    print("\n\nGenerating audit report...")
    csv_path = "audit-specs-report.csv"
    with open(csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=audit_results[0].keys())
        writer.writeheader()
        writer.writerows(audit_results)
    
    print(f"Report saved to: {csv_path}")
    
    return audit_results

if __name__ == "__main__":
    audit_car_specs()
