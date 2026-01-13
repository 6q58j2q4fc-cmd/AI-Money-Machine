# Awin API Reference

## Base URL
```
https://api.awin.com
```

## Authentication
- Bearer Token authentication
- Add `accessToken` parameter to requests
- Rate limit: 20 API calls per minute per user

## Publisher API Endpoints

### GET Programmes
Lists all programmes the publisher has access to.

**Endpoint:** `GET /publishers/{publisherId}/programmes`

**Parameters:**
- `relationship` - Filter by relationship status (joined, pending, suspended, rejected, not joined)
- `countryCode` - Filter by country code (e.g., US, GB, IE)
- `includeHidden` - Include hidden programmes (true/false)
- `accessToken` - Your API access token

**Example URLs:**
- `https://api.awin.com/publishers/45628/programmes` - All programmes
- `https://api.awin.com/publishers/45628/programmes?relationship=joined` - Joined programmes only
- `https://api.awin.com/publishers/45628/programmes?countryCode=US` - US programmes

**Response Fields:**
| Field | Description |
|-------|-------------|
| id | Programme ID |
| name | Programme name |
| displayUrl | Advertiser URL |
| clickThroughUrl | Affiliate tracking link |
| logoUrl | Programme logo URL |
| primaryRegion | Object with name and countryCode |
| currencyCode | ISO currency code |
| status | Active or hidden |
| validDomains | List of valid domains |

### GET Transactions
Get transaction/commission data.

**Endpoint:** `GET /publishers/{publisherId}/transactions`

**Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `status` - Transaction status
- `accessToken` - Your API access token

### Link Builder API
Create affiliate tracking links programmatically.

**Endpoint:** `GET /publishers/{publisherId}/linkbuilder`

**Parameters:**
- `advertiserId` - The advertiser/programme ID
- `destinationUrl` - The URL to create a tracking link for
- `accessToken` - Your API access token

## Example Response (Programmes)
```json
{
  "description": "Programme description",
  "id": 3,
  "name": "Advertiser Name",
  "displayUrl": "http://www.advertiser.com",
  "clickThroughUrl": "http://www.awin1.com/awclick.php?mid=3&id=267235",
  "logoUrl": "http://www.awin.com/logos/3/logo.gif",
  "primaryRegion": {
    "name": "United States",
    "countryCode": "US"
  },
  "currencyCode": "USD",
  "status": "Active",
  "validDomains": [
    { "domain": "www.advertiser.com" }
  ]
}
```
