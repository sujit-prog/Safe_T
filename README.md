# SAfe_T — Odisha's AI-Powered Safety Companion

> *Stay Safe Anywhere. Designed for students and women navigating new areas.*

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-336791?logo=postgresql)

---

## What is SAfe_T?

SAfe_T is a real-time urban safety platform built for Odisha, India. It combines historical police incident data, environmental infrastructure signals, and crowd-sourced guardian alerts to deliver a **Live Safety Pulse** score for any location.

The system is purpose-built for students and women who need fast, trustworthy safety intelligence while navigating unfamiliar areas — with zero cost and no account required to try it.

---

## Core Features

### 🎯 Quick Safety Check (No Login Required)
Click anywhere on an interactive map to instantly get a safety score, risk level, and nearby emergency center information for that location.

### 🛡️ Live Safety Pulse
A composite score built from three weighted signals:
- **Historical Police Data** — 20% weight, sourced from CCTNS incident records
- **Environmental Infrastructure** — 35% weight, based on street lighting density and Safe Anchor proximity (24/7 shops, hospitals, police stations)
- **Guardian Peer Alerts** — 45% weight, real-time verified community reports

### 🗺️ Intelligent Route Planner
Powered by the OSRM routing engine with a custom geospatial safety overlay:
- Calculates up to three route alternatives (Safest, Fastest, Balanced)
- Color-codes each route segment in real time: 🟢 Safe · 🟠 Caution · 🔴 Risk
- Segments scored against a live database of incident reports using a bounding-box + Haversine distance algorithm
- Turn-by-turn navigation panel with step-by-step directions

### 🚨 SOS System
One-tap emergency broadcast that:
- Marks the active trip as SOS in the database
- Surfaces all active guardian contacts
- Locates the nearest Safe Anchor (hospital, police station, 24/7 store)
- Displays direct-dial buttons for Police (100), Ambulance (108), Fire (101), and Women's Helpline (181)

### 📍 Live Location Tracking
While a trip is active, the app uses the browser Geolocation API to watch the user's position every 10 seconds, syncing coordinates to the backend. A 15-second poll simultaneously checks proactive alerts for the current location.

### 🔔 Proactive Alert System
The backend continuously evaluates the user's live coordinates against a risk model that includes:
- A **night-time multiplier** (25% score reduction between 9 PM and 5 AM)
- Configurable alert thresholds (Low / Medium / High)
- An **inactivity SOS countdown** — if a user is in a HIGH or CRITICAL zone and stops interacting for a configurable period, an automatic SOS countdown begins

### ⚙️ User Preferences
Authenticated users can configure:
- Alert threshold (the minimum risk level that triggers a banner)
- SOS inactivity timer (30 seconds / 1 minute / 2 minutes)
- Night-time multiplier on/off

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Framer Motion, Lucide React |
| Maps | Leaflet + React-Leaflet, OSRM (open-source routing) |
| Geocoding | OpenStreetMap Nominatim |
| Database ORM | Prisma 5 |
| Database | PostgreSQL (Supabase-compatible) |
| Auth | Cookie-based session tokens + bcryptjs password hashing |
| Language | TypeScript (strict mode) |

---

## Project Structure

```
safe_t/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── migrations/            # SQL migration history
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── alerts/proactive/   # Live risk + night multiplier engine
│   │   │   ├── auth/               # Login, register
│   │   │   ├── dashboard/overview/ # Aggregated dashboard data
│   │   │   ├── route-safety/       # Geospatial incident scoring
│   │   │   ├── safety/             # Single-location safety check
│   │   │   ├── trip/               # Start / update / end / SOS
│   │   │   └── user/settings/      # Notification preferences
│   │   ├── components/
│   │   │   ├── MapView.tsx          # General map with emergency overlays
│   │   │   ├── NavigatorMap.tsx     # Full navigation map with safety segments
│   │   │   └── common/
│   │   │       └── ProactiveAlertBanner.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Dashboard overview + route planner
│   │   │   ├── map/page.tsx        # Navigator page
│   │   │   ├── history/page.tsx    # Check history
│   │   │   └── preferences/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── page.tsx               # Public landing page
│   ├── hooks/
│   │   ├── useLiveLocation.ts     # GPS watch + trip sync + proactive alerts
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   └── prisma.ts              # Singleton Prisma client
│   ├── middleware.ts               # Route protection (dashboard requires auth)
│   └── types/index.ts             # Shared TypeScript interfaces
├── seed-incidents.js              # Seeds 250 IncidentReport rows for testing
└── seed-incidents.ts
```

---

## Database Models

| Model | Purpose |
|---|---|
| `User` | Registered accounts |
| `CheckHistory` | Saved safety check results per user |
| `NetworkAlert` | Community-reported incidents for the live feed |
| `GuardianConnection` | Trusted contacts linked to a user |
| `SafeAnchor` | Police stations, hospitals, 24/7 stores |
| `IncidentReport` | Historical incidents used by the route-safety algorithm |
| `ActiveTrip` | Live trip sessions with SOS state |
| `UserNotificationSettings` | Per-user alert and night-mode preferences |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20.9
- PostgreSQL database (local or Supabase)

### 1. Clone and install

```bash
git clone <repo-url>
cd safe_t
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host:5432/safe_t"
DIRECT_URL="postgresql://user:password@host:5432/safe_t"
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed incident data (optional but recommended)

This populates 250 realistic incident reports across Odisha for the route safety algorithm to work with:

```bash
node seed-incidents.js
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How the Route Safety Algorithm Works

The `/api/route-safety` endpoint scores a route in three steps:

1. **Bounding box** — Computes the min/max lat/lng of all route coordinates and adds 0.02° padding (~2 km), then fetches all `IncidentReport` rows within that box. This is fast because it avoids a full table scan.

2. **Segment scoring** — The route is divided into ~20 equal segments. For each segment, incidents within 1 km of the segment midpoint are weighted by proximity and severity:
   ```
   penalty += (1 - dist/1000) × severity × 1.5
   score = max(0, min(100, 85 - total_penalty))
   ```

3. **Color rendering** — The `NavigatorMap` component draws each segment as a polyline colored by score: green (≥70), orange (45–70), or red (<45).

---

## Guardian System

Users can earn **Expert Guardian** status by submitting verified quick-audits (minimum 5 reports with 5 peer confirmations). Expert Guardians' reports carry higher weight in the 45% community signal component of the Live Safety Pulse.

---

## Roadmap

- Integration with official Odisha Police CCTNS API
- Push notifications via service workers
- Expert Guardian badge system with verification workflow
- Offline mode with cached safety data
- Multi-language support (Odia, Hindi, English)

---

## License

© 2026 SAfe_T. All rights reserved.

Built with care for community safety. Powered by OpenStreetMap.
