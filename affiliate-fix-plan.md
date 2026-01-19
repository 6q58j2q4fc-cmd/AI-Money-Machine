# Affiliate Link Fix Plan

## Current State

1. **Article content DOES contain working CJ affiliate links** - The HTML content includes proper CJ tracking URLs (jdoqocy.com, dpbolvw.net, tkqlhce.com, kqzyfj.com, anrdoezrs.net)

2. **The sidebar "Quick Links" in article content** already has working CJ affiliate links embedded in the HTML

3. **The `affiliateLinks` array from the API is empty** because no links have been associated via the `article_affiliate_links` junction table

4. **The "Check Price" buttons in the product cards** have empty `href=""` because they rely on the `affiliateLinks` array which is empty

## Solution

The article content already has working affiliate links embedded in the HTML. The issue is:

1. The React component's "Check Price" buttons use `affiliateLinks[0]?.link?.url || '#'` which defaults to '#' since affiliateLinks is empty
2. The product cards in the article content have `href=""` which is invalid

### Fix Options:

**Option A: Hide the React-rendered product cards and rely on HTML content**
- The article HTML already contains product cards with working links
- Remove or hide the duplicate React-rendered product cards

**Option B: Parse product links from article content**
- Extract CJ links from the article HTML content
- Use those links for the React product cards

**Option C: Auto-associate affiliate links with articles**
- When articles are created, automatically add entries to article_affiliate_links table
- This requires updating the content pipeline

## Recommended: Option A (Quick Fix)

Remove the React-rendered "Products Mentioned" section since the article HTML already contains properly formatted product cards with working CJ affiliate links.
