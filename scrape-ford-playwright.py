#!/usr/bin/env python3
"""
Comprehensive Ford data scraper using Playwright
Fetches all models, generations, and engine specifications
"""

import json
import asyncio
from playwright.async_api import async_playwright
import sys

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        BASE_URL = "https://www.autotitre.com/fiche-technique/Ford"
        
        # Fetch main models page
        print("Fetching Ford models...", file=sys.stderr)
        await page.goto(f"{BASE_URL}")
        await page.wait_for_load_state('networkidle')
        
        # Extract all models
        models = await page.evaluate("""
        () => {
            const models = [];
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.match(/^\\/fiche-technique\\/Ford\\/([^\\/]+)$/)) {
                    const match = href.match(/^\\/fiche-technique\\/Ford\\/([^\\/]+)$/);
                    if (match) {
                        const modelName = match[1];
                        if (modelName && !models.includes(modelName)) {
                            models.push(modelName);
                        }
                    }
                }
            });
            return models;
        }
        """)
        
        print(f"Found {len(models)} models: {models}", file=sys.stderr)
        
        all_data = {
            "source": "https://www.autotitre.com/fiche-technique/Ford",
            "scraped_at": str(asyncio.get_event_loop().time()),
            "models": []
        }
        
        # Process first 15 models (for testing)
        for idx, model_name in enumerate(models[:15]):
            print(f"[{idx+1}/{min(15, len(models))}] Processing {model_name}...", file=sys.stderr)
            
            model_url = f"{BASE_URL}/{model_name}"
            await page.goto(model_url, wait_until='networkidle')
            
            # Extract generations
            generations = await page.evaluate(f"""
            (modelName) => {{
                const gens = [];
                const links = document.querySelectorAll('a');
                links.forEach(link => {{
                    const href = link.getAttribute('href');
                    if (href && href.includes('/fiche-technique/Ford/')) {{
                        const match = href.match(/^\\/fiche-technique\\/Ford\\/{modelName}\\/([^\\/]+)$/);
                        if (match) {{
                            const genName = match[1];
                            if (genName && !gens.includes(genName)) {{
                                gens.push(genName);
                            }}
                        }}
                    }}
                }});
                return gens;
            }}
            """, model_name)
            
            print(f"  Found {len(generations)} generations: {generations[:5]}...", file=sys.stderr)
            
            model_data = {
                "name": model_name,
                "generations": []
            }
            
            # Process first 5 generations per model
            for gen_idx, generation in enumerate(generations[:5]):
                gen_url = f"{BASE_URL}/{model_name}/{generation}"
                
                try:
                    await page.goto(gen_url, wait_until='networkidle', timeout=10000)
                    
                    # Extract engine info from the page
                    engine_data = await page.evaluate("""
                    () => {
                        const engines = [];
                        
                        // Try multiple selectors to find engine information
                        const selectors = [
                            'table tr', // Tables
                            '[data-engine]', // Data attributes
                            '.engine', // Engine class
                            '[class*="motor"]', // Motor-related classes
                            'li' // List items (fallback)
                        ];
                        
                        // Look for engine rows in tables
                        const tables = document.querySelectorAll('table');
                        const found = new Set();
                        
                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tbody tr');
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    const engineName = cells[0].textContent.trim();
                                    if (engineName && engineName.length > 0 && engineName.length < 100 && !found.has(engineName)) {
                                        found.add(engineName);
                                        
                                        const engine = {
                                            "name": engineName.replace(/\\n/g, ' ').trim()
                                        };
                                        
                                        // Extract other data from cells
                                        for (let i = 1; i < cells.length; i++) {
                                            const cellText = cells[i].textContent.trim();
                                            if (cellText.toLowerCase().includes('ch') || cellText.toLowerCase().includes('cv')) {
                                                const hpMatch = cellText.match(/(\\d+)/);
                                                if (hpMatch) engine.hp = parseInt(hpMatch[1]);
                                            }
                                            if (cellText.includes('l') && !cellText.toLowerCase().includes('fuel')) {
                                                engine.displacement = cellText;
                                            }
                                        }
                                        
                                        if (engine.name) engines.push(engine);
                                    }
                                }
                            });
                        });
                        
                        return engines;
                    }
                    """)
                    
                    print(f"    {generation}: {len(engine_data)} engines", file=sys.stderr)
                    
                    gen_info = {
                        "name": generation,
                        "engines": engine_data
                    }
                    model_data["generations"].append(gen_info)
                    
                except Exception as e:
                    print(f"    Error processing {generation}: {e}", file=sys.stderr)
                    continue
            
            all_data["models"].append(model_data)
        
        # Save results
        output_file = "/Users/oussematrichi/perso/car-service-reminder/ford-scrape-results.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        
        print(f"\nResults saved to {output_file}", file=sys.stderr)
        print(json.dumps({"status": "success", "models_processed": len(all_data["models"])}, indent=2))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
