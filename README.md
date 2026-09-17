# ParkEasy

## Overview
ParkEasy is a parking garage management system for city-centre parking operations. It supports vehicle check-in, check-out, fee calculation, EV-only spot enforcement, availability tracking, and parking history through a responsive web interface.

## Problem Description
The application needs to help attendants manage a parking garage with limited spaces, multiple spot types, active sessions, and charging rules. It must prevent invalid parking decisions while keeping operations simple and testable.

## Features
- User registration and login
- Garage and spot creation
- Vehicle check-in and check-out
- EV-only parking enforcement
- Spot availability reporting
- Vehicle lookups by plate
- Parking history with pagination and sorting
- SQLite persistence
- Responsive web UI with separate authentication and dashboard views
- Read-only parking tickets, checkout receipts, and vehicle detail cards
- Responsive dashboard navigation with a mobile hamburger menu

## Tech Stack
- Node.js
- Express.js
- SQLite
- JWT for auth
- bcryptjs for password hashing
- HTML/CSS/JavaScript frontend

## Prerequisites
- Node.js 18+
- npm

## Installation
1. `npm install`
2. Copy `.env.example` to `.env`
3. Update values if needed

## Environment Variables
- `PORT` — server port (default 3000)
- `JWT_SECRET` — JWT signing secret
- `DB_PATH` — SQLite database path

## Database Setup
The app initializes SQLite tables automatically on startup. The first run creates:
- `users`
- `garages`
- `parking_spots`
- `parking_sessions`

## Run the Project
### Production
```bash
npm start
```

### Development
```bash
npm run dev
```

## API Endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Garages
- `POST /api/garages`
- `GET /api/garages`
- `POST /api/garages/:garageId/spots`
- `GET /api/garages/:garageId/spots`
- `GET /api/garages/:garageId/spots/availability`

### Parking
- `POST /api/parking/check-in`
- `POST /api/parking/check-out`
- `GET /api/parking/active`
- `GET /api/parking/history?page=1&limit=10&sort=check_in&order=desc`
- `GET /api/parking/vehicle/:plate`

## Authentication
Protected routes require a bearer token in the Authorization header:
```http
Authorization: Bearer <token>
```

## Parking Business Rules
- EV vehicles must use EV spots.
- Standard and compact vehicles prefer compact spots, but can fall back to any free spot.
- A vehicle cannot have more than one active parking session.
- A parking spot cannot be double-assigned.
- Part-hours are rounded up at the fee layer.

## Fee Calculation Rules
The app uses a configurable pricing model:
- first hour: ₹50
- additional hour: ₹30
- daily cap: ₹300

Fee formula:
```text
ceil(durationHours) * rate
```
with a daily cap applied.

## Web UI Flow
- Login is displayed by default; Signup is shown as a separate tab.
- Successful authentication opens the dashboard.
- Dashboard operations are separated into Check-In, Check-Out, Vehicle Search, and Parking History views.
- Only one operation view is displayed at a time.
- Check-in, checkout, and vehicle search results are rendered as read-only cards instead of raw JSON.
- The layout adapts to desktop, tablet, and mobile screens.

## Assumptions
- The default garage has 6 sample spots.
- The system focuses on simple, correct core logic rather than deep enterprise complexity.

## Testing
```bash
npm test
```

The test suite uses Node's built-in test runner. Frontend syntax can be checked with:
```bash
node --check public/app.js
```

## Future Improvements
- support multiple garages with more detailed dashboards
- integrate a true front-end framework
- add rate-card management and pricing controls
- add more advanced reporting
