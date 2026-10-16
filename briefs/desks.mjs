// The audience desks. Each one has its own readers, public data sources, and the Quickwell tools
// it may promote. A desk publishes only on days its sources return enough fresh news (minItems);
// otherwise it skips the day instead of writing filler.
//
// Feed URLs are publisher-documented or conventional addresses. They are checked live by the
// workflow's "sources" mode before a desk is trusted; a feed that fails is logged and skipped.
//
// Source types:
//   { type: 'rss', name, url, include? }          include: regex an item must match (for broad feeds)
//   { type: 'federalRegister', name, agency, term?, types?, days }

const NEWS_ONLY = 'Cover news only: skip opinion columns, sponsored posts, webinars and vendor pitches.';

// Every Quickwell tool a desk may promote. Copy states only what each tool does today.
export const TOOLS = {
  'vendor-check': {
    product: 'Quickwell Vendor Check', path: '/vendor-check/', label: 'See who needs a 1099',
    copy: 'Year-End Vendor Check reads your bank or QuickBooks export and flags who likely needs a 1099 under the $2,000 rule, plus every renewal and price increase. Nothing is uploaded.',
  },
  saver: {
    product: 'Quickwell Saver', path: '/saver/', label: 'Find the fees in your bank export',
    copy: 'Saver finds every subscription, price hike, double charge and bank fee in your own bank export, then helps you cancel or push back.',
  },
  pilot: {
    product: 'Quickwell Pilot', path: '/pilot/', label: 'Decode a letter or bill',
    copy: 'Paste or snap any letter, bill or notice. Pilot shows what it needs from you, by when, how much, and who to contact.',
  },
  shield: {
    product: 'Quickwell Shield', path: '/shield/', label: 'Check a suspicious message',
    copy: 'Paste any text, email, DM or link. Shield shows each scam warning sign in plain words, and the exact words that raised it.',
  },
  'spare-key': {
    product: 'Quickwell Spare Key', path: '/spare-key/', label: 'Make your lost-phone plan',
    copy: 'Spare Key shows what would lock you out if you lost your phone, helps you fix it in minutes, and leaves your family a plan.',
  },
  'plot-file-checker': {
    product: 'EUDR Plot File Checker', path: '/plot-file-checker/', label: 'Check a plot file',
    copy: 'Check and fix farm plot maps for the EU deforestation rule before you submit, in English, French or Spanish. Free.',
  },
  'permit-watch': {
    product: 'Permit Watch — Texas', path: '/permit-watch/', label: 'Watch your county',
    copy: 'See new drilling permits filed in your Texas county and get free alerts by RSS.',
  },
  footsure: {
    product: 'Quickwell Footsure', path: '/footsure/', label: 'Run the fall-risk check',
    copy: "Run the CDC's three fall-risk tests with your phone and a helper. Results stay on the phone.",
  },
};

// The weekend plug (Friday and Saturday, America/Chicago), on every desk.
export const RIDDLEBOUND = {
  id: 'riddlebound', product: 'Riddlebound', url: 'https://riddlebound.app/', label: 'Unwind over the weekend with interactive thrillers',
  copy: 'Off the clock this weekend? Riddlebound novels hide codes and clues inside the story. Crack them to unlock what happens next. The first books are coming soon; start now with the free SIGNAL 309 audio drama.',
};

export const DESKS = [
  {
    id: 'small-business',
    enabled: true,
    name: 'Small Business Money Brief',
    audience: 'U.S. small-business owners, freelancers and the bookkeepers who work for them',
    focus: 'IRS and tax-reporting changes (especially 1099s), small-business rules, fees, payments and costs. ' + NEWS_ONLY,
    sources: [
      { type: 'federalRegister', name: 'Federal Register: IRS', agency: 'internal-revenue-service', types: ['RULE', 'PRORULE', 'NOTICE'], days: 7 },
      { type: 'federalRegister', name: 'Federal Register: SBA', agency: 'small-business-administration', types: ['RULE', 'PRORULE'], days: 14 },
      { type: 'rss', name: 'CPA Practice Advisor', url: 'https://www.cpapracticeadvisor.com/feed/', include: /\b(IRS|1099|W-2|tax|payroll|small business|bookkeep|deduct|filing|deadline|sales tax|contractor)/i },
      { type: 'rss', name: 'The CPA Journal', url: 'https://www.cpajournal.com/feed/', include: /\b(IRS|1099|tax|small business|payroll|deduct)/i },
      { type: 'rss', name: 'CFPB Newsroom', url: 'https://www.consumerfinance.gov/about-us/newsroom/feed/', include: /small business|merchant|fee|payment|lend/i },
    ],
    minItems: 3,
    triggers: [
      { tool: 'vendor-check', match: /\b1099|information returns?|backup withholding|reporting threshold|contractor/i },
      { tool: 'saver', match: /\bfees?\b|price (?:hike|increase)|subscription|overdraft|swipe/i },
    ],
    defaultTool: 'vendor-check',
  },
  {
    id: 'eudr',
    enabled: true,
    name: 'EUDR Compliance Brief',
    audience: 'exporters, importers, cooperatives and compliance staff dealing with the EU Deforestation Regulation (EUDR)',
    focus: 'EUDR deadlines, guidance, geolocation and due-diligence requirements, enforcement, and deforestation-linked trade news for coffee, cocoa, palm oil, soy, cattle, rubber and wood. ' + NEWS_ONLY,
    sources: [
      { type: 'rss', name: 'Mongabay', url: 'https://news.mongabay.com/feed/', include: /\bEUDR\b|deforestation (?:law|rule|regulation)|due diligence|European Union.*(?:deforest|forest)/i },
      { type: 'rss', name: 'Supply Chain Dive', url: 'https://www.supplychaindive.com/feeds/news/', include: /\bEUDR\b|deforestation|cocoa|coffee|palm oil/i },
      { type: 'rss', name: 'FoodNavigator', url: 'https://www.foodnavigator.com/Info/FoodNavigator-RSS', include: /\bEUDR\b|deforestation|cocoa|coffee|palm oil|soy|traceab/i },
      { type: 'rss', name: 'European Commission: Environment newsroom', url: 'https://ec.europa.eu/newsroom/env/feed', include: /deforest|forest|EUDR/i },
      { type: 'federalRegister', name: 'Federal Register: USTR/Commerce', agency: 'international-trade-administration', term: 'deforestation', days: 30 },
    ],
    minItems: 2,
    triggers: [],
    defaultTool: 'plot-file-checker',
  },
  {
    id: 'texas-minerals',
    // Off until Permit Watch has live data: promoting it while it shows no permits would mislead.
    enabled: false,
    name: 'Texas Mineral Owners Brief',
    audience: 'Texas mineral and royalty owners',
    focus: 'Texas drilling activity, oil and gas prices that drive royalty checks, Railroad Commission actions, and royalty-owner issues. ' + NEWS_ONLY,
    sources: [
      { type: 'rss', name: 'EIA Today in Energy', url: 'https://www.eia.gov/rss/todayinenergy.xml', include: /oil|gas|Permian|Texas|drilling|rig|crude/i },
      { type: 'federalRegister', name: 'Federal Register: BLM', agency: 'land-management-bureau', term: 'Texas', days: 30 },
    ],
    minItems: 3,
    triggers: [],
    defaultTool: 'permit-watch',
  },
  {
    id: 'scams',
    enabled: true,
    name: 'Scam Watch Brief',
    audience: 'everyday U.S. consumers, and the adult children who help their parents stay safe online',
    focus: 'new scams and fraud warnings from regulators and law enforcement, phishing and impersonation trends, data breaches, and account-security advice. Say what the scam looks like and what to do. ' + NEWS_ONLY,
    sources: [
      { type: 'rss', name: 'FBI IC3 alerts', url: 'https://www.ic3.gov/PSA/RSS' },
      { type: 'rss', name: 'FTC Consumer Advice', url: 'https://www.consumer.ftc.gov/blog/gd-rss.xml' },
      { type: 'rss', name: 'FTC press releases', url: 'https://www.ftc.gov/feeds/press-release-consumer-protection.xml' },
      { type: 'rss', name: 'CISA news', url: 'https://www.cisa.gov/news.xml', include: /phish|scam|fraud|password|passkey|account|consumer|smishing/i },
      { type: 'rss', name: 'CFPB Newsroom', url: 'https://www.consumerfinance.gov/about-us/newsroom/feed/', include: /scam|fraud|impersonat/i },
    ],
    minItems: 3,
    triggers: [
      { tool: 'shield', match: /scam|phish|smish|fraud|impersonat|fake|text message|robocall/i },
      { tool: 'spare-key', match: /password|passkey|two-factor|2FA|account (?:takeover|recovery)|lost phone|SIM swap|data breach/i },
    ],
    defaultTool: 'shield',
  },
  {
    id: 'household-money',
    enabled: true,
    name: 'Household Money Brief',
    audience: 'U.S. households watching their bills, bank fees and paperwork',
    focus: 'bank and card fees, subscriptions and price increases, consumer-finance rules, debt collection, medical and utility bills, and official letters people receive. ' + NEWS_ONLY,
    sources: [
      { type: 'rss', name: 'CFPB Newsroom', url: 'https://www.consumerfinance.gov/about-us/newsroom/feed/' },
      { type: 'rss', name: 'FTC press releases', url: 'https://www.ftc.gov/feeds/press-release.xml', include: /consumer|subscription|cancel|fee|junk|price|billing|auto-renew|refund|negative option/i },
      { type: 'rss', name: 'NerdWallet', url: 'https://www.nerdwallet.com/blog/feed/', include: /\bfees?\b|overdraft|subscription|bill|credit card|savings|bank account|insurance premium|price/i },
      { type: 'federalRegister', name: 'Federal Register: CFPB', agency: 'consumer-financial-protection-bureau', types: ['RULE', 'PRORULE'], days: 14 },
    ],
    minItems: 3,
    triggers: [
      { tool: 'saver', match: /\bfees?\b|subscription|cancel|auto-renew|price (?:hike|increase)|overdraft|junk|negative option/i },
      { tool: 'pilot', match: /letter|notice|debt collect|medical bill|statement|IRS notice|paperwork|billing error/i },
    ],
    defaultTool: 'saver',
  },
  {
    id: 'caregivers',
    enabled: true,
    name: 'Healthy Aging Brief',
    audience: 'older adults and the family members who care for them',
    focus: 'falls and fall prevention, healthy aging, caregiving, Medicare and benefits changes, and official health guidance for older adults. Report what the source says; do not give medical advice, and point readers to their own doctor for decisions. ' + NEWS_ONLY,
    sources: [
      { type: 'rss', name: 'CDC Newsroom', url: 'https://tools.cdc.gov/api/v2/resources/media/132608.rss', include: /older|aging|fall|senior|dementia|caregiv|Medicare|flu|vaccine|65/i },
      { type: 'rss', name: 'NIH News Releases', url: 'https://www.nih.gov/news-releases/feed.xml', include: /older|aging|fall|dementia|Alzheimer|caregiv|elder/i },
      { type: 'rss', name: 'KFF Health News', url: 'https://kffhealthnews.org/feed/', include: /older|aging|elder|senior|fall|dementia|Alzheimer|caregiv|Medicare|nursing home|long-term care/i },
      { type: 'rss', name: 'Next Avenue', url: 'https://www.nextavenue.org/feed/', include: /fall|balance|caregiv|dementia|Medicare|health|aging/i },
      { type: 'federalRegister', name: 'Federal Register: ACL', agency: 'community-living-administration', days: 30 },
    ],
    minItems: 2,
    triggers: [
      { tool: 'footsure', match: /\bfall|balance|mobility|strength|hip fracture/i },
    ],
    defaultTool: 'footsure',
  },
];

export const deskById = (id) => DESKS.find((d) => d.id === id);
