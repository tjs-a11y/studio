#!/usr/bin/env node
// Tries candidate feed addresses and reports which return parseable items, how many, and how fresh.
// Used to pick sources for desks.mjs (run by the workflow's "probe" mode, where the network is open).
import { fetchRss } from './lib/harvest.mjs';

const CANDIDATES = {
  scams: [
    'https://consumer.ftc.gov/blog/rss', 'https://consumer.ftc.gov/rss.xml', 'https://consumer.ftc.gov/feeds/consumer-alerts.xml',
    'https://www.ftc.gov/feeds/press-release-consumer-protection.xml', 'https://www.ic3.gov/PSA/RSS', 'https://www.cisa.gov/news.xml',
    'https://www.consumer.ftc.gov/blog/gd-rss.xml', 'https://www.aarp.org/content/aarp/en/home/money/scams-fraud.rss',
  ],
  'small-business': [
    'https://www.journalofaccountancy.com/rss/news.xml', 'https://www.journalofaccountancy.com/news.xml', 'https://www.accountingtoday.com/feed',
    'https://www.cpapracticeadvisor.com/feed/', 'https://www.sba.gov/rss.xml', 'https://www.irs.gov/rss/news-releases.xml',
    'https://www.smallbizdaily.com/feed/', 'https://www.cpajournal.com/feed/',
  ],
  'household-money': [
    'https://www.consumerfinance.gov/about-us/blog/feed/', 'https://www.consumerfinance.gov/about-us/newsroom/feed/',
    'https://www.consumerfinance.gov/feed/', 'https://www.ftc.gov/feeds/press-release.xml', 'https://www.ftc.gov/feeds/press-release-consumer-protection.xml',
    'https://www.nerdwallet.com/blog/feed/',
  ],
  eudr: [
    'https://ec.europa.eu/newsroom/env/feed', 'https://ec.europa.eu/newsroom/env/rss', 'https://www.fern.org/feed/', 'https://www.euractiv.com/sections/agriculture-food/feed/',
    'https://www.euractiv.com/sections/climate-environment/feed/', 'https://www.globalforestwatch.org/blog/feed/', 'https://news.mongabay.com/feed/',
    'https://www.business-humanrights.org/en/latest-news/rss/', 'https://www.supplychaindive.com/feeds/news/', 'https://www.foodnavigator.com/Info/FoodNavigator-RSS',
  ],
  caregivers: [
    'https://www.nih.gov/news-releases/feed.xml', 'https://www.nih.gov/news-events/news-releases/feed', 'https://www.nia.nih.gov/news/rss.xml', 'https://www.nia.nih.gov/rss.xml',
    'https://tools.cdc.gov/api/v2/resources/media/132608.rss', 'https://www.cms.gov/newsroom/rss-feeds', 'https://acl.gov/rss.xml', 'https://acl.gov/news-and-events/announcements/rss.xml',
    'https://www.ncoa.org/feed/', 'https://newsinhealth.nih.gov/rss',
  ],
  'texas-minerals': [
    'https://www.eia.gov/rss/todayinenergy.xml', 'https://www.eia.gov/rss/press_rss.xml', 'https://www.rrc.texas.gov/news/rss', 'https://www.dallasfed.org/rss/energy.xml',
  ],
};

const now = Date.now();
for (const [desk, urls] of Object.entries(CANDIDATES)) {
  for (const url of urls) {
    try {
      const items = await fetchRss({ name: 'probe', url });
      const ages = items.map((i) => (i.published ? (now - Date.parse(i.published)) / 864e5 : null)).filter((x) => x !== null);
      const fresh = ages.filter((a) => a <= 7).length;
      console.log(`[probe:${desk}] OK   ${url} | ${items.length} items, ${fresh} in last 7 days | newest: ${items[0]?.title?.slice(0, 80) ?? '-'}`);
    } catch (e) {
      console.log(`[probe:${desk}] FAIL ${url} | ${String(e?.message || e).slice(0, 100)}`);
    }
  }
}
process.exit(0);
