# CJ Advertisers Diversification - Key Findings

## Summary
Successfully added 37 diverse CJ affiliate links from 35 advertisers across 9 different categories.

## Categories Added

### Technology (9 links)
- NordVPN (40% commission)
- ExpressVPN (35% commission)
- Surfshark (40% commission)
- Norton (15% commission)
- Dashlane (25% commission)
- 1Password (25% commission)
- Abelssoft (30% commission)

### Finance (5 links)
- TurboTax ($15-30 commission)
- H&R Block ($20 commission)
- Credit Karma ($2-10 commission)
- Quicken (15% commission)
- Acorns ($5 commission)

### Health (5 links)
- Vitacost (8% commission)
- iHerb (5% commission)
- Medical Guardian ($100 commission)
- Bay Alarm Medical ($75 commission)
- Teladoc ($15 commission)

### Travel (4 links)
- Booking.com (4% commission)
- Viator (8% commission)
- Priceline (3% commission)
- TripAdvisor (50% commission)

### Education (4 links)
- Coursera (20% commission)
- Udemy (15% commission)
- Rosetta Stone (15% commission)
- Skillshare ($10 commission)

### Home (4 links)
- Wayfair (7% commission)
- Overstock (6% commission)
- SimpliSafe ($100 commission)
- Ring (4% commission)

### Shopping (3 links)
- eBay (1-4% commission)
- Target (1-8% commission)
- Rakuten ($25 commission)

### Food (3 links)
- HelloFresh ($10 commission)
- Blue Apron ($15 commission)
- Thrive Market ($5 commission)

## Link Format
All links use proper CJ tracking format:
- https://www.{domain}/click-{publisherId}-{advertiserId}-{linkId}
- Domains: anrdoezrs.net, jdoqocy.com, tkqlhce.com, dpbolvw.net, kqzyfj.com

## Content Pipeline Integration
- Updated contentPipeline.ts to automatically select diverse advertisers based on content keywords
- New function `getDiverseCJLinksForContent()` scores advertisers by keyword match and EPC
- Ensures one advertiser per category for maximum diversity
- Falls back to hardcoded advertisers when database is empty

## Verification
- All 37 links visible in Affiliate Links management page
- Links properly categorized (technology, finance, health, travel, education, home, shopping, food)
- Commission rates displayed correctly
- CJ tracking URLs properly formatted
