import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeal, underwrite, publicDeal, matches } from '../api/_lib/deals-core.js';

const WOODSTOCK = `Hey Teon,

Fire-damaged teardown on a solid lot in Woodstock - the structure is a total loss, but the land supports new construction with an ARV north of $475k. Offers are due by Friday.

520 Bluff Ct, Woodstock, GA 30188
Price: $115,000
ARV: $475,000+

Beds / Baths: 3/2
1,248 Sqft
15,012 sf lot
1990 build

Pictures
Comps

Terms
GAR Forms Only
0 Days DD
$5,000 Earnest Money
Closing @ Weissman Law within 2 weeks of under contract

Best,
Keenan`;

const GRIFFIN = `Hey Teon,

I have a vacant off-market rental play in Griffin that needs minimal work to get rent-ready — the numbers meet the 1% rule, and it's accessible by lockbox right now. Let me know if you are interested.

1307 Spellman Ave, Griffin, GA 30223
Price: $75,000
ARV: $150,000
Estimated Rent: $1100

3 beds / 1 bath
960 sqft
6969 sf lot
1959 build

[Pictures](https://example.tmailroute.net/x/d?c=1)
[View rental comps](https://example.tmailroute.net/x/d?c=2)
Comps

* [1020 E McIntosh Rd, Griffin, GA 30223](https://example.tmailroute.net/x/d?c=3) — 841 SqFt; sold for $150,000; smaller than the subject.
* [219 Lexington Ave, Griffin, GA 30223](https://example.tmailroute.net/x/d?c=4) — 1,204 SqFt; sold for $195,000.
* [1324 Spellman Ave, Griffin, GA 30223](https://example.tmailroute.net/x/d?c=5) — 1,339 SqFt; sold for $188,000; on the same street.

Terms
GAR forms only
0 Day DD
$5,000 Earnest Money
Closing @ Katz Durell on 10/23/2026

Best,
Keenan`;

const DECATUR = `Hey Teon,

I have a Decatur property right next to North Druid Hills. There are multiple exit strategies for this property: keep the current floorplan, close off the car port for a primary suite and 200+ square feet or go big and finish the basement for an additional 600 square feet. Let me know if you are interested in this one.

975 Hunting Valley Pl, Decatur, GA 30033
Purchase Price: $320,000
ARV: $415k-525k

3 beds / 1 bath
SqFt: 1095 sq/ft (with 548 unfinished below)
.26 acre lot
Year Build: 1954
County: Dekalb

PHOTOS

Terms

Property is Vacant and delivered Vacant

Cash or Hard Money Only

As-Is Sale – Zero DD

GAR Forms Only (Non-GAR or DD offers will not be reviewed)

$5,000 Earnest Money Deposit required

Closing Attorney: Katz Durell – Closing 10/21/2026`;

const WOODS = `Hey Teon,

I have a small but cheap fix & flip or rental near Center Hill in Atlanta. Currently owner-occupied; expected to be delivered vacant by 10/10. Roof is about 8 years old per the owner, but budget for a new HVAC. Full basement included, with room to add square footage if you want to push the ARV higher.

Keeping the current footprint suggests an ARV in the low $200s; adding square footage pushes it toward the low-to-mid $300s. Rents for comparable homes in the area run up to $1,600-1800/mo.

667 Woods Drive NW, Atlanta, GA 30318
Price: $85,000
ARV: $225k-$335k

Beds / Baths: 3/1
818 Sqft (plus full basement)
.28 acre lot
1950 build
Photos
Video

Terms
Property Delivered Vacant
GAR Forms Only
As-Is Sale - Zero DD
$5,000 Earnest Money
Closing @ Katz Durell on or before 10/16/2026`;

const RIVERCHASE = `Hey Teon,

We need a buyer ASAP! If you are interested in this one, CALL ME! Don't email back and waste time. We lost the buyer at the last minute and are scrambling. We got a significant price reduction for the previous buyer and now those savings are passed on to you. If you can dp $520k, the property is yours.


6415 River Chase Cir, Sandy springs GA 30328
Purchase price: $520,000
ARV: $1.25M+

5 bed | 4.5 bath
5.032 sqft
1980 build
0.65 acre

zillow pictures
comps


Terms
Property is Vacant
Cash or Hard Money Only
As-Is Sale – Zero DD
GAR Forms Only (Non-GAR or DD offers will not be reviewed)
$10,000 Earnest Money Deposit required
Closing Attorney: Katz Durell – Closing on or before 11/2`;

test('parses the Decatur email (price label, ARV range, acres, county line)', () => {
  const d = parseDeal(DECATUR);
  assert.equal(d.address, '975 Hunting Valley Pl'); assert.equal(d.city, 'Decatur'); assert.equal(d.county, 'DeKalb');
  assert.equal(d.price, 320000); assert.equal(d.arv, 415000); assert.equal(d.arvHigh, 525000);
  assert.equal(d.beds, 3); assert.equal(d.baths, 1); assert.equal(d.sqft, 1095); assert.equal(d.lotSqft, 11326);
  assert.equal(d.yearBuilt, 1954); assert.equal(d.ddDays, 0); assert.equal(d.emd, 5000);
  assert.equal(d.attorney, 'Katz Durell'); assert.equal(d.closeOn, '10/21/2026'); assert.equal(d.kind, 'flip'); assert.equal(d.basement, true);
});

test('parses the Woods Drive email (flip or rental, rent range)', () => {
  const d = parseDeal(WOODS);
  assert.equal(d.address, '667 Woods Drive NW'); assert.equal(d.county, 'Fulton');
  assert.equal(d.price, 85000); assert.equal(d.arv, 225000); assert.equal(d.arvHigh, 335000);
  assert.equal(d.rent, 1600); assert.equal(d.rentHigh, 1800); assert.equal(d.sqft, 818); assert.equal(d.yearBuilt, 1950);
  assert.equal(d.attorney, 'Katz Durell'); assert.equal(d.closeOn, '10/16/2026'); assert.equal(d.kind, 'flip'); assert.equal(d.ddDays, 0);
});

test('parses the River Chase email (no comma before GA, $1.25M, 5.032 sqft, urgent)', () => {
  const d = parseDeal(RIVERCHASE);
  assert.equal(d.address, '6415 River Chase Cir'); assert.equal(d.city, 'Sandy Springs'); assert.equal(d.county, 'Fulton');
  assert.equal(d.price, 520000); assert.equal(d.arv, 1250000); assert.equal(d.beds, 5); assert.equal(d.baths, 4.5);
  assert.equal(d.sqft, 5032); assert.equal(d.lotSqft, 28314); assert.equal(d.yearBuilt, 1980); assert.equal(d.emd, 10000);
  assert.equal(d.closeOn, '11/2'); assert.equal(d.urgent, true); assert.equal(d.attorney, 'Katz Durell');
});

test('investor EMD matches a larger broker EMD', () => {
  const parsed = parseDeal(RIVERCHASE);
  assert.equal(publicDeal({ id: 'r', status: 'sent', parsed, uw: underwrite(parsed) }).terms.emd, 10000);
});

test('parses the Woodstock teardown email', () => {
  const d = parseDeal(WOODSTOCK);
  assert.equal(d.address, '520 Bluff Ct'); assert.equal(d.city, 'Woodstock'); assert.equal(d.county, 'Cherokee');
  assert.equal(d.price, 115000); assert.equal(d.arv, 475000); assert.equal(d.beds, 3); assert.equal(d.baths, 2);
  assert.equal(d.sqft, 1248); assert.equal(d.lotSqft, 15012); assert.equal(d.yearBuilt, 1990);
  assert.equal(d.ddDays, 0); assert.equal(d.emd, 5000); assert.equal(d.attorney, 'Weissman Law');
  assert.equal(d.closeWithin, '2 weeks of under contract'); assert.equal(d.offersDue, 'Friday'); assert.equal(d.kind, 'teardown');
});

test('parses the Griffin rental email with comps', () => {
  const d = parseDeal(GRIFFIN);
  assert.equal(d.address, '1307 Spellman Ave'); assert.equal(d.county, 'Spalding');
  assert.equal(d.price, 75000); assert.equal(d.arv, 150000); assert.equal(d.rent, 1100);
  assert.equal(d.beds, 3); assert.equal(d.baths, 1); assert.equal(d.sqft, 960); assert.equal(d.lotSqft, 6969);
  assert.equal(d.attorney, 'Katz Durell'); assert.equal(d.closeOn, '10/23/2026');
  assert.equal(d.kind, 'rental'); assert.equal(d.rehab, 'light'); assert.equal(d.lockbox, true);
  assert.equal(d.comps.length, 3); assert.deepEqual(d.comps[1], { address: '219 Lexington Ave, Griffin, GA 30223', sqft: 1204, price: 195000 });
});

test('Griffin pencils: investor price clears the 1% rule and leaves the CEO a spread', () => {
  const u = underwrite(parseDeal(GRIFFIN));
  assert.equal(u.rehabCost, 14400);
  assert.ok(u.investorPrice > 75000 && u.investorPrice + u.rehabCost <= 1100 * 100);
  assert.ok(u.net > 0); assert.ok(['GO', 'THIN'].includes(u.verdict));
});

test('Woodstock at asking is a pass, with a lower bid suggested', () => {
  const u = underwrite(parseDeal(WOODSTOCK));
  assert.equal(u.verdict, 'PASS'); assert.ok(u.bidForGo < 115000);
  const at = underwrite(parseDeal(WOODSTOCK), undefined, { purchase: u.bidForGo });
  assert.equal(at.verdict, 'GO');
});

test('the investor view never carries the purchase price, spread or broker links', () => {
  const parsed = parseDeal(GRIFFIN);
  const deal = { id: 'x', status: 'sent', parsed, uw: underwrite(parsed) };
  const s = JSON.stringify(publicDeal(deal));
  assert.ok(!s.includes('75000')); assert.ok(!s.includes('tmailroute')); assert.ok(!/keenan|gpc/i.test(s));
  for (const k of ['purchase', 'gross', 'net', 'fundingFee']) assert.ok(!(k in publicDeal(deal)));
});

test('matching by county, type and max price', () => {
  const parsed = parseDeal(GRIFFIN); const deal = { parsed, uw: underwrite(parsed) };
  const inv = [{ id: 1, counties: ['Spalding'], types: ['rental'] }, { id: 2, counties: ['Cobb'] }, { id: 3, types: ['teardown'] }, { id: 4, maxPrice: 50000 }, { id: 5 }];
  assert.deepEqual(matches(deal, inv).map((i) => i.id), [1, 5]);
});

// API with an in-memory store
import { GET, POST, setDealStoreForTests, submitKey } from '../api/deals.js';
function memStore() {
  const kv = new Map(), lists = new Map();
  return async (...cmds) => cmds.map(([c, ...a]) => {
    if (c === 'SET') { if (a[2] === 'NX' && kv.has(a[0])) return null; kv.set(a[0], a[1]); return 'OK'; }
    if (c === 'GET') return kv.get(a[0]) ?? null;
    if (c === 'MGET') return a.map((k) => kv.get(k) ?? null);
    if (c === 'LPUSH') { const l = lists.get(a[0]) || []; l.unshift(a[1]); lists.set(a[0], l); return l.length; }
    if (c === 'RPUSH') { const l = lists.get(a[0]) || []; l.push(a[1]); lists.set(a[0], l); return l.length; }
    if (c === 'LRANGE') return (lists.get(a[0]) || []).slice(a[1], a[2] + 1);
    throw new Error(c);
  });
}
const req = (method, qs, b, headers = {}) => new Request('https://x.test/api/deals?' + qs, { method, headers: { 'content-type': 'application/json', ...headers }, body: b ? JSON.stringify(b) : undefined });

test('end to end: broker submits, owner approves, investor sees only the marked-up price and says I am in', async () => {
  process.env.DEALS_ADMIN_KEY = 'test-admin-key-123456';
  setDealStoreForTests(memStore());
  const admin = { 'x-admin-key': 'test-admin-key-123456' };
  assert.equal((await POST(req('POST', 'a=submit&k=wrong', { text: GRIFFIN }))).status, 401);
  const s = await POST(req('POST', 'a=submit&k=' + submitKey(), { text: GRIFFIN }));
  assert.equal(s.status, 200);
  assert.equal((await GET(req('GET', 'a=admin'))).status, 401);
  const list = await (await GET(req('GET', 'a=admin', null, admin))).json();
  const id = list.deals[0].id;
  assert.equal(list.deals[0].uw.purchase, 75000);
  assert.equal((await GET(req('GET', 'a=deal&id=' + id))).status, 404, 'hidden until approved');
  await POST(req('POST', 'a=update', { id, status: 'sent', investorPrice: 94000 }, admin));
  const pub = await (await GET(req('GET', 'a=deal&id=' + id))).json();
  assert.equal(pub.price, 94000); assert.ok(!JSON.stringify(pub).includes('75000'));
  assert.equal((await POST(req('POST', 'a=interest&id=' + id, { name: 'A', email: 'a@b.co', phone: '1', emdOk: false }))).status, 400);
  const i = await (await POST(req('POST', 'a=interest&id=' + id, { name: 'A', email: 'a@b.co', phone: '404', emdOk: true }))).json();
  assert.equal(i.place, 1);
  const j = await POST(req('POST', 'a=join', { name: 'B', email: 'b@c.co', counties: ['Spalding'], types: ['rental'], consent: true }));
  assert.equal(j.status, 200);
  const after = await (await GET(req('GET', 'a=admin', null, admin))).json();
  assert.equal(after.investors.length, 1); assert.equal(after.deals[0].matched.length, 1); assert.equal(after.interest[id].length, 1);
  setDealStoreForTests(null);
});
