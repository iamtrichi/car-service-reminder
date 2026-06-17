(async () => {
  // ============================================
  // CONFIG
  // ============================================

  const BASE = "https://www.autotitre.com";

  // SAFER:
  // Start with only a few models
  // Add more later
  const FETCHED_MODELS = [
    "Fiesta",
    "Focus",
    "Mondeo",
    "C-Max",
    "Fusion",
    "Fusion",
    "Kuga",
    "Mustang",
    "Puma",
    "Ranger",
    "S-Max",
    "Tourneo_Custom",
    "Aerostar",
    "Capri",
    "Cortina",
    "Cougar",
    "Escort",
    "Expedition",
    "Explorer",
    "GT",
    "GT40",
    "Ka",
    "Maverick",
    "Orion",
    "Probe",
    "RS_200",
    "Scorpio"
  ];
  const iteration = 7;
  const MODELS_TO_SCRAPE = [
    "Sierra",
    "SportKa",
    "StreetKa",
    "Taunus"
  ];

  // Delay between requests
  const MIN_DELAY = 4000;
  const MAX_DELAY = 9000;

  // ============================================
  // HELPERS
  // ============================================

  const delay = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

  function randomDelay() {
    return (
      MIN_DELAY +
      Math.random() * (MAX_DELAY - MIN_DELAY)
    );
  }

  function clean(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function createYearsArray(start, end) {
    const years = [];

    for (let y = start; y <= end; y++) {
      years.push(y);
    }

    return years;
  }

  async function fetchHTML(url, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`\nFetching: ${url}`);

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
          }
        });

        // BLOCKED
        if (response.status === 403) {
          console.warn("403 BLOCKED");

          const wait = 20000 * attempt;

          console.log(`Waiting ${wait / 1000}s`);

          await delay(wait);

          continue;
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        return await response.text();
      } catch (err) {
        console.warn(
          `Retry ${attempt}/${retries}`,
          err.message
        );

        await delay(5000 * attempt);
      }
    }

    throw new Error(`Failed URL: ${url}`);
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(
      html,
      "text/html"
    );
  }

  // ============================================
  // FETCH GENERATIONS
  // ============================================

  async function getGenerations(model) {
    const url =
      `${BASE}/fiche-technique/Ford/${model}`;

    const html = await fetchHTML(url);

    const doc = parseHTML(html);

    const generations = [];

    doc.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");

      if (!href) return;

      const regex = new RegExp(
        `^/fiche-technique/Ford/${model}/([^/]+)$`
      );

      const match = href.match(regex);

      if (!match) return;

      const generationCode =
        decodeURIComponent(match[1]);

      const text = clean(a.textContent);

      // EXTRACT YEARS
      // Example:
      // Fiesta VII (2017 - ...)
      const yearMatch = text.match(
        /(\d{4})\s*-\s*(\d{4}|\.\.\.)/
      );

      let years = [];

      if (yearMatch) {
        const start = parseInt(yearMatch[1]);

        const end =
          yearMatch[2] === "..."
            ? new Date().getFullYear()
            : parseInt(yearMatch[2]);

        years = createYearsArray(start, end);
      }

      generations.push({
        generationCode,
        name: `${model} ${generationCode}`,
        years
      });
    });

    // REMOVE DUPLICATES
    return generations.filter(
      (v, i, arr) =>
        arr.findIndex(
          x =>
            x.generationCode ===
            v.generationCode
        ) === i
    );
  }

  // ============================================
  // FETCH ENGINES
  // ============================================

  async function getEngines(
    model,
    generation
  ) {
    const url =
      `${BASE}/fiche-technique/Ford/${model}/${generation}`;

    const html = await fetchHTML(url);

    const doc = parseHTML(html);

    const engines = [];

    doc.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");

      if (!href) return;

      const regex = new RegExp(
        `^/fiche-technique/Ford/${model}/${generation}/([^/]+)$`
      );

      const match = href.match(regex);

      if (!match) return;

      const engineSlug =
        decodeURIComponent(match[1]);

      const text = clean(a.textContent);

      const lower = text.toLowerCase();

      // HP
      const hpMatch = text.match(
        /(\d+)\s*(ch|cv|hp)/i
      );

      const hp = hpMatch
        ? parseInt(hpMatch[1])
        : null;

      // DISPLACEMENT
      const displacementMatch =
        text.match(/(\d\.\d)\s*l/i);

      const displacement =
        displacementMatch
          ? `${displacementMatch[1]}L`
          : null;

      // FUEL TYPE
      let fuelType = "Unknown";

      if (
        lower.includes("tdci") ||
        lower.includes("diesel")
      ) {
        fuelType = "Diesel";
      } else if (
        lower.includes("ecoboost") ||
        lower.includes("essence")
      ) {
        fuelType = "Gasoline";
      } else if (
        lower.includes("hybrid")
      ) {
        fuelType = "Hybrid";
      } else if (
        lower.includes("electric")
      ) {
        fuelType = "Electric";
      }

      // TURBO
      const isTurbo =
        lower.includes("turbo") ||
        lower.includes("ecoboost") ||
        lower.includes("tdci");

      engines.push({
        engineCode:
          engineSlug.toUpperCase(),

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

        gearboxOilCapacity: null
      });
    });

    // REMOVE DUPLICATES
    return engines.filter(
      (v, i, arr) =>
        arr.findIndex(
          x => x.engineCode === v.engineCode
        ) === i
    );
  }

  // ============================================
  // MAIN
  // ============================================

  const output = {
    make: "Ford",
    models: []
  };

  console.log("\nSTARTING SCRAPER\n");

  for (const model of MODELS_TO_SCRAPE) {
    try {
      console.log(
        `\n=========================`
      );

      console.log(`MODEL: ${model}`);

      console.log(
        `=========================`
      );

      await delay(randomDelay());

      const generations =
        await getGenerations(model);

      console.log(
        `Found ${generations.length} generations`
      );

      for (const generation of generations) {
        try {
          console.log(
            `\nGeneration: ${generation.generationCode}`
          );

          await delay(randomDelay());

          const engines =
            await getEngines(
              model,
              generation.generationCode
            );

          console.log(
            `Found ${engines.length} engines`
          );

          output.models.push({
            name: generation.name,

            years: generation.years,

            engines
          });

          // SAVE PARTIAL BACKUP
          localStorage.setItem(
            "ford_backup",
            JSON.stringify(output)
          );

          console.log(
            "Partial backup saved"
          );
        } catch (err) {
          console.error(
            `FAILED GENERATION ${generation.generationCode}`,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        `FAILED MODEL ${model}`,
        err
      );
    }
  }

  // ============================================
  // DOWNLOAD JSON
  // ============================================

  console.log("\nCREATING JSON FILE");

  const json = JSON.stringify(
    output,
    null,
    2
  );

  const blob = new Blob(
    [json],
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download = "Ford-"+iteration+".json";

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);

  console.log("\nDONE");
})();