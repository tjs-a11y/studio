// Deal desk core: reads a broker's deal email, prices it for three sides, and builds the investor-safe view.
// All dollar rules are editable defaults (estimates), not facts. The CEO's purchase price and spread never
// leave the admin view.

export const SETTINGS = {
  rehabPerSqft: { light: 15, medium: 35, heavy: 60 },   // estimate, $/sqft
  flipPctOfArv: 0.70,         // investor max for flips: ARV x 70% - rehab
  rentalRentMultiple: 100,    // 1% rule: all-in <= monthly rent x 100
  rentalPctOfArv: 0.75,       // and all-in <= 75% of ARV
  lotPctOfArv: 0.22,          // teardown: lot worth ~22% of the new-build ARV (rule of thumb)
  demolition: 15000,          // teardown demolition (estimate)
  investorCushionPctArv: 0.02,// leave the investor visible equity below their max
  fundingFeePct: 0.015,       // transactional funding fee on the purchase (lender rate sheets, 1-2.5%)
  fundingFeeMin: 1000,
  closingCostsPct: 0.015,     // CEO's costs across both closings (estimate)
  closingCostsFlat: 1500,
  goNet: 10000, thinNet: 5000,// verdict thresholds on CEO net
};

const money = (s) => (s == null ? null : Number(String(s).replace(/[$,\s]/g, '')) || null);
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, '')) || null);
const pick = (re, t, i = 1) => { const m = t.match(re); return m ? m[i] : null; };
const floor500 = (n) => Math.floor(n / 500) * 500;

// Metro-area city -> county (for matching investors by county). Unknown cities match everyone.
const CITY_COUNTY = {
  woodstock: 'Cherokee', canton: 'Cherokee', 'holly springs': 'Cherokee', 'ball ground': 'Cherokee', acworth: 'Cobb', kennesaw: 'Cobb', marietta: 'Cobb', smyrna: 'Cobb', austell: 'Cobb', 'powder springs': 'Cobb', mableton: 'Cobb',
  atlanta: 'Fulton', 'east point': 'Fulton', 'college park': 'Fulton', 'south fulton': 'Fulton', fairburn: 'Fulton', union: 'Fulton', 'union city': 'Fulton', palmetto: 'Fulton', roswell: 'Fulton', alpharetta: 'Fulton', 'sandy springs': 'Fulton', 'johns creek': 'Fulton', milton: 'Fulton', hapeville: 'Fulton',
  decatur: 'DeKalb', 'stone mountain': 'DeKalb', lithonia: 'DeKalb', tucker: 'DeKalb', 'chamblee': 'DeKalb', doraville: 'DeKalb', 'dunwoody': 'DeKalb', 'brookhaven': 'DeKalb', 'clarkston': 'DeKalb', ellenwood: 'DeKalb',
  lawrenceville: 'Gwinnett', snellville: 'Gwinnett', duluth: 'Gwinnett', norcross: 'Gwinnett', lilburn: 'Gwinnett', 'buford': 'Gwinnett', loganville: 'Gwinnett', dacula: 'Gwinnett', suwanee: 'Gwinnett', 'peachtree corners': 'Gwinnett',
  jonesboro: 'Clayton', riverdale: 'Clayton', morrow: 'Clayton', 'forest park': 'Clayton', rex: 'Clayton',
  mcdonough: 'Henry', stockbridge: 'Henry', hampton: 'Henry', 'locust grove': 'Henry',
  griffin: 'Spalding', newnan: 'Coweta', douglasville: 'Douglas', conyers: 'Rockdale', covington: 'Newton', 'fayetteville': 'Fayette', 'peachtree city': 'Fayette', cumming: 'Forsyth', dallas: 'Paulding', hiram: 'Paulding', cartersville: 'Bartow', monroe: 'Walton', winder: 'Barrow', gainesville: 'Hall', carrollton: 'Carroll', villa: 'Carroll', 'villa rica': 'Carroll',
};
export const COUNTIES = [...new Set(Object.values(CITY_COUNTY))].sort();
export const countyFor = (city) => CITY_COUNTY[String(city || '').toLowerCase().trim()] || null;

export function parseDeal(text) {
  const t = String(text || '').replace(/\r/g, '');
  const addr = t.match(/^\s*(\d+[^\n,]*?),\s*([A-Za-z .'-]+?),\s*GA\s*(\d{5})/im);
  const bb = t.match(/(\d+)\s*(?:beds?|bd|br)?\s*\/\s*(\d+(?:\.\d)?)\s*(?:baths?|ba)?/i);
  const comps = [...t.matchAll(/(\d+[^\n\[\]]*?,\s*[A-Za-z .'-]+,\s*GA\s*\d{5})\]?(?:\([^)]*\))?\s*[—–-]+\s*([\d,]+)\s*sq\s*ft;?\s*sold for \$([\d,]+)/gi)]
    .map((m) => ({ address: m[1].trim(), sqft: num(m[2]), price: money(m[3]) }));
  const lc = t.toLowerCase();
  const kind = /teardown|tear down|total loss|new construction|fire[- ]damaged|land play|lot play/.test(lc) ? 'teardown'
    : /rental|rent[- ]ready|1% rule|cash ?flow|tenant/.test(lc) ? 'rental' : 'flip';
  const rehab = /minimal work|light rehab|cosmetic|rent[- ]ready|move[- ]in/.test(lc) ? 'light'
    : /full gut|gut job|heavy rehab|major|foundation|fire/.test(lc) ? 'heavy' : 'medium';
  const closeOn = pick(/closing[^\n]*?on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i, t);
  const closeWithin = pick(/closing[^\n]*?within\s+([^\n.]+)/i, t);
  return {
    address: addr ? addr[1].trim() : null, city: addr ? addr[2].trim() : null, zip: addr ? addr[3] : null,
    county: addr ? countyFor(addr[2]) : null,
    price: money(pick(/price:\s*\$?([\d,]+)/i, t)),
    arv: money(pick(/arv:\s*\$?([\d,]+)/i, t)),
    rent: money(pick(/rent:\s*\$?([\d,]+)/i, t)),
    beds: bb ? num(bb[1]) : null, baths: bb ? Number(bb[2]) : null,
    sqft: num(pick(/([\d,]+)\s*sq\s*ft(?!\s*lot)/i, t)),
    lotSqft: num(pick(/([\d,]+)\s*sf\s*lot/i, t)),
    yearBuilt: num(pick(/(\d{4})\s*build/i, t)),
    ddDays: num(pick(/(\d+)\s*days?\s*dd/i, t)) ?? (/\b0\s*day/i.test(t) ? 0 : null),
    emd: money(pick(/\$([\d,]+)\s*earnest/i, t)),
    attorney: pick(/closing\s*@\s*([^\n]+?)(?:\s+(?:on|within)\s|$)/im, t),
    closeOn, closeWithin: closeWithin ? closeWithin.trim() : null,
    offersDue: pick(/offers are due by\s+([^\n.]+)/i, t),
    lockbox: /lockbox/i.test(t),
    kind, rehab, comps,
    notes: (t.match(/^(?:hey|hi|hello)[^\n]*\n+([\s\S]*?)\n\s*\n/i) || [])[1]?.trim().slice(0, 600) || null,
  };
}

export function underwrite(d, S = SETTINGS, overrides = {}) {
  const purchase = overrides.purchase ?? d.price;
  const sqft = d.sqft || 0;
  const rehabCost = d.kind === 'teardown' ? S.demolition : Math.round((S.rehabPerSqft[d.rehab] || S.rehabPerSqft.medium) * sqft);
  const caps = [];
  if (d.arv) {
    if (d.kind === 'teardown') caps.push({ rule: `lot ~${Math.round(S.lotPctOfArv * 100)}% of new-build ARV, less demolition`, max: d.arv * S.lotPctOfArv - S.demolition });
    else if (d.kind === 'rental') caps.push({ rule: `all-in under ${Math.round(S.rentalPctOfArv * 100)}% of ARV`, max: d.arv * S.rentalPctOfArv - rehabCost });
    else caps.push({ rule: `${Math.round(S.flipPctOfArv * 100)}% of ARV minus rehab`, max: d.arv * S.flipPctOfArv - rehabCost });
  }
  if (d.kind === 'rental' && d.rent) caps.push({ rule: '1% rule (all-in under rent x 100)', max: d.rent * S.rentalRentMultiple - rehabCost });
  const investorMax = caps.length ? Math.min(...caps.map((c) => c.max)) : null;
  const cushion = d.arv && investorMax != null ? Math.min(d.arv * S.investorCushionPctArv, Math.max(0, investorMax) * 0.05) : 0;
  const suggested = investorMax != null ? floor500(investorMax - cushion) : null;
  const investorPrice = overrides.investorPrice ?? suggested;
  const fundingFee = purchase ? Math.max(S.fundingFeeMin, Math.round(purchase * S.fundingFeePct)) : 0;
  const closingCosts = purchase ? Math.round(purchase * S.closingCostsPct + S.closingCostsFlat) : 0;
  const gross = investorPrice != null && purchase ? investorPrice - purchase : null;
  const net = gross != null ? gross - fundingFee - closingCosts : null;
  const verdict = net == null ? 'needs numbers' : net >= S.goNet ? 'GO' : net >= S.thinNet ? 'THIN' : 'PASS';
  // Highest purchase price that still clears the GO line at the suggested investor price.
  const bidForGo = suggested != null ? floor500((suggested - S.goNet - S.closingCostsFlat) / (1 + S.fundingFeePct + S.closingCostsPct)) : null;
  const allIn = investorPrice != null ? investorPrice + rehabCost : null;
  return {
    purchase, rehabCost, caps, investorMax: investorMax != null ? Math.round(investorMax) : null, suggested, investorPrice,
    fundingFee, closingCosts, gross, net, verdict, bidForGo,
    investorView: {
      // For teardowns the ARV is for a new build, so equity on the lot alone would mislead.
      allIn, equity: d.kind !== 'teardown' && d.arv && allIn != null ? d.arv - allIn : null,
      pctOfArv: d.kind !== 'teardown' && d.arv && allIn != null ? Math.round((allIn / d.arv) * 100) : null,
      rentRatio: d.rent && allIn ? Math.round((d.rent / allIn) * 1000) / 10 : null,
    },
  };
}

// What investors may see. Never the purchase price, spread, broker links or broker name.
export function publicDeal(deal) {
  const d = deal.parsed, u = deal.uw;
  return {
    id: deal.id, status: deal.status, address: d.address, city: d.city, zip: d.zip, county: d.county,
    kind: d.kind, rehab: d.rehab, beds: d.beds, baths: d.baths, sqft: d.sqft, lotSqft: d.lotSqft, yearBuilt: d.yearBuilt,
    arv: d.arv, rent: d.rent, price: u.investorPrice, rehabEstimate: u.rehabCost, investorView: u.investorView,
    comps: (d.comps || []).map((c) => ({ address: c.address, sqft: c.sqft, price: c.price })),
    terms: { emd: Math.max(5000, d.emd || 0), dueDiligenceDays: 0, attorney: d.attorney, closeOn: d.closeOn, closeWithin: d.closeWithin, lockbox: d.lockbox },
    photos: deal.photos || null, respondBy: deal.respondBy || null, note: deal.publicNote || null,
  };
}

export function matches(deal, investors) {
  const d = deal.parsed, price = deal.uw.investorPrice;
  return investors.filter((i) => (!d.county || !i.counties?.length || i.counties.includes(d.county))
    && (!i.types?.length || i.types.includes(d.kind))
    && (!i.maxPrice || !price || price <= i.maxPrice));
}
