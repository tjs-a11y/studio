// Shared source helpers. eCFR text was read through the eCFR versioner API (Title 49 up to date as of Oct 7, 2026);
// the human-readable eCFR pages are linked in the text for readers.
export const ECFR_DATE = '2026-10-07';
export const ecfrApi = (s) => `https://www.ecfr.gov/api/versioner/v1/full/${ECFR_DATE}/title-49.xml?part=${s.split('.')[0]}&section=${s}`;
export const ecfrUrl = (s) => `https://www.ecfr.gov/current/title-49/section-${s}`;
export const ecfr = (s, what) => ({ label: `49 CFR ${s}${what ? ` (${what})` : ''}, eCFR text up to date as of Oct 7, 2026`, url: ecfrApi(s) });
export const cfr = (s, text) => `<a href="${ecfrUrl(s)}" rel="noopener">${text || `49 CFR ${s}`}</a>`;
