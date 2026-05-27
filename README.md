# SpotMe

SpotMe is a parking recommendation module for the [ARI](https://github.com/Tife31/ari) personal dashboard. It solves the everyday frustration of driving to a Toronto event and not knowing where to park — or overpaying because you picked the wrong lot.

## What It Does

Connect your calendar and SpotMe reads your upcoming Toronto events. For each one, it finds nearby parking and gives you three recommendations:

- **Best Price** — the cheapest lot within a 25-minute walk, with estimated total cost based on how long your event runs
- **Closest** — the nearest lot to your destination, with pricing shown so you know what convenience costs
- **Best Overall** — a balanced pick that scores each lot on price, proximity, and data reliability

## The Problem It Solves

Parking in downtown Toronto is expensive and hard to predict. Most people either circle the block hoping for street parking or pay whatever the nearest lot charges without knowing if a cheaper option is two minutes further away. SpotMe surfaces the tradeoff clearly — you see the price, the walk time, and a ranked recommendation — so you can make a decision before you leave, not after you're already in traffic.

## Technologies Used

- **Next.js 16 / React 19** — module pages and API routes
- **Drizzle ORM + PostgreSQL** — storing OAuth tokens and user preferences with row-level security
- **TanStack Query** — client-side data fetching with caching and optimistic updates
- **City of Toronto Open Data** — real Green P parking lot locations and hourly rates (free, no API key required)
- **Google Calendar API** — reads upcoming events with Toronto locations via OAuth 2.0
- **Google Maps APIs** — geocoding event addresses, walking distance via Distance Matrix, and nearby private lots via Places
- **AES-256-GCM encryption** — OAuth tokens encrypted at rest before being stored in the database

## Running Without API Keys

SpotMe works out of the box with no configuration. When API keys are absent it falls back to:

- 3 sample Toronto events (Rogers Centre, TIFF Bell Lightbox, Art Gallery of Ontario)
- 10 hardcoded downtown Green P lots with real approximate coordinates and rates
- Haversine-based walk time estimates instead of live routing data

This lets you explore the full UI immediately. Real data is unlocked by adding `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_MAPS_API_KEY` to your environment.

## Setup

1. Enable the module from the ARI `/modules` page — the database table is created automatically
2. Go to `/spot-me/settings` and connect your calendar via Google OAuth
3. Navigate to `/spot-me` to see your upcoming Toronto events and click **Find Parking**
