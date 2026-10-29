/* Revel Homes build-cost rates — Collingwood / South Georgian Bay planning profile */
window.REVEL_CALC = {
  currency: "CAD",
  assetsBase: "https://media.cwd-cdn.com/revel-homes/calc/",
  scheduleUrl: "tel:7059854776",
  basePerSqft: {
    unfinishedBasement: 110,
    finishedBasementRec: 145,
    finishedBasementSuite: 175,
    garageUnheated: 110,
    garageHeated: 160,
    mainFloorStandard: 220,
    mainFloorCustom: 320,
    kitchen: 650,
    ensuitePrimary: 850,
    bathSecondary: 500,
    powder: 380,
    coveredPorch: 110,
    muskokaRoom: 200,
    detachedGarage: 160,
    coachHouse: 360
  },
  finishMultipliers: {
    builder: 0.85,
    mid: 1,
    custom: 1.2,
    luxury: 1.45
  },
  finishLabels: {
    builder: "Builder",
    mid: "Mid",
    custom: "Custom",
    luxury: "Luxury"
  },
  finishBlurb: {
    builder: "Production spec, vinyl plank, laminate counters.",
    mid: "Engineered hardwood, quartz, semi-custom cabinets.",
    custom: "Wide-plank oak, full-tile baths, Marvin/Loewen windows.",
    luxury: "Natural stone, panel-ready appliances, custom millwork."
  },
  kitchenMultipliers: {
    standard: 0.85,
    matching: 1,
    premium: 1.3
  },
  kitchenLabels: {
    standard: "Standard",
    matching: "Matching home",
    premium: "Premium"
  },
  kitchenBlurb: {
    standard: "Builder cabinetry and laminate or entry quartz.",
    matching: "Kitchen finishes follow the home’s finish tier.",
    premium: "Step the kitchen above the rest of the house."
  },
  storeyMultipliers: {
    1: 1,
    2: 1.04
  },
  locationMultipliers: {
    urban: 1,
    thornbury: 1.05,
    "ski-corridor": 1.2,
    waterfront: 1.25,
    rural: 0.95
  },
  locationOptions: [
    { key: "urban", label: "Urban / in-town" },
    { key: "thornbury", label: "Thornbury / Lora Bay" },
    { key: "ski-corridor", label: "Ski corridor (Craigleith / Alpine / Peaks)" },
    { key: "waterfront", label: "Georgian Bay waterfront" },
    { key: "rural", label: "Rural / countryside" }
  ],
  municipalities: [
    { key: "collingwood", label: "Town of Collingwood", devCharge: 50000 },
    { key: "tbm-swiss-meadows", label: "Blue Mountains (Swiss Meadows)", devCharge: 22639 },
    { key: "tbm-thornbury", label: "Blue Mountains (Thornbury)", devCharge: 60000 },
    { key: "tbm-osler", label: "Blue Mountains (Osler)", devCharge: 101183 },
    { key: "clearview", label: "Clearview Township", devCharge: 25000 },
    { key: "creemore", label: "Creemore", devCharge: 25000 },
    { key: "wasaga-beach", label: "Wasaga Beach", devCharge: 35000 },
    { key: "meaford", label: "Meaford", devCharge: 18000 },
    { key: "mulmur", label: "Mulmur", devCharge: 18000 }
  ],
  siteCosts: {
    well: 15000,
    septic: 28000,
    municipalHookup: 12000,
    drivewayRural: 12000,
    rockBlasting: { none: 0, moderate: 20000, heavy: 60000 },
    landscapingBaselinePct: 0.05
  },
  permitRatePerSqft: 2.25,
  tarionFeeTable: [
    { minSale: 0, fee: 850 },
    { minSale: 350000, fee: 1175 },
    { minSale: 550000, fee: 1790 },
    { minSale: 800000, fee: 2710 },
    { minSale: 1200000, fee: 3580 },
    { minSale: 1800000, fee: 4500 }
  ],
  softCostPct: 0.22,
  contingencyPct: 0.12,
  taxes: { rate: 0.13, label: "HST" },
  rangeBandPct: 0.15,
  roomLabels: {
    mainFloorStandard: "Main floor — standard",
    mainFloorCustom: "Main floor — custom",
    kitchen: "Kitchen",
    ensuitePrimary: "Primary ensuite",
    bathSecondary: "Secondary full bath",
    powder: "Powder room",
    unfinishedBasement: "Unfinished basement",
    finishedBasementRec: "Finished basement (rec)",
    finishedBasementSuite: "Finished basement (legal suite)",
    garageUnheated: "Garage (unheated)",
    garageHeated: "Garage (heated)",
    detachedGarage: "Detached garage / shop",
    coveredPorch: "Covered porch",
    muskokaRoom: "Muskoka / 3-season room",
    coachHouse: "Coach house"
  },
  allowanceKeys: [
    "mainFloorStandard",
    "mainFloorCustom",
    "kitchen",
    "ensuitePrimary",
    "unfinishedBasement",
    "finishedBasementRec",
    "finishedBasementSuite"
  ],
  heroImages: {
    tier: "exterior-dusk.jpg",
    main: "main-floor.jpg",
    kitchen: "kitchen-mid.jpg",
    kitchenLux: "kitchen-luxury.jpg",
    ensuite: "ensuite.jpg",
    basement: "basement.jpg",
    garage: "exterior-dusk.jpg",
    porch: "exterior-dusk.jpg"
  },
  disclaimer:
    "This estimate is a preliminary planning tool generated from current regional cost data and standard assumptions. It is NOT a quote, offer, or contractual commitment. Actual project costs depend on final design, site conditions, material selections, market conditions at time of build, and factors that cannot be assessed without a site visit. Estimates exclude land purchase, appliances, and furniture. HST is shown separately and may be partially rebated for owner-built homes in many cases. Revel Homes will provide a binding fixed-price or cost-plus proposal only after a paid pre-construction agreement and site assessment."
};
