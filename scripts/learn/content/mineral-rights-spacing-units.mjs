// Source-backed Texas guide: distinguish RRC spacing/proration acres from lease-authorized pooled-unit acres.
// RRC §3.40 and Form P-12, Texas Natural Resources Code Chapter 102, and the RRC drilling-permit data catalog checked November 1, 2026.
const CHECKED = {"iso":"2026-11-01","en":"November 1, 2026"};
const SOURCES = [
  {
    "label": "Railroad Commission of Texas, 16 TAC Chapter 3, §3.40, Assignment of Acreage to Pooled Development and Proration Units (compilation effective December 8, 2025)",
    "url": "https://www.rrc.texas.gov/media/f32dm04x/chapter3-all-text-effective-dec8-2025.pdf"
  },
  {
    "label": "Railroad Commission of Texas, Section B — Forms Required for Permitting and Drilling a Well; Form P-12, Certificate of Pooling Authority",
    "url": "https://www.rrc.texas.gov/media/sz5pimzl/section_b.pdf"
  },
  {
    "label": "Texas Legislative Council, Natural Resources Code Chapter 102, Mineral Interest Pooling Act",
    "url": "https://tcss.legis.texas.gov/resources/NR/htm/NR.102.htm"
  },
  {
    "label": "Railroad Commission of Texas, Data Sets Available for Download — Drilling Permits Master and Trailer",
    "url": "https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/"
  }
];
const ARTICLE = {
  "path": "/learn/mineral-rights-spacing-units.html",
  "lang": "en",
  "title": "Texas Pooled Unit Acres and Royalty Decimal Guide",
  "h1": "How pooled unit size changes an oil and gas royalty decimal",
  "description": "A larger Texas pooled unit can lower an acreage-based royalty decimal. Check your lease, RRC Form P-12, certified plat and field rules before using unit acres.",
  "crumbs": [
    {
      "name": "Quickwell",
      "path": "/"
    },
    {
      "name": "Learn",
      "path": "/learn/"
    }
  ],
  "crumbName": "Pooled unit size and royalty decimal",
  "lede": "A larger pooled unit can lower a royalty decimal when your included net mineral acres and lease royalty stay the same, because those acres are a smaller share of the unit; the lease and pooling instrument determine whether that acreage formula applies.",
  "body": "<h2>Start with the right acreage number</h2>\n<p>Three different acreage figures can appear in the same file, and they do different jobs:</p>\n<ul><li><b>Your net mineral acres.</b> This is the mineral acreage attributable to your interest after ownership fractions are applied. Use the acres actually included in the unit, not automatically every acre shown on a deed or tax record.</li><li><b>RRC spacing, density or proration acres.</b> Texas field rules govern matters such as well spacing, well density, drilling units and allowable calculations. Those regulatory acres are not automatically the acreage denominator in your lease royalty clause.</li><li><b>Pooled-unit acres.</b> For a voluntary pooled unit filed for Commission purposes, the RRC’s §3.40 requires a certified plat and Form P-12. The form identifies each tract, its acreage and the total pooled-unit acreage; it also identifies non-pooled or unleased interests.</li></ul>\n<p>Under §3.40, an operator may pool acreage only with appropriate contractual authority and in accordance with applicable field rules. The total acreage shown on Form P-12 is the sum of the listed tracts for which the operator has a leased or ownership interest in the minerals, or other contractual authority to include them. A permit plat or field spacing rule alone does not establish that every mineral interest in the surrounding area was pooled.</p>\n<h2>When the acreage formula applies</h2>\n<p>If the lease and pooling instrument allocate your royalty by each owner’s proportionate acreage, a useful screening formula is:</p>\n<p><code>Expected decimal = (net mineral acres included in the unit ÷ total pooled-unit acres) × lease royalty fraction</code></p>\n<p>For example, assume 20 net mineral acres are included in a 640-acre pooled unit and the lease royalty is 3/16 (0.1875). The illustrative decimal is 20 ÷ 640 × 0.1875 = <b>0.005859375</b>, or 0.00585938 when displayed to eight decimal places. If the same 20 acres were included in a 1,280-acre unit and the same acreage formula applied, the illustrative decimal would be 0.0029296875, or 0.00292969.</p>\n<p>The larger denominator lowers the result only because the example holds the included net acres and royalty fraction constant. If the tract is only partly included, use only the included net acres. If the lease, declaration, field allocation formula, depth allocation or pooling order uses another method, this simple calculation may not describe the amount payable.</p>\n<h2>Documents to compare before changing the unit-acre input</h2>\n<ul><li><b>Deed, title schedule and ownership statement.</b> Confirm the net mineral acres and the fractional interest attributed to you. Do not substitute gross tract acreage for your net mineral acres.</li><li><b>Oil and gas lease and amendments.</b> Read the pooling clause, royalty fraction, allocation language, depth or formation limits, retained acreage and any later amendments. The lease determines what authority the lessee has to pool your interest.</li><li><b>RRC Form P-12 and certified pooled-unit plat.</b> Match the unit name, well/API number, field, county, tract identifier, acres in each tract, total unit acres and any non-pooled or unleased notation. Look for later or amended filings.</li><li><b>Form W-1 permit and applicable field rules.</b> Check the well, field, depth, spacing and density exceptions. The RRC’s Drilling Permits Master and Trailer dataset includes permit dates, lease names, locations, spacing/density exceptions and coordinates, but a permit is not proof that a well was drilled or produced.</li><li><b>Recorded pooling declaration or agreement.</b> Compare the county-recorded instrument with the lease and the RRC filing. Confirm the effective date, included lands, formation, well and acreage-allocation method.</li><li><b>Division order and royalty statements.</b> Compare the decimal, effective date, well/formation and any allocation explanation with the source documents. Keep statements from before and after a unit change.</li></ul>\n<h2>Voluntary pooling and statutory pooling are not the same</h2>\n<p>For a voluntary Texas pooled unit, the lease or other contract must supply the pooling authority, and the RRC’s §3.40 filing rules require a certified plat and Form P-12 for the Commission’s drilling or proration-unit purposes. The RRC filing is a regulatory record; it does not replace the underlying lease, prove title, or decide every dispute about whether a particular owner’s interest was validly pooled.</p>\n<p>Texas Natural Resources Code Chapter 102, the Mineral Interest Pooling Act, addresses Commission-ordered pooling in specified circumstances. It does not apply to every reservoir or every property. Section 102.051 generally allocates production among tracts by the proportion of surface acres in each tract to surface acres in the unit, unless the Commission finds that a surface-acre allocation would not give each tract its fair share. If a Commission pooling order applies, read the order and its allocation terms rather than assuming the voluntary-pooling calculator formula controls.</p>\n<h2>What a larger unit does—and does not—prove</h2>\n<p>A larger unit can explain a smaller acreage-based decimal when the same net acres and royalty fraction are spread over more unit acres. It does not, by itself, prove that a payment is short, that an operator acted improperly, or that a lease has been maintained or terminated. The result can also change when a unit is amended, a tract is partly included, a different formation is pooled, or a field-specific allocation formula applies.</p>\n<h2>Common questions</h2>\n<h3>Does a 640-acre RRC spacing unit mean my royalty unit is 640 acres?</h3>\n<p>Not necessarily. Check the lease, pooling declaration, Form P-12 and certified plat for the unit and formation tied to your interest. RRC field rules and a lease’s pooling clause answer different questions.</p>\n<h3>Does a new drilling permit change my royalty decimal?</h3>\n<p>No, not by itself. A permit is an authorization record. Confirm the well was completed, identify the applicable unit and allocation documents, and compare the division order and statements.</p>\n<h3>What if Royalty Check shows a different decimal?</h3>\n<p>Recheck the net acres actually included, the total acreage in the applicable unit, the lease fraction, the effective date and any allocation or depth provisions. A difference is a reason to obtain the underlying documents and ask the operator for its calculation; it is not a finding of underpayment or a legal conclusion.</p>",
  "cta": {
    "title": "Compare a royalty decimal",
    "text": "Royalty Check calculates an expected decimal from net mineral acres, unit acres and the lease royalty fraction. Confirm the unit and allocation method in your documents before relying on the result. Runs entirely in your local browser — nothing you enter leaves your device.",
    "href": "/royalty-check/?ref=learn-spacing-units",
    "label": "Open Royalty Check"
  },
  "related": [
    {
      "href": "/royalty-check/",
      "title": "Royalty Check",
      "text": "Compare an expected royalty decimal with the decimal on a statement."
    },
    {
      "href": "/learn/texas-drilling-permits/",
      "title": "Texas RRC drilling permit records",
      "text": "Find RRC district information, permit records and the limits of a drilling-permit filing."
    }
  ],
  "sources": [
    {
      "label": "Railroad Commission of Texas, 16 TAC Chapter 3, §3.40, Assignment of Acreage to Pooled Development and Proration Units (compilation effective December 8, 2025)",
      "url": "https://www.rrc.texas.gov/media/f32dm04x/chapter3-all-text-effective-dec8-2025.pdf"
    },
    {
      "label": "Railroad Commission of Texas, Section B — Forms Required for Permitting and Drilling a Well; Form P-12, Certificate of Pooling Authority",
      "url": "https://www.rrc.texas.gov/media/sz5pimzl/section_b.pdf"
    },
    {
      "label": "Texas Legislative Council, Natural Resources Code Chapter 102, Mineral Interest Pooling Act",
      "url": "https://tcss.legis.texas.gov/resources/NR/htm/NR.102.htm"
    },
    {
      "label": "Railroad Commission of Texas, Data Sets Available for Download — Drilling Permits Master and Trailer",
      "url": "https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/"
    }
  ],
  "checked": {
    "iso": "2026-11-01",
    "en": "November 1, 2026"
  },
  "ogImage": "/og.png",
  "disclaimer": "General educational information only, not legal, accounting, tax, or financial advice. Confirm parameters with original deeds or contractual terms."
};
export const ARTICLES = [ARTICLE];
export const HUB = {
  "title": "Pooled unit acres and royalty decimals",
  "path": "/learn/mineral-rights-spacing-units.html",
  "text": "How to verify the unit acreage and use an acreage-based decimal formula without confusing RRC spacing rules with lease pooling terms."
};
