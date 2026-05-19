#!/usr/bin/env python3
"""
Comprehensive Ford data scraper from autotitre.com
Fetches all models, generations, and engine specifications
"""

import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import sys

BASE_URL = "https://www.autotitre.com/fiche-technique/Ford"
MODELS_URL = f"{BASE_URL}"

def get_page(url, retries=3):
    """Fetch page content with retry logic"""
    for attempt in range(retries):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for {url}: {e}", file=sys.stderr)
            if attempt < retries - 1:
                time.sleep(2)
            else:
                return None

def extract_models():
    """Extract all Ford models from main page"""
    print("Fetching Ford models...", file=sys.stderr)
    html = get_page(MODELS_URL)
    if not html:
        return []
    
    soup = BeautifulSoup(html, 'html.parser')
    models = []
    
    # Find all links like /fiche-technique/Ford/ModelName
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        # Match pattern: /fiche-technique/Ford/ModelName (exactly one slash after Ford)
        if '/fiche-technique/Ford/' in href:
            parts = href.split('/')
            if len(parts) == 5 and parts[3] == 'Ford':
                model_name = parts[4]
                if model_name and model_name not in models:
                    models.append(model_name)
    
    print(f"Found {len(models)} models: {models}", file=sys.stderr)
    return models

def extract_generations(model_name):
    """Extract all generations for a model"""
    url = f"{BASE_URL}/{model_name}"
    print(f"Fetching generations for {model_name}...", file=sys.stderr)
    html = get_page(url)
    if not html:
        return []
    
    soup = BeautifulSoup(html, 'html.parser')
    generations = []
    
    # Find generation links like /fiche-technique/Ford/Fiesta/VII
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        if f'/fiche-technique/Ford/{model_name}/' in href:
            parts = href.split('/')
            if len(parts) == 6 and parts[3] == 'Ford' and parts[4] == model_name:
                gen_name = parts[5]
                if gen_name and gen_name not in generations:
                    generations.append(gen_name)
    
    print(f"  Found {len(generations)} generations for {model_name}: {generations}", file=sys.stderr)
    return generations

def extract_engines(model_name, generation):
    """Extract all engines for a model/generation"""
    url = f"{BASE_URL}/{model_name}/{generation}"
    print(f"  Fetching engines for {model_name}/{generation}...", file=sys.stderr)
    html = get_page(url)
    if not html:
        return []
    
    soup = BeautifulSoup(html, 'html.parser')
    engines = []
    
    # Parse engine table/data from the page
    # The structure varies, but typically engines are listed in a table or list
    
    # Try to find engine information in table rows
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 3:
                # Extract engine data from row
                engine_info = {}
                
                # Try to extract engine name from first cell
                engine_name = cells[0].get_text().strip()
                if engine_name and 'engine' not in engine_name.lower():
                    engine_info['name'] = engine_name
                
                # Try to extract horsepower, displacement, etc.
                for i, cell in enumerate(cells[1:], 1):
                    text = cell.get_text().strip()
                    if text and len(text) < 100:
                        if 'ch' in text.lower() or 'hp' in text.lower() or 'cv' in text.lower():
                            try:
                                hp = int(''.join(filter(str.isdigit, text.split()[0])))
                                engine_info['hp'] = hp
                            except:
                                pass
                        elif 'l' in text.lower() or 'cc' in text.lower():
                            engine_info['displacement'] = text
                
                if 'name' in engine_info:
                    engines.append(engine_info)
    
    # If no tables found, try to extract from text divs
    if not engines:
        # Look for engine listings in divs with specific classes
        engine_divs = soup.find_all('div', class_=lambda x: x and ('engine' in x.lower() or 'motor' in x.lower()))
        for div in engine_divs:
            text = div.get_text().strip()
            if text:
                engines.append({'name': text})
    
    print(f"    Found {len(engines)} engines for {model_name}/{generation}", file=sys.stderr)
    return engines

def main():
    """Main scraping function"""
    print("Starting Ford data scrape from autotitre.com...", file=sys.stderr)
    
    all_data = {
        "source": "https://www.autotitre.com/fiche-technique/Ford",
        "models": []
    }
    
    models = extract_models()
    
    for model_name in models[:10]:  # Limit to first 10 models for testing
        model_data = {
            "name": model_name,
            "generations": []
        }
        
        generations = extract_generations(model_name)
        
        for generation in generations[:5]:  # Limit to first 5 generations per model
            gen_data = {
                "name": generation,
                "engines": extract_engines(model_name, generation)
            }
            model_data["generations"].append(gen_data)
        
        all_data["models"].append(model_data)
        time.sleep(1)  # Rate limiting
    
    # Save results
    output_file = "ford-scrape-results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nResults saved to {output_file}", file=sys.stderr)
    print(json.dumps(all_data, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
