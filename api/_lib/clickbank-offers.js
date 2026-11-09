// Manual ClickBank offer registry. HopLinks stay server-side and are never returned by the catalog API.
// Keep every offer disabled until its current vendor page, product details, claims, and affiliate terms are reviewed.
export const offers = [
  { id: 'shifting-vibrations-manifest', title: 'Shifting Vibrations Manifest', category: 'Personal development', destination: 'https://astralhq.com/shifting-vibrations-manifest/?hopId=08e90388-0deb-4b1e-9150-a9524112762e', enabled: false, reviewRequired: true },
  { id: 'energy-revolution-system', title: 'Energy Revolution System', category: 'DIY energy guide', destination: 'https://theenergyrevolution.net/index-ers-auto-lead-39-promise-epp-lead-6-v3-u7-u10.php?hopId=5be2bb9d-33fe-4e41-bc49-3cd75f62f7f7', enabled: false, reviewRequired: true },
  { id: 'phytomem-one', title: 'PhytoMem One', category: 'Supplement', destination: 'https://getphytomemone.com/welcome/?hopId=6fa63f25-cc80-41c9-a13c-d0b6deee8a94&vtid=tsl', alternateDestinations: [{ id: 'variant-b', destination: 'https://getphytomemone.com/welcome/?hopId=b322994e-b17a-48c7-8fc7-cafe719b7156&vtid=tsl' }], enabled: false, reviewRequired: true, healthClaimsReview: true },
  { id: 'water-freedom-system', title: 'Water Freedom System', category: 'DIY water guide', destination: 'https://waterfreedomsystem.com/index-auto-vturb-cinematic-pbs-lst-new-v3-v4.php?hopId=95d964be-639d-43d4-834a-95a7162d2dcf', alternateDestinations: [{ id: 'variant-b', destination: 'https://waterfreedomsystem.com/index-auto-vturb-cinematic-pbs-lst-new-v3-v4.php?hopId=763e86b4-f30d-44d4-834a-95a7162d2dcf' }], enabled: false, reviewRequired: true },
  { id: 'genius-switch-original', title: 'Genius Switch Original', category: 'Personal development', destination: 'https://geniusswitchoriginal.com/?hopId=f08414e6-cab3-4cad-865f-7c7eca123f5d', enabled: false, reviewRequired: true },
  { id: 'prodentim', title: 'ProDentim', category: 'Supplement', destination: 'https://prodentim101.com/text.php?hopId=6dbf3512-acb9-43c0-b2a5-fb0ce2815ad2&hop=north88', enabled: false, reviewRequired: true, healthClaimsReview: true },
  { id: 'ted-plans-diy', title: 'Ted Plans DIY', category: 'DIY plans', destination: 'https://tedplansdiy.com/?hopId=6cf820f1-1659-4efb-8c3e-34438e1fec56', enabled: false, reviewRequired: true },
  { id: 'audisoothe', title: 'AudiSoothe', category: 'Supplement / wellness', destination: 'https://audisoothe.com/c/order-now.php?hop=north88&hopId=311b766b-3252-4fd9-9056-86e12c3c1e75', enabled: false, reviewRequired: true, healthClaimsReview: true }
];

export const offerById = (id) => offers.find((offer) => offer.id === id) || null;
export const publicOffer = ({ id, title, category }) => ({ id, title, category, disclosure: 'Quickwell may earn a commission if you purchase through this link.' });
