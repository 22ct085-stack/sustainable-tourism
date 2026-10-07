# S-CADE — Sustainable Tourism Recommendation System

S-CADE is a full-stack web application that finds real nearby attractions with Google Places, combines them with travel preferences and current weather, and explains a ranked shortlist of up to three places. Its 360° Places page lets visitors select a real nearby attraction and open the closest available interactive Google Maps Street View panorama at that place. Coverage varies by location; the panorama may be on a nearby road rather than inside the attraction. The keyless Google Maps URL keeps API credentials out of the browser. Sustainability information is not present in the current Places response; S-CADE uses a clearly documented neutral score and does not make environmental claims.

## Architecture

- **Client:** React 18, TypeScript, Vite, React Router, Axios, and responsive CSS.
- **API:** Node.js, Express, TypeScript, Zod input validation, and Axios integrations.
- **Data:** MongoDB/Mongoose models for users, preferences, reviews, and saved places. MongoDB is optional at startup; recommendation requests use live Places results and do not require saved records.
- **External services:** Google Places API (New) for attractions and location search; OpenWeather current weather endpoint for context. The UI remains usable when the weather service is unavailable. API keys stay on the server.
- **Recommendation scoring:** Deterministic and explainable. Optional Gemini integration can select from exact, precomputed explanation sentences; its output is checked against those sentences, so it cannot add claims. It falls back to deterministic explanations on errors.
- **360° place views:** Select a recommended attraction and open its interactive Street View panorama in Google Maps. No camera permission or browser API key is required. Google Maps shows the closest available panorama to the selected coordinates; coverage varies.

## Folder structure

```text
SCADE/
├── client/
│   ├── src/components/       # Navigation, location form, place cards, status states
│   ├── src/pages/            # Home, recommendations, AR explore, preferences, about
│   ├── src/services/         # API client and browser preferences/location storage
│   ├── src/types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/
│   ├── src/config/           # Environment configuration
│   ├── src/controllers/      # Validated API handlers
│   ├── src/middleware/       # Error handling
│   ├── src/models/           # Mongoose schemas
│   ├── src/routes/
│   ├── src/services/         # Places, weather, recommendation scoring
│   ├── src/app.ts
│   ├── src/index.ts
│   ├── .env.example
│   └── tsconfig.json
├── package.json              # npm workspaces and combined development command
└── README.md
```

## Requirements and installation

- Node.js 20 or newer and npm.
- MongoDB Community Server locally, or a MongoDB connection string. MongoDB is optional for the read-only recommendation flow.
- Google Cloud project with billing configured for Places API (New).
- OpenWeather API key for live weather context.

From the `SCADE` directory:

```bash
npm install
```

Copy `server/.env.example` to `server/.env` and fill in the values you have. Do not put server keys in `client/.env` or commit `server/.env`.

## Environment variables

`server/.env` format:

```dotenv
GOOGLE_PLACES_API_KEY=your_google_places_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
MONGODB_URI=mongodb://127.0.0.1:27017/scade
PORT=5000
CLIENT_URL=http://localhost:5173
```

`GOOGLE_MAPS_API_KEY` is used server-side for walking routes through Google Routes API. Keep it out of client environment files. `GEMINI_API_KEY` enables optional selection of precomputed explanations; if it is absent or fails, deterministic explanations are returned. `GEMINI_MODEL` defaults to `gemini-3.8-flash`. `MONGODB_URI` can be omitted to run without MongoDB. The app needs `GOOGLE_PLACES_API_KEY` for places and location search and `OPENWEATHER_API_KEY` for weather. Missing keys return useful configuration errors; weather failure does not prevent recommendations.

## Provider setup

### Google Places and Maps

1. Create/select a project in Google Cloud Console and configure billing.
2. Enable **Places API (New)**. The backend uses Nearby Search and Text Search from Places API (New).
3. Create an API key restricted to Places API (New), and store it as `GOOGLE_PLACES_API_KEY` in `server/.env`.
4. Enable **Routes API** in the same Google Cloud project. Create or use a server key restricted to Routes API and store it as `GOOGLE_MAPS_API_KEY` in `server/.env`. Billing must be enabled for both services.
5. The API returns Google Maps URLs for places when available. S-CADE also creates a coordinate-based Google Maps search link if a place URL is missing. No browser Maps JavaScript key is needed.


### OpenWeather

Create an API key in your OpenWeather account and set `OPENWEATHER_API_KEY`. The backend calls the Current Weather endpoint using metric units. Weather details are optional context, not safety guidance.

### Gemini (optional)

Add `GEMINI_API_KEY` to enable the optional Gemini explanation selector. It receives only the top three candidates and their deterministic explanations, then may select exact sentences from that list. Server-side validation rejects any new or altered text. On missing keys, service errors, malformed output, or unsupported sentences, the deterministic explanations remain in use. The recommendation score is never generated by Gemini.

## Run the application

In two terminals from `SCADE`:

```bash
npm run dev --workspace server
```

```bash
npm run dev --workspace client
```

Or run both with `npm run dev`. The API listens on `http://localhost:5000`; Vite serves the app at `http://localhost:5173` and proxies `/api` requests to the API. Production builds use `npm run build`; start the built API with `npm start --workspace server`. Preview the client build with `npm run preview --workspace client`.

## API endpoints

- `GET /api/health` — service health.
- `GET /api/places/nearby?latitude=11.4102&longitude=76.6950&radius=5000` — real nearby attractions (radius 100–50,000 m).
- `GET /api/places/search?query=Ooty` — place-name search for coordinates.
- `GET /api/recommendations?latitude=11.4102&longitude=76.6950&budget=medium&walking=false&sustainabilityPreference=0.5&travelType=nature` — ranked results, explanations, weights, and weather when available. `travelType` can be nature, historical, adventure, family, cultural, or relaxation.
- `GET /api/weather?latitude=11.4102&longitude=76.6950` — current weather.
- `GET /api/routes/walking?originLatitude=11.4102&originLongitude=76.6950&destinationLatitude=11.4054&destinationLongitude=76.6961` — walking route, encoded geometry, and turn instructions from Routes API.

Requests with invalid coordinates return HTTP 400. Missing API configuration returns HTTP 503. Provider/network failures return a sanitized HTTP 502 response. The API never returns credentials.

## Recommendation scoring

All component scores are normalized to 0–100. The final score is:

```text
(preferenceMatch × 0.25)
+ (distance × 0.20)
+ (context × 0.15)
+ (sustainability × 0.15)
+ (rating × 0.10)
+ (localRelevance × 0.10)
+ (availability × 0.05)
```

Distance uses the Haversine formula; nearer places score higher, and the walking preference weights distances against a closer target. Rating maps a 0–5 Google rating to 0–85, with a capped review-count contribution (up to 15 points). Context uses weather conditions to reduce the score for outdoor attractions during rain or thunderstorms; it does not make safety claims. Preference match combines travel-type relevance with Google Places' broad price level when available; missing price levels use a neutral partial score and are not presented as exact costs. Availability uses current opening status when Places supplies it. Local relevance stays neutral because Places does not provide a reliable local-versus-tourist measure. Google Places currently supplies no sustainability evidence to this app, so sustainability remains at 50/100, a neutral baseline for every place. This is not a sustainability assessment. The API returns up to three results; it will not fabricate cards if fewer than three real places are returned.

## AR walking navigation

Choose **Show walking route** from a recommendation to display the route inside S-CADE. The page requests location access, then loads walking directions and turn instructions. GPS updates refresh remaining distance and guidance, rerouting when the device moves well away from the route. The in-page OpenStreetMap view supports pan and zoom and marks the live position, route, and destination. Camera access is optional; switch to **AR View** to enable the compass-guided camera overlay. Arrival is detected within approximately 22 meters. Walking routes may not show clear sidewalks or pedestrian paths; follow local signs and use crossings.

This browser implementation is sensor-based guidance rather than a world-anchored ARCore/ARKit experience. GPS and device compass accuracy vary, and the path is not physically pinned to sidewalks or buildings in the camera image. Camera and motion sensor access requires HTTPS or localhost, and permission support varies by device. The map uses OpenStreetMap tiles with visible attribution. Set public `VITE_OSM_TILE_URL` in `client/.env` to another compatible provider if needed, following that provider's terms. Keep awareness of surroundings while walking.

## Preferences and privacy

Travel type, budget, walking preference, sustainability preference, and selected coordinates are stored in browser local storage. Location access uses browser geolocation only after the user presses the location button; manual coordinates and place-name search are also available. API keys are never requested in the client.

## Troubleshooting

- **Places returns 403:** Verify billing, key restrictions, and Places API (New) enablement.
- **Places key missing:** Add `GOOGLE_PLACES_API_KEY` to `server/.env`, then restart the API.
- **Weather unavailable:** Verify `OPENWEATHER_API_KEY`; recommendations still work with neutral context when weather cannot be fetched.
- **Walking routes unavailable:** Enable Routes API, verify billing and the `GOOGLE_MAPS_API_KEY` restriction, and restart the server.
- **MongoDB connection warning:** Start MongoDB or remove `MONGODB_URI`; live recommendations still start.
- **Browser cannot reach API:** Start the server on port 5000 and client on 5173. Set `CLIENT_URL` to the client origin if it differs.
- **Geolocation is unavailable:** Browser geolocation requires a secure context (HTTPS or localhost) and permission. Enter coordinates or search for a location instead.
- **No nearby attractions:** Try another location or a larger radius with the nearby endpoint.
- **TypeScript/build errors:** Run `npm run build` from the project root to compile both workspaces.
