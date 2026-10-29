(function () {
  "use strict";

  const DATA = window.REVEL_CALC;
  if (!DATA) return;

  const money = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: DATA.currency,
      maximumFractionDigits: 0
    }).format(Math.round(n || 0));

  const fmtSqft = (n) => `${Number(n || 0).toLocaleString("en-CA")} ft²`;

  function tarionFee(saleValue) {
    let fee = DATA.tarionFeeTable[0].fee;
    for (const row of DATA.tarionFeeTable) {
      if (saleValue >= row.minSale) fee = row.fee;
      else break;
    }
    return fee;
  }

  function defaultState() {
    return {
      step: 1,
      aboveGrade: 1800,
      storeys: 1,
      finishTier: "mid",
      kitchenFinish: "matching",
      garageSqft: 500,
      garageType: "attached",
      basementSqft: 1800,
      basementType: "unfinished",
      municipalityKey: "collingwood",
      locationKey: "urban",
      servicing: "municipal",
      rockBlasting: "none",
      hasRuralDriveway: false,
      coveredPorch: 0,
      muskokaRoom: 0
    };
  }

  function syncBasementToStoreys(state, nextStoreys) {
    const next = { ...state, storeys: nextStoreys };
    if (next.basementType === "none") {
      next.basementSqft = 0;
      return next;
    }
    const suggested =
      nextStoreys === 2
        ? Math.max(800, Math.round(next.aboveGrade / 2 / 50) * 50)
        : next.aboveGrade;
    next.basementSqft = suggested;
    return next;
  }

  function buildRooms(state) {
    const customish = state.finishTier === "custom" || state.finishTier === "luxury";
    const mainKey = customish ? "mainFloorCustom" : "mainFloorStandard";
    const heated = customish;
    const rooms = {
      mainFloorStandard: 0,
      mainFloorCustom: 0,
      kitchen: 250,
      ensuitePrimary: 120,
      bathSecondary: 60,
      powder: 25,
      unfinishedBasement: 0,
      finishedBasementRec: 0,
      finishedBasementSuite: 0,
      garageUnheated: 0,
      garageHeated: 0,
      detachedGarage: 0,
      coveredPorch: state.coveredPorch || 0,
      muskokaRoom: state.muskokaRoom || 0,
      coachHouse: 0
    };

    rooms[mainKey] = state.aboveGrade;

    if (state.basementType === "unfinished") rooms.unfinishedBasement = state.basementSqft;
    if (state.basementType === "finished") rooms.finishedBasementRec = state.basementSqft;
    if (state.basementType === "suite") rooms.finishedBasementSuite = state.basementSqft;

    if (state.garageSqft > 0) {
      if (state.garageType === "detached") rooms.detachedGarage = state.garageSqft;
      else if (heated) rooms.garageHeated = state.garageSqft;
      else rooms.garageUnheated = state.garageSqft;
    }

    return rooms;
  }

  function estimate(state) {
    const rooms = buildRooms(state);
    const finishMult = DATA.finishMultipliers[state.finishTier] ?? 1;
    const locMult = DATA.locationMultipliers[state.locationKey] ?? 1;
    const storeyMult = DATA.storeyMultipliers[state.storeys] ?? 1;
    const kitchenMult = DATA.kitchenMultipliers[state.kitchenFinish] ?? 1;

    const zones = Object.keys(rooms)
      .filter((key) => rooms[key] > 0)
      .map((key) => {
        const sqft = rooms[key];
        const baseRate = DATA.basePerSqft[key] ?? 0;
        let mult = finishMult * locMult;
        if (key === "mainFloorStandard" || key === "mainFloorCustom") mult *= storeyMult;
        if (key === "kitchen") mult *= kitchenMult;
        const total = sqft * baseRate * mult;
        return {
          key,
          label: DATA.roomLabels[key] || key,
          sqft,
          baseRate,
          total
        };
      });

    const construction = zones.reduce((sum, z) => sum + z.total, 0);
    const totalSqft = zones.reduce((sum, z) => sum + z.sqft, 0);

    const site = DATA.siteCosts;
    const servicingCost =
      state.servicing === "municipal" ? site.municipalHookup : site.well + site.septic;
    const driveway = state.hasRuralDriveway ? site.drivewayRural : 0;
    const rock = site.rockBlasting[state.rockBlasting] ?? 0;
    const landscaping = construction * site.landscapingBaselinePct;
    const siteCosts = servicingCost + driveway + rock + landscaping;

    const muni = DATA.municipalities.find((m) => m.key === state.municipalityKey);
    const devCharges = muni ? muni.devCharge : 0;
    const permits = totalSqft * DATA.permitRatePerSqft;
    const saleProxy = construction + siteCosts + devCharges;
    const tarion = tarionFee(saleProxy);
    const softCosts = construction * DATA.softCostPct;
    const contingency = (construction + siteCosts) * DATA.contingencyPct;
    const pretaxTotal =
      construction + siteCosts + devCharges + permits + tarion + softCosts + contingency;
    const taxEstimate = pretaxTotal * DATA.taxes.rate;
    const band = DATA.rangeBandPct;

    const allowances = zones.filter((z) => DATA.allowanceKeys.includes(z.key));

    return {
      zones,
      allowances,
      construction,
      siteCosts,
      devCharges,
      permits,
      tarion,
      softCosts,
      contingency,
      pretaxTotal,
      taxEstimate,
      taxLabel: DATA.taxes.label,
      rangeLow: pretaxTotal * (1 - band),
      rangeMid: pretaxTotal,
      rangeHigh: pretaxTotal * (1 + band),
      summaryBits: summaryBits(state, rooms)
    };
  }

  function summaryBits(state, rooms) {
    const bits = [
      fmtSqft(state.aboveGrade),
      state.storeys === 1 ? "1 storey" : "2 storeys",
      `${DATA.finishLabels[state.finishTier]}-range finish`
    ];
    if (state.kitchenFinish === "premium") bits.push("Premium kitchen");
    if (state.kitchenFinish === "standard") bits.push("Standard kitchen");
    if (rooms.finishedBasementSuite > 0) bits.push("Legal basement suite");
    else if (rooms.finishedBasementRec > 0) bits.push("Finished basement");
    else if (rooms.unfinishedBasement > 0) bits.push("Unfinished basement");
    else bits.push("No basement");
    if (rooms.detachedGarage > 0) bits.push("Detached garage");
    else if (rooms.garageHeated + rooms.garageUnheated > 0) bits.push("Attached garage");
    return bits;
  }

  function heroFor(state) {
    if (state.kitchenFinish === "premium" || state.finishTier === "luxury") {
      return DATA.heroImages.kitchenLux;
    }
    if (state.basementType === "finished" || state.basementType === "suite") {
      return DATA.heroImages.basement;
    }
    if (state.finishTier === "custom") return DATA.heroImages.ensuite;
    if (state.kitchenFinish !== "matching") return DATA.heroImages.kitchen;
    return DATA.heroImages.main;
  }

  const root = document.getElementById("revel-calculator");
  if (!root) return;

  let state = defaultState();

  function setState(patch) {
    state = { ...state, ...patch };
    render();
  }

  function segment(name, options, current, onPick) {
    return `
      <div class="calc-segment" role="group" aria-label="${name}">
        ${options
          .map(
            (opt) => `
          <button type="button" class="calc-chip${current === opt.value ? " is-active" : ""}" data-action="seg" data-key="${opt.value}" data-group="${name}">
            ${opt.label}
          </button>`
          )
          .join("")}
      </div>`;
  }

  function slider(id, label, value, min, max, step, hint) {
    return `
      <div class="calc-field">
        <div class="calc-field-top">
          <label for="${id}">${label}</label>
          <span class="calc-value" data-for="${id}">${fmtSqft(value)}</span>
        </div>
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
        ${hint ? `<p class="calc-hint">${hint}</p>` : ""}
      </div>`;
  }

  function breakdownRows(est) {
    const rows = [
      ["Construction (rooms × $/ft²)", est.construction],
      ["Site costs (servicing, driveway, rock, landscaping)", est.siteCosts],
      ["Development charges", est.devCharges],
      ["Building permits", est.permits],
      ["Tarion enrolment", est.tarion],
      ["Soft costs (architect, engineering, legal)", est.softCosts],
      ["Contingency", est.contingency]
    ];
    return rows
      .map(
        ([label, amount]) => `
      <div class="calc-row">
        <span>${label}</span>
        <strong>${money(amount)}</strong>
      </div>`
      )
      .join("");
  }

  function allowanceBar(est) {
    const items = est.allowances.filter((z) => z.total > 0);
    if (!items.length) return "";
    const sum = items.reduce((s, z) => s + z.total, 0);
    return `
      <div class="calc-allowance">
        <p class="calc-allowance-label">Finish allowances <span>(part of construction — not the full project)</span></p>
        <div class="calc-bar" role="img" aria-label="Finish allowance breakdown">
          ${items
            .map((z) => {
              const pct = Math.max(8, (z.total / sum) * 100);
              const short = z.label.split("—")[0].split("(")[0].trim().split(" ").slice(0, 2).join(" ");
              return `<div class="calc-bar-seg" style="flex:${pct}" title="${z.label}: ${money(z.total)}"><span>${short}<br>${money(z.total)}</span></div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  function livePanel(est) {
    const img = DATA.assetsBase + heroFor(state);
    return `
      <aside class="calc-live" aria-live="polite">
        <div class="calc-live-range">
          <p class="calc-kicker">Live estimate (mid-range)</p>
          <p class="calc-range">${money(est.rangeLow)} – ${money(est.rangeHigh)}</p>
          <p class="calc-mid">Mid-range: ${money(est.rangeMid)} <span>before ${est.taxLabel}</span></p>
          <p class="calc-includes">Includes construction, site work, development charges, permits, Tarion, soft costs, and contingency. Excludes land, appliances, and furniture.</p>
        </div>
        <div class="calc-hero-card" style="background-image:url('${img}')">
          <div class="calc-hero-card-inner">
            <p class="calc-hero-kicker">Your estimate — ${DATA.finishLabels[state.finishTier]}-range</p>
            <p class="calc-hero-total">${money(est.rangeMid)}</p>
            <p class="calc-hero-bits">${est.summaryBits.join(" · ")}</p>
          </div>
        </div>
        ${allowanceBar(est)}
        <div class="calc-full-breakdown">
          <p class="calc-kicker">Full project breakdown</p>
          ${breakdownRows(est)}
          <div class="calc-row calc-row-total">
            <span>Subtotal (before ${est.taxLabel})</span>
            <strong>${money(est.pretaxTotal)}</strong>
          </div>
          <div class="calc-row calc-row-muted">
            <span>${est.taxLabel} (rebate may apply)</span>
            <strong>${money(est.taxEstimate)}</strong>
          </div>
          <div class="calc-row calc-row-total">
            <span>With taxes</span>
            <strong>${money(est.pretaxTotal + est.taxEstimate)}</strong>
          </div>
        </div>
      </aside>`;
  }

  function stepBasics(est) {
    return `
      <div class="calc-step">
        <h2>The basics</h2>
        <p class="calc-step-hint">Size, storeys, finishes, garage, basement, and municipality.</p>

        ${slider("aboveGrade", "Living space (above grade)", state.aboveGrade, 800, 6000, 50, "Total finished living space above grade.")}

        <div class="calc-field">
          <label>Storeys</label>
          ${segment(
            "storeys",
            [
              { value: "1", label: "1 storey" },
              { value: "2", label: "2 storeys" }
            ],
            String(state.storeys)
          )}
          <p class="calc-hint">A two-storey home usually has a smaller basement footprint for the same living area.</p>
        </div>

        <div class="calc-field">
          <label>Finish tier</label>
          ${segment(
            "finishTier",
            Object.keys(DATA.finishLabels).map((k) => ({
              value: k,
              label: DATA.finishLabels[k]
            })),
            state.finishTier
          )}
          <p class="calc-tier-blurb">${DATA.finishBlurb[state.finishTier]}</p>
        </div>

        <div class="calc-field">
          <label>Kitchen finish</label>
          ${segment(
            "kitchenFinish",
            Object.keys(DATA.kitchenLabels).map((k) => ({
              value: k,
              label: DATA.kitchenLabels[k]
            })),
            state.kitchenFinish
          )}
          <p class="calc-hint">${DATA.kitchenBlurb[state.kitchenFinish]}</p>
        </div>

        ${slider("garageSqft", "Garage", state.garageSqft, 0, 1200, 25, "Approx. 240 ft² per bay. Heating defaults to your finish tier.")}

        <div class="calc-field">
          <label>Garage type</label>
          ${segment(
            "garageType",
            [
              { value: "attached", label: "Attached" },
              { value: "detached", label: "Detached" }
            ],
            state.garageType
          )}
        </div>

        <div class="calc-field">
          <label>Basement type</label>
          ${segment(
            "basementType",
            [
              { value: "none", label: "None" },
              { value: "unfinished", label: "Unfinished" },
              { value: "finished", label: "Finished" },
              { value: "suite", label: "Legal suite" }
            ],
            state.basementType
          )}
        </div>

        ${
          state.basementType === "none"
            ? ""
            : slider(
                "basementSqft",
                "Basement",
                state.basementSqft,
                400,
                4000,
                50,
                state.storeys === 2
                  ? "Defaulted to about half of the living space for a two-storey footprint."
                  : "Usually close to the main-floor footprint on a bungalow."
              )
        }

        <div class="calc-field">
          <label for="municipalityKey">Municipality</label>
          <select id="municipalityKey">
            ${DATA.municipalities
              .map(
                (m) =>
                  `<option value="${m.key}"${m.key === state.municipalityKey ? " selected" : ""}>${m.label}</option>`
              )
              .join("")}
          </select>
          <p class="calc-hint">Sets development charges for your build.</p>
        </div>

        <div class="calc-nav">
          <button type="button" class="calc-btn calc-btn-primary" data-action="next">Refine →</button>
        </div>
      </div>`;
  }

  function stepRefine() {
    return `
      <div class="calc-step">
        <h2>Refine your estimate</h2>
        <p class="calc-step-hint">Optional. Skip any of these to keep the defaults.</p>

        <div class="calc-field">
          <label for="locationKey">Lot type</label>
          <select id="locationKey">
            ${DATA.locationOptions
              .map(
                (o) =>
                  `<option value="${o.key}"${o.key === state.locationKey ? " selected" : ""}>${o.label}</option>`
              )
              .join("")}
          </select>
          <p class="calc-hint">Premium locations add a construction multiplier. Separate from municipality development charges.</p>
        </div>

        <div class="calc-field">
          <label>Site servicing</label>
          ${segment(
            "servicing",
            [
              { value: "municipal", label: "Municipal water/sewer" },
              { value: "well-septic", label: "Well + septic" }
            ],
            state.servicing
          )}
        </div>

        <div class="calc-field">
          <label>Site conditions (rock / excavation)</label>
          ${segment(
            "rockBlasting",
            [
              { value: "none", label: "Standard" },
              { value: "moderate", label: "Some rock" },
              { value: "heavy", label: "Heavy rock" }
            ],
            state.rockBlasting
          )}
          <p class="calc-hint">Niagara Escarpment / shield lots often hit rock.</p>
        </div>

        <div class="calc-field">
          <label>Long rural driveway?</label>
          ${segment(
            "hasRuralDriveway",
            [
              { value: "false", label: "No" },
              { value: "true", label: "Yes" }
            ],
            String(state.hasRuralDriveway)
          )}
        </div>

        ${slider("coveredPorch", "Covered porch (ft²)", state.coveredPorch, 0, 800, 25)}
        ${slider("muskokaRoom", "Muskoka / 3-season room (ft²)", state.muskokaRoom, 0, 600, 25)}

        <div class="calc-nav">
          <button type="button" class="calc-btn calc-btn-ghost" data-action="back">← Back</button>
          <button type="button" class="calc-btn calc-btn-primary" data-action="next">See full estimate →</button>
        </div>
      </div>`;
  }

  function selectionDetails() {
    const muni = DATA.municipalities.find((m) => m.key === state.municipalityKey);
    const lot = DATA.locationOptions.find((o) => o.key === state.locationKey);
    const servicingLabel =
      state.servicing === "municipal" ? "Municipal water/sewer" : "Well + septic";
    const rockLabel =
      state.rockBlasting === "moderate"
        ? "Some rock"
        : state.rockBlasting === "heavy"
          ? "Heavy rock"
          : "Standard";
    const lines = [
      ["Municipality", muni ? muni.label : state.municipalityKey],
      ["Lot type", lot ? lot.label : state.locationKey],
      ["Site servicing", servicingLabel],
      ["Site conditions (rock)", rockLabel],
      ["Long rural driveway", state.hasRuralDriveway ? "Yes" : "No"]
    ];
    if (state.coveredPorch > 0) lines.push(["Covered porch", fmtSqft(state.coveredPorch)]);
    if (state.muskokaRoom > 0) {
      lines.push(["Muskoka / 3-season room", fmtSqft(state.muskokaRoom)]);
    }
    return lines;
  }

  function estimateSummaryText(est) {
    const selection = selectionDetails()
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
    const allowances = est.allowances
      .filter((z) => z.total > 0)
      .map((z) => `${z.label}: ${money(z.total)} (${fmtSqft(z.sqft)})`)
      .join("\n");
    return [
      `Mid-range: ${money(est.rangeMid)} before ${est.taxLabel}`,
      `Range: ${money(est.rangeLow)} – ${money(est.rangeHigh)}`,
      est.summaryBits.join(" · "),
      "",
      "Selections:",
      selection,
      "",
      "Finish allowances (part of construction):",
      allowances || "None"
    ].join("\n");
  }

  function stepResult() {
    return `
      <div class="calc-step">
        <h2>Your detailed estimate</h2>
        <p class="calc-step-hint">Email your estimate to Revel Homes, or download a PDF for yourself. The contact form below is for general inquiries.</p>

        <div class="calc-email-panel">
          <p class="calc-email-title">Email this estimate to Revel Homes</p>
          <p class="calc-hint">Revel gets your name, email, estimate details, and the PDF. During testing, messages go to forms@collingwoodwebdesign.com.</p>
          <div class="calc-email-grid">
            <label>
              <span>Name</span>
              <input type="text" id="calc-lead-name" name="calc-lead-name" autocomplete="name" required placeholder="Your name">
            </label>
            <label>
              <span>Email</span>
              <input type="email" id="calc-lead-email" name="calc-lead-email" autocomplete="email" required placeholder="you@email.com">
            </label>
          </div>
          <button type="button" class="calc-btn calc-btn-primary" data-action="email-revel">Email estimate to Revel Homes</button>
          <p class="calc-email-status" data-calc-email-status role="status" aria-live="polite"></p>
        </div>

        <div class="calc-result-actions">
          <button type="button" class="calc-btn calc-btn-secondary" data-action="pdf">Download your PDF</button>
          <a class="calc-btn calc-btn-ghost" href="${DATA.scheduleUrl}">Call 705 985 4776</a>
        </div>

        <p class="calc-disclaimer">${DATA.disclaimer}</p>

        <div class="calc-nav">
          <button type="button" class="calc-btn calc-btn-ghost" data-action="back">← Back</button>
        </div>
      </div>`;
  }

  function render() {
    const est = estimate(state);
    const step = state.step;
    root.innerHTML = `
      <div class="calc-widget">
        <div class="calc-progress" aria-label="Progress">
          <span class="${step >= 1 ? "is-on" : ""}"></span>
          <span class="${step >= 2 ? "is-on" : ""}"></span>
          <span class="${step >= 3 ? "is-on" : ""}"></span>
        </div>
        <div class="calc-layout">
          <div class="calc-main">
            ${step === 1 ? stepBasics(est) : ""}
            ${step === 2 ? stepRefine() : ""}
            ${step === 3 ? stepResult() : ""}
          </div>
          ${livePanel(est)}
        </div>
        <div class="calc-mobile-sticky">
          <div>
            <p class="calc-kicker">Live estimate</p>
            <p class="calc-range-sm">${money(est.rangeLow)} – ${money(est.rangeHigh)}</p>
          </div>
          <p class="calc-mid-sm">Mid ${money(est.rangeMid)} before ${est.taxLabel}</p>
        </div>
      </div>`;
    bind(est);
  }

  function bind(est) {
    root.querySelectorAll("[data-action='seg']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.getAttribute("data-group");
        const value = btn.getAttribute("data-key");
        if (group === "storeys") {
          setState(syncBasementToStoreys(state, Number(value)));
          return;
        }
        if (group === "basementType") {
          const next = { basementType: value };
          if (value === "none") next.basementSqft = 0;
          else if (!state.basementSqft) {
            next.basementSqft =
              state.storeys === 2
                ? Math.max(800, Math.round(state.aboveGrade / 2 / 50) * 50)
                : state.aboveGrade;
          }
          setState(next);
          return;
        }
        if (group === "hasRuralDriveway") {
          setState({ hasRuralDriveway: value === "true" });
          return;
        }
        setState({ [group]: value });
      });
    });

    ["aboveGrade", "garageSqft", "basementSqft", "coveredPorch", "muskokaRoom"].forEach((id) => {
      const el = root.querySelector("#" + id);
      if (!el) return;
      el.addEventListener("input", () => {
        const val = Number(el.value);
        const label = root.querySelector(`[data-for="${id}"]`);
        if (label) label.textContent = fmtSqft(val);
        state = { ...state, [id]: val };
        if (id === "aboveGrade" && state.basementType !== "none" && state.step === 1) {
          // keep basement in sync only when user hasn't branched away heavily
        }
        softRefresh();
      });
      el.addEventListener("change", () => setState({ [id]: Number(el.value) }));
    });

    const muni = root.querySelector("#municipalityKey");
    if (muni) muni.addEventListener("change", () => setState({ municipalityKey: muni.value }));
    const loc = root.querySelector("#locationKey");
    if (loc) loc.addEventListener("change", () => setState({ locationKey: loc.value }));

    root.querySelectorAll("[data-action='next']").forEach((btn) => {
      btn.addEventListener("click", () => setState({ step: Math.min(3, state.step + 1) }));
    });
    root.querySelectorAll("[data-action='back']").forEach((btn) => {
      btn.addEventListener("click", () => setState({ step: Math.max(1, state.step - 1) }));
    });
    root.querySelectorAll("[data-action='pdf']").forEach((btn) => {
      btn.addEventListener("click", () => downloadPdf(est));
    });
    root.querySelectorAll("[data-action='email-revel']").forEach((btn) => {
      btn.addEventListener("click", () => emailEstimateToRevel(est, btn));
    });
  }

  function softRefresh() {
    const est = estimate(state);
    const live = root.querySelector(".calc-live");
    const sticky = root.querySelector(".calc-mobile-sticky");
    if (live) {
      const tmp = document.createElement("div");
      tmp.innerHTML = livePanel(est);
      live.replaceWith(tmp.firstElementChild);
    }
    if (sticky) {
      sticky.innerHTML = `
        <div>
          <p class="calc-kicker">Live estimate</p>
          <p class="calc-range-sm">${money(est.rangeLow)} – ${money(est.rangeHigh)}</p>
        </div>
        <p class="calc-mid-sm">Mid ${money(est.rangeMid)} before ${est.taxLabel}</p>`;
    }
  }

  function buildPdfDoc(est) {
    if (!window.jspdf || !window.jspdf.jsPDF) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 48;
    const right = pageW - 48;
    const width = right - left;
    const navy = [31, 58, 95];
    const ink = [43, 47, 54];
    const muted = [107, 114, 128];
    const gold = [146, 110, 56];
    let y = 52;

    function ensureSpace(needed) {
      if (y + needed <= pageH - 40) return;
      doc.addPage();
      y = 48;
    }

    function writeWrapped(text, x, startY, maxW, lineH) {
      const lines = doc.splitTextToSize(String(text || ""), maxW);
      doc.text(lines, x, startY);
      return startY + lines.length * lineH;
    }

    function sectionTitle(title) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...navy);
      doc.text(title, left, y);
      y += 15;
    }

    function kvRow(label, value, emphasize) {
      ensureSpace(18);
      doc.setFont("helvetica", emphasize ? "bold" : "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...(emphasize ? navy : ink));
      const labelLines = doc.splitTextToSize(String(label), width - 130);
      doc.text(labelLines, left, y);
      doc.text(String(value), right, y, { align: "right" });
      y += Math.max(14, labelLines.length * 12);
    }

    // Header bar
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 58, "F");
    doc.setFillColor(...gold);
    doc.rect(0, 58, pageW, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Revel Homes", left, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Preliminary build-cost estimate", left, 44);
    y = 82;

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Estimated cost range", left, y);
    y += 17;
    doc.setFontSize(16);
    doc.setTextColor(...navy);
    doc.text(`${money(est.rangeLow)}  –  ${money(est.rangeHigh)}`, left, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...ink);
    doc.text(`Mid-range (before ${est.taxLabel}): ${money(est.rangeMid)}`, left, y);
    y += 14;

    doc.setTextColor(...muted);
    doc.setFontSize(9);
    y = writeWrapped(est.summaryBits.join("  ·  "), left, y, width, 12);
    y += 10;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.7);
    doc.line(left, y, right, y);
    y += 16;

    sectionTitle("Your selections");
    selectionDetails().forEach(([label, value]) => kvRow(label, value, false));
    y += 8;

    const allowanceItems = est.allowances.filter((z) => z.total > 0);
    if (allowanceItems.length) {
      sectionTitle("Finish allowances (part of construction — not the full project)");
      allowanceItems.forEach((z) => {
        kvRow(`${z.label} · ${fmtSqft(z.sqft)}`, money(z.total), false);
      });
      y += 8;
    }

    sectionTitle("Full project breakdown");
    const rows = [
      ["Construction (rooms × $/ft²)", est.construction, false],
      ["Site costs (servicing, driveway, rock, landscaping)", est.siteCosts, false],
      ["Development charges", est.devCharges, false],
      ["Building permits", est.permits, false],
      ["Tarion enrolment", est.tarion, false],
      ["Soft costs (architect, engineering, legal)", est.softCosts, false],
      ["Contingency", est.contingency, false],
      [`Subtotal (before ${est.taxLabel})`, est.pretaxTotal, true],
      [`${est.taxLabel} (rebate may apply)`, est.taxEstimate, false],
      ["With taxes", est.pretaxTotal + est.taxEstimate, true]
    ];

    rows.forEach(([label, amount, emphasize], index) => {
      if (emphasize) {
        y += 4;
        ensureSpace(20);
        doc.setDrawColor(229, 231, 235);
        doc.line(left, y - 8, right, y - 8);
      }
      kvRow(label, money(amount), emphasize);
      if (!emphasize && index < rows.length - 1) y += 1;
    });

    y += 12;
    ensureSpace(70);
    doc.setDrawColor(...gold);
    doc.setLineWidth(2);
    doc.line(left, y, left + 36, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    y = writeWrapped(DATA.disclaimer, left, y, width, 10);
    y += 12;
    ensureSpace(14);
    doc.setFontSize(8);
    doc.text("revelhomes.ca  ·  705 985 4776  ·  info@revelhomes.ca", left, y);

    return doc;
  }

  function downloadPdf(est) {
    const doc = buildPdfDoc(est);
    if (!doc) {
      setEmailStatus(
        "PDF library did not load. Refresh the page and try Download your PDF again.",
        true
      );
      return;
    }
    doc.save("revel-homes-build-estimate.pdf");
  }

  function setEmailStatus(message, isError) {
    const el = root.querySelector("[data-calc-email-status]");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
  }

  async function emailEstimateToRevel(est, button) {
    const nameInput = root.querySelector("#calc-lead-name");
    const emailInput = root.querySelector("#calc-lead-email");
    const name = (nameInput && nameInput.value.trim()) || "";
    const email = (emailInput && emailInput.value.trim()) || "";

    if (!name || !email) {
      setEmailStatus("Please enter your name and email.", true);
      if (!name && nameInput) nameInput.focus();
      else if (emailInput) emailInput.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus("Please enter a valid email address.", true);
      if (emailInput) emailInput.focus();
      return;
    }

    const doc = buildPdfDoc(est);
    if (!doc) {
      setEmailStatus(
        "PDF library did not load. Refresh the page and try again.",
        true
      );
      return;
    }

    const pdfFile = new File([doc.output("blob")], "revel-homes-build-estimate.pdf", {
      type: "application/pdf"
    });

    const payload = {
      page_url: window.location.href,
      fields: [
        { name: "Name", label: "Name", value: name },
        { name: "Email", label: "Email", value: email },
        { name: "Subject", label: "Subject", value: "Custom home build calculator estimate" },
        {
          name: "Message",
          label: "Message",
          value:
            "A visitor emailed a calculator estimate from the budget page. PDF attached."
        },
        {
          name: "Estimate Summary",
          label: "Estimate Summary",
          value: estimateSummaryText(est)
        },
        {
          name: "Construction",
          label: "Construction",
          value: money(est.construction)
        },
        {
          name: "Site costs",
          label: "Site costs",
          value: money(est.siteCosts)
        },
        {
          name: "Development charges",
          label: "Development charges",
          value: money(est.devCharges)
        },
        {
          name: "Soft costs",
          label: "Soft costs",
          value: money(est.softCosts)
        },
        {
          name: "Contingency",
          label: "Contingency",
          value: money(est.contingency)
        },
        {
          name: "Subtotal before tax",
          label: "Subtotal before tax",
          value: money(est.pretaxTotal)
        },
        {
          name: est.taxLabel || "HST",
          label: est.taxLabel || "HST",
          value: money(est.taxEstimate)
        },
        {
          name: "With taxes",
          label: "With taxes",
          value: money(est.pretaxTotal + est.taxEstimate)
        }
      ]
    };

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    formData.append("Build Estimate PDF", pdfFile, pdfFile.name);

    if (button) button.disabled = true;
    setEmailStatus("Sending estimate to Revel Homes…", false);

    try {
      const response = await fetch(
        "https://web-production-54a6d.up.railway.app/v1/contact",
        {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData
        }
      );

      if (response.status === 429) {
        setEmailStatus("Please wait a few seconds and try again.", true);
        return;
      }
      if (!response.ok) {
        setEmailStatus(
          "Could not send the estimate. Please try again, or use the contact form below.",
          true
        );
        return;
      }

      setEmailStatus(
        "Sent — Revel Homes has your estimate and PDF (forms@collingwoodwebdesign.com while testing).",
        false
      );
    } catch (err) {
      setEmailStatus(
        "Network error. Open the GitHub Pages preview (not a local file) and try again.",
        true
      );
    } finally {
      if (button) button.disabled = false;
    }
  }

  render();
})();
