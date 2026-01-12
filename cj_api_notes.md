# CJ Link Search API

## Endpoint
GET https://link-search.api.cj.com/v2/link-search

## Authentication
Authorization: Bearer <your-personal-access-token>

## Key Parameters
- website-id: Your PID (Publisher ID)
- advertiser-ids: "joined" for advertisers you're approved for
- link-type: banner, text link, etc.
- keywords: search terms
- records-per-page: number of results

## Sample Request
```
curl -s XGET "https://link-search.api.cj.com/v2/link-search?website-id=12345&link-type=banner&advertiser-ids=joined" -H "Authorization: Bearer <token>"
```

## Response includes
- advertiser-id
- advertiser-name
- click-url (the actual affiliate link)
- destination
- link-name
- sale-commission
