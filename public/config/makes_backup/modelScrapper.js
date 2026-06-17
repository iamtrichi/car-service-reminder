const activeCarMakers = [
  /*"Alfa_Romeo",*/
  "Aston_Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Bugatti",
  "BYD",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Citroën",
  "Cupra",
  "Dacia",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Koenigsegg",
  "Lamborghini",
  "Land_Rover",
  "Lexus",
  "Lincoln",
  "Lotus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Pagani",
  "Peugeot",
  "Polestar",
  "Porsche",
  "Ram",
  "Renault",
  "Rolls-Royce",
  "SEAT",
  "Skoda",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Vauxhall",
  "Volvo"
];

window.scrapeModels = async function (brandName = "Ford") {
  const BASE = "https://www.autotitre.com";

  const MIN_DELAY = 500;
  const MAX_DELAY = 1500;
  const MAX_RETRIES = 5;

  const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  function randomDelay() {
    return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  }

  function clean(text = "") {
    return text.replace(/\s+/g, " ").trim();
  }

  function toSlug(str = "") {
    return str.trim().replace(/\s+/g, "_");
  }

  function escapeRegex(str = "") {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function yearsArray(start, end) {
    const years = [];
    for (let y = start; y <= end; y++) years.push(y);
    return years;
  }

  // =====================================================
  // FIXED YEAR PARSER (IMPORTANT UPDATE)
  // =====================================================
  function extractYears(text = "") {
    const closedRange = text.match(
      /\((\d{4})-(\d{4})\)/
    );
    if (closedRange) {
      const start = parseInt(closedRange[1]);
      const end = parseInt(closedRange[2]);
      return yearsArray(start, end);
    }
    const openRange = text.match(
      /\((\d{4})-\)/
    );
    if (openRange) {
      const start = parseInt(openRange[1]);
      return yearsArray(
        start,
        new Date().getFullYear()
      );
    }
    return [];
  }

  async function fetchHTML(url, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await delay(randomDelay());

        const response = await fetch(url, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          },
        });

        if (response.status === 403) {
          await delay(30000 * attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.text();
      } catch (err) {
        await delay(5000 * attempt);
      }
    }

    throw new Error(`FAILED URL`);
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  // =====================================================
  // MODELS
  // =====================================================
  async function getAllModels() {
    const url = `${BASE}/fiche-technique/${toSlug(brandName)}`;
    console.log("FETCHING:", url);
    const html = await fetchHTML(url);
    const doc = parseHTML(html);

    const models = new Set();

    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;

      const match = href.match(
        new RegExp(
          `^/fiche-technique/${escapeRegex(
            toSlug(brandName)
          )}/([^/]+)$`,
          "i"
        )
      );

      if (match) {
        const model = decodeURIComponent(match[1]);
        models.add(model);
      }
    });

    return [...models].sort();
  }

  // =====================================================
  // GENERATIONS (FIXED YEARS HERE)
  // =====================================================
  async function getGenerations(model) {
    const modelSlug = toSlug(model);

    const url = `${BASE}/fiche-technique/${toSlug(
      brandName
    )}/${modelSlug}`;
    console.log("GEN URL:", url);

    const html = await fetchHTML(url);
    const doc = parseHTML(html);

    const generations = [];

    const links = [...doc.querySelectorAll("a")];

    for (const a of links) {
      const href = a.getAttribute("href");
      if (!href) continue;

      const regex = new RegExp(
        `^/fiche-technique/${escapeRegex(
          toSlug(brandName)
        )}/${escapeRegex(modelSlug)}/([^/]+)$`,
        "i"
      );

      const match = href.match(regex);
      if (!match) continue;

      const generationCode = decodeURIComponent(match[1]);

      // =====================================================
      // STEP 1: FETCH GENERATION PAGE (NEW IMPROVEMENT)
      // =====================================================
      const genUrl = `${BASE}/fiche-technique/${toSlug(
        brandName
      )}/${modelSlug}/${generationCode}`;

      let years = [];

      try {
        const genHtml = await fetchHTML(genUrl);
        const genDoc = parseHTML(genHtml);

        // =====================================================
        // STEP 2: EXTRACT YEARS FROM PAGE HEADER
        // =====================================================

        const titleText =
          genDoc.querySelector("h1")?.textContent ||
          genDoc.title ||
          "";

        // Example titles:
        // "Ford Fiesta VII (2017 - 2023)"
        // "Ford Focus III 2011 - 2018"
        // "Ford Mondeo IV (à partir de 2014)"

        years = extractYears(titleText);

        // =====================================================
        // STEP 3: fallback if header fails
        // =====================================================

        if (!years.length) {
          const fallbackText = clean(a.textContent);
          years = extractYears(fallbackText);
        }
      } catch (err) {
        console.warn("GEN PAGE FAILED:", genUrl);

        const fallbackText = clean(a.textContent);
        years = extractYears(fallbackText);
      }

      generations.push({
        model,
        generation: generationCode,
        years,
      });
    }

    return generations.filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.generation === v.generation) === i
    );
  }


  // =====================================================
  // ENGINES (unchanged)
  // =====================================================
  async function getEngines(model, generation) {
    const modelSlug = toSlug(model);
    const generationSlug = toSlug(generation);

    const url = `${BASE}/fiche-technique/${toSlug(
      brandName
    )}/${modelSlug}/${generationSlug}`;

    const html = await fetchHTML(url);
    const doc = parseHTML(html);

    const engines = [];

    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;

      const regex = new RegExp(
        `^/fiche-technique/${escapeRegex(
          toSlug(brandName)
        )}/${escapeRegex(modelSlug)}/${escapeRegex(
          generationSlug
        )}/([^/]+)$`,
        "i"
      );

      const match = href.match(regex);
      if (!match) return;

      const engineSlug = decodeURIComponent(match[1]);
      const text = clean(a.textContent);
      const smallText =
        clean(a.querySelector("small")?.textContent || "");
      const years = extractYears(smallText);
      const lower = text.toLowerCase();

      const hpMatch = text.match(/(\d+)\s*(hp|cv|ch)/i);
      const hp = hpMatch ? parseInt(hpMatch[1]) : null;

      let displacement = null;
      const d1 = text.match(/(\d\.\d+)\s*l/i);
      if (d1) displacement = `${d1[1]}L`;

      const d2 = text.match(/(\d{3,4})\s*cc/i);
      if (!displacement && d2) {
        displacement = `${(parseInt(d2[1]) / 1000).toFixed(1)}L`;
      }

      let fuelType = "Unknown";
      if (
        lower.includes("diesel") ||
        lower.includes("tdci") ||
        lower.includes("dci") ||
        lower.includes("hdi")
      ) {
        fuelType = "Diesel";
      } else if (
        lower.includes("ecoboost") ||
        lower.includes("tsi") ||
        lower.includes("tfsi") ||
        lower.includes("fsi") ||
        lower.includes("gdi")
      ) {
        fuelType = "Gasoline";
      } else if (lower.includes("hybrid")) {
        fuelType = "Hybrid";
      } else if (lower.includes("electric")) {
        fuelType = "Electric";
      }

      const isTurbo =
        lower.includes("turbo") ||
        lower.includes("ecoboost") ||
        lower.includes("tsi") ||
        lower.includes("tdci");

      engines.push({
        engineCode: engineSlug.toUpperCase(),
        engineName: text,
        hp,
        fuelType,
        isTurbo,
        displacement,
        oilCapacity: null,
        oilNorm: null,
        brakeFluidType: null,
        coolantType: null,
        gearboxOilType: null,
        gearboxOilCapacity: null,
        years,
      });
    });

    return engines;
  }

  // =====================================================
  // MAIN
  // =====================================================
  console.log("STARTING SCRAPER:", brandName);

  const output = {
    make: brandName,
    models: [],
  };

  const allModels = await getAllModels();
  console.log("MODELS:", allModels.length);

  for (const model of allModels.slice(0,2)) {
    const generations = await getGenerations(model);

    for (const gen of generations) {
      const engines = await getEngines(model, gen.generation);

      output.models.push({
        model,
        generation: gen.generation,
        years:
        gen.years.length
          ? gen.years
          : [
              ...new Set(
                engines.flatMap((e) => e.years || [])
              ),
            ].sort((a, b) => a - b),
        engines,
      });
    }
  }

  const blob = new Blob(
    [JSON.stringify(output, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${toSlug(brandName)}.json`;
  a.click();

  return output;
};
for (const e of activeCarMakers) {
    await scrapeModels(e);
}