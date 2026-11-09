# Quickwell ClickBank offer publishing record

Activation date: 2026-11-09

## Publishing and disclosure rules

The account owner confirms that all eight listed offers have been verified in their ClickBank account and authorizes their activation. This is recorded as owner-provided confirmation; Quickwell does not claim to have independently audited every seller's current checkout, affiliate terms, ingredients, or HopLink attribution.

HopLinks remain server-side and are never exposed by the public catalog API. Every public offer includes the Quickwell affiliate commission disclosure. Public summaries are intentionally restrained: seller claims are not presented as independently verified facts. Supplement listings contain no diagnosis, prevention, treatment, dental, hearing, cognitive, or other efficacy promises. DIY energy and water listings do not guarantee output, savings, safety, or potability.

## Offer status

| Offer | Category | Status | Public-copy boundary |
|---|---|---|---|
| Shifting Vibrations Manifest | Personal development | ACTIVE | Digital audio/video/PDF format only; seller wealth claims not endorsed |
| Energy Revolution System | DIY energy guide | ACTIVE | Information product only; no output or savings guarantee |
| PhytoMem One | Supplement | ACTIVE | No medical or cognitive claims; direct buyers to current label and warnings |
| Water Freedom System | DIY water guide | ACTIVE | Guide only; no device, production, safety, or potability guarantee |
| Genius Switch Original | Personal development | ACTIVE | Audio-series format only; no cognitive/performance guarantee |
| ProDentim | Supplement | ACTIVE | No dental or medical claims; direct buyers to current label and warnings |
| Ted Plans DIY | DIY plans | ACTIVE | Plans/material requirements only; buyer checks safety and seller details |
| AudiSoothe | Supplement / wellness | ACTIVE | Confirm product identity; no hearing or medical claims; current label and warnings |

## Release verification

All eight records are enabled in the server-side registry. The public catalog is expected to return these eight approved entries and omit all HopLink query values. CI must pass before merge. After merge, verify production deployment and live catalog response before describing the offers as published.


Final validation note: the complete eight-offer registry, catalog test, and publishing record were committed together on the release branch before the final CI run.
