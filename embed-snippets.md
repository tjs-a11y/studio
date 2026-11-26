# Quickwell tool embeds

Copy one snippet into an HTML block on a site you control. Each embed uses a dedicated route under `quickwell.app/embed/`; only those routes permit external framing. The actual tool runs in a nested same-origin frame so the rest of Quickwell, including checkout and account pages, keeps its normal frame protections.

The iframe is responsive at `width:100%`. Each snippet starts at a conservative height and listens only for a `quickwell:embed:resize` message from its own Quickwell iframe. If your publishing platform strips scripts, keep the iframe and adjust its `height` value manually. The tool also exposes a **Copy Embed Code** control after a result is visible.

The `ref` value is a short anonymous channel label. You may replace it with a lowercase label containing letters, numbers and hyphens (up to 40 characters). Do not put names, email addresses, customer details or tool inputs in the URL.

Some browsers partition embedded storage by the site displaying the iframe. Local preferences or daily limits may therefore differ from opening Quickwell directly; open the full tool on Quickwell if you need the same browser context across sites.

## Bill Radar

### Bill Radar

```html
<div style="width:100%;max-width:100%">
  <iframe id="quickwell-embed-bill-radar" src="https://quickwell.app/embed/bill-radar/?ref=embed-bill-radar&amp;utm_source=embed&amp;utm_medium=referral&amp;utm_campaign=quickwell_embeds&amp;utm_content=bill-radar" title="Quickwell Bill Radar tool" width="100%" height="1080" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write" style="display:block;width:100%;height:1080px;max-width:100%;border:0"></iframe>
</div>
<script>
(function(){
  var frame = document.getElementById("quickwell-embed-bill-radar");
  if (!frame) return;
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://quickwell.app' || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== 'quickwell:embed:resize' || data.tool !== 'bill-radar') return;
    var height = Number(data.height);
    if (Number.isFinite(height)) frame.style.height = Math.max(520, Math.min(3000, Math.ceil(height))) + 'px';
  });
})();
</script>
<p><a href="https://quickwell.app/bill-radar/?ref=embed-bill-radar" rel="noopener noreferrer">Powered by Quickwell — Bill Radar</a></p>
```

## Fair Price

### Fair Price

```html
<div style="width:100%;max-width:100%">
  <iframe id="quickwell-embed-fair-price" src="https://quickwell.app/embed/fair-price/?ref=embed-fair-price&amp;utm_source=embed&amp;utm_medium=referral&amp;utm_campaign=quickwell_embeds&amp;utm_content=fair-price" title="Quickwell Fair Price tool" width="100%" height="1040" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write" style="display:block;width:100%;height:1040px;max-width:100%;border:0"></iframe>
</div>
<script>
(function(){
  var frame = document.getElementById("quickwell-embed-fair-price");
  if (!frame) return;
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://quickwell.app' || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== 'quickwell:embed:resize' || data.tool !== 'fair-price') return;
    var height = Number(data.height);
    if (Number.isFinite(height)) frame.style.height = Math.max(520, Math.min(3000, Math.ceil(height))) + 'px';
  });
})();
</script>
<p><a href="https://quickwell.app/fair-price/?ref=embed-fair-price" rel="noopener noreferrer">Powered by Quickwell — Fair Price</a></p>
```

## What’s for Dinner

### What’s for Dinner

```html
<div style="width:100%;max-width:100%">
  <iframe id="quickwell-embed-dinner" src="https://quickwell.app/embed/dinner/?ref=embed-dinner&amp;utm_source=embed&amp;utm_medium=referral&amp;utm_campaign=quickwell_embeds&amp;utm_content=dinner" title="Quickwell What’s for Dinner tool" width="100%" height="980" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write" style="display:block;width:100%;height:980px;max-width:100%;border:0"></iframe>
</div>
<script>
(function(){
  var frame = document.getElementById("quickwell-embed-dinner");
  if (!frame) return;
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://quickwell.app' || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== 'quickwell:embed:resize' || data.tool !== 'dinner') return;
    var height = Number(data.height);
    if (Number.isFinite(height)) frame.style.height = Math.max(520, Math.min(3000, Math.ceil(height))) + 'px';
  });
})();
</script>
<p><a href="https://quickwell.app/dinner/?ref=embed-dinner" rel="noopener noreferrer">Powered by Quickwell — What’s for Dinner</a></p>
```

## Rate Con Checker

### Rate Con Checker

```html
<div style="width:100%;max-width:100%">
  <iframe id="quickwell-embed-rate-con-checker" src="https://quickwell.app/embed/rate-con-checker/?ref=embed-rate-con-checker&amp;utm_source=embed&amp;utm_medium=referral&amp;utm_campaign=quickwell_embeds&amp;utm_content=rate-con-checker" title="Quickwell Rate Con Checker tool" width="100%" height="1240" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write" style="display:block;width:100%;height:1240px;max-width:100%;border:0"></iframe>
</div>
<script>
(function(){
  var frame = document.getElementById("quickwell-embed-rate-con-checker");
  if (!frame) return;
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://quickwell.app' || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== 'quickwell:embed:resize' || data.tool !== 'rate-con-checker') return;
    var height = Number(data.height);
    if (Number.isFinite(height)) frame.style.height = Math.max(520, Math.min(3000, Math.ceil(height))) + 'px';
  });
})();
</script>
<p><a href="https://quickwell.app/rate-con-checker/?ref=embed-rate-con-checker" rel="noopener noreferrer">Powered by Quickwell — Rate Con Checker</a></p>
```

## Attribution and privacy

- The embedded route records only fixed tool/action labels and the validated `ref` channel label.
- The tool pages keep their existing on-device calculations and page-specific privacy notices.
- No bill amounts, quote text, ingredient selections, rate confirmations, broker names or other entered values are added to embed analytics.
- The Quickwell link-back is included in every snippet; keep it in place so visitors can open the full tool.
