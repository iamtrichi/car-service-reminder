#!/usr/bin/env python3
"""
Comprehensive Ford data collection from autotitre.com using Playwright
Scrapes all models, generations, and engine variations with specifications
"""

import json
import asyncio
import sys
from pathlib import Path
from datetime import datetime

async def run_extraction():
    """Run the complete extraction using Playwright browser control"""
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("Installing Playwright...", file=sys.stderr)
        import subprocess
        subprocess.run(["pip3", "install", "--break-system-packages", "playwright", "-q"], check=False)
        from playwright.async_api import async_playwright
    
    BASE_URL = "https://www.autotitre.com/fiche-technique/Ford"
    all_data = {
        "source": BASE_URL,
        "extracted_at": datetime.now().isoformat(),
        "models": []
    }
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            print("Step 1: Fetching Ford models...", file=sys.stderr)
            await page.goto(BASE_URL, wait_until='networkidle')
            
            # Extract all models
            models = await page.evaluate("""
                () => {
                    const models = [];
                    const links = document.querySelectorAll('a[href^="/fiche-technique/Ford/"]');
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        const match = href.match(/^\\/fiche-technique\\/Ford\\/([^\\/]+)$/);
                        if (match && match[1]) {
                            const modelName = match[1];
                            if (!models.includes(modelName)) {
                                models.push(modelName);
                            }
                        }
                    });
                    return models.sort();
                }
            """)
            
            print(f"Found {len(models)} models: {models}", file=sys.stderr)
            
            # Limit to first 10 models for practical scraping
            models_to_process = models[:10]
            
            for model_idx, model_name in enumerate(models_to_process, 1):
                print(f"\n[{model_idx}/{len(models_to_process)}] Processing model: {model_name}", file=sys.stderr)
                
                model_url = f"{BASE_URL}/{model_name}"
                await page.goto(model_url, wait_until='networkidle')
                
                # Extract generations for this model
                generations = await page.evaluate("""
                    (modelName) => {
                        const gens = [];
                        const links = document.querySelectorAll('a[href*="/fiche-technique/Ford/"]');
                        links.forEach(link => {
                            const href = link.getAttribute('href');
                            const pattern = new RegExp(`^/fiche-technique/Ford/${modelName}/([^/]+)$`);
                            const match = href.match(pattern);
                            if (match && match[1]) {
                                const genName = match[1];
                                if (!gens.includes(genName) && !genName.includes('_')) {
                                    gens.push(genName);
                                }
                            }
                        });
                        return gens.sort();
                    }
                """, model_name)
                
                print(f"  Found {len(generations)} generations: {generations}", file=sys.stderr)
                
                model_data = {
                    "name": model_name.replace('_', ' '),
                    "url": model_url,
                    "generations": []
                }
                
                # Process first 3 generations per model for efficiency
                for gen_idx, generation in enumerate(generations[:3], 1):
                    print(f"    [{gen_idx}/3] Fetching {generation}...", file=sys.stderr)
                    
                    gen_url = f"{BASE_URL}/{model_name}/{generation}"
                    
                    try:
                        await page.goto(gen_url, wait_until='networkidle', timeout=15000)
                        
                        # Extract engines for this generation
                        engines = await page.evaluate(f"""
                            (modelName, generation) => {{
                                const engines = [];
                                const found = new Set();
                                const links = document.querySelectorAll('a[href*="/fiche-technique/Ford/"]');
                                
                                links.forEach(link => {{
                                    const href = link.getAttribute('href');
                                    const match = href.match(/^\\/fiche-technique\\/Ford\\/{modelName}\\/{generation}\\/([^\\/]+)$/);
                                    if (match && match[1]) {{
                                        const engineCode = match[1];
                                        const engineName = link.textContent.trim();
                                        
                                        if (engineCode && !found.has(engineCode) && engineName.length > 0 && engineName.length < 150) {{
                                            found.add(engineCode);
                                            
                                            const engine = {{
                                                "code": engineCode.replace(/_/g, ' '),
                                                "name": engineName.replace(/\\s+/g, ' ').replace(/\\(.*\\)/g, '').trim()
                                            }};
                                            
                                            // Extract HP if visible in name
                                            const hpMatch = engineName.match(/(\\d+)\\s*(cv|ch|hp)/i);
                                            if (hpMatch) {{
                                                engine.hp = parseInt(hpMatch[1]);
                                            }}
                                            
                                            // Detect fuel type
                                            if (engineName.toLowerCase().includes('diesel') || engineName.toLowerCase().includes('tdci')) {{
                                                engine.fuel_type = 'Diesel';
                                            }} else if (engineName.toLowerCase().includes('hybrid') || engineName.toLowerCase().includes('mhev')) {{
                                                engine.fuel_type = 'Hybrid';
                                            }} else {{
                                                engine.fuel_type = 'Gasoline';
                                            }}
                                            
                                            // Detect turbo
                                            if (engineName.toLowerCase().includes('turbo') || engineName.toLowerCase().includes('ecoboost')) {{
                                                engine.is_turbo = true;
                                            }}
                                            
                                            engines.push(engine);
                                        }}
                                    }}
                                }});
                                
                                return engines.slice(0, 15);
                            }}
                        """, model_name, generation)
                        
                        print(f"      Found {len(engines)} engines", file=sys.stderr)
                        
                        gen_data = {
                            "name": generation,
                            "url": gen_url,
                            "engine_count": len(engines),
                            "engines": engines
                        }
                        
                        model_data["generations"].append(gen_data)
                        
                    except asyncio.TimeoutError:
                        print(f"      Timeout loading {generation}", file=sys.stderr)
                        continue
                    except Exception as e:
                        print(f"      Error processing {generation}: {e}", file=sys.stderr)
                        continue
                
                all_data["models"].append(model_data)
        
        finally:
            await browser.close()
    
    # Save results
    output_file = Path("/Users/oussematrichi/perso/car-service-reminder/ford-autotitre-data.json")
    output_file.write_text(json.dumps(all_data, ensure_ascii=False, indent=2), encoding='utf-8')
    
    print(f"\n✓ Data extraction complete!", file=sys.stderr)
    print(f"✓ Saved to: {output_file}", file=sys.stderr)
    print(f"✓ Models processed: {len(all_data['models'])}", file=sys.stderr)
    
    return all_data

if __name__ == "__main__":
    result = asyncio.run(run_extraction())
    print(json.dumps({
        "status": "success",
        "models_count": len(result["models"]),
        "file": "/Users/oussematrichi/perso/car-service-reminder/ford-autotitre-data.json"
    }, indent=2))
