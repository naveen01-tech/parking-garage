# Reasoning

## Problem understanding
The core problem is a parking garage management system with business rules around spot assignment, active sessions, EV enforcement, and fee calculation. The most important correctness concerns are data integrity and business rules rather than visual polish.

## Requirements identified
The requirements include:
- parking sessions
- multiple garages and spots
- prefix/suffix vehicle types including EV
- duplicate prevention
- fee calculation with rounded-up partial hours and a daily cap
- vehicle lookup by plate
- availability reporting
- paging and sorting in history
- auth and protected routes
- a usable responsive UI with separate pages/views
- readable, non-editable result cards instead of raw API JSON

## Requirement prioritization
The assessment explicitly prioritizes business correctness before feature breadth. The sequence was:
1. check-in
2. check-out
3. fee calculation
4. double-allocation prevention
5. spot types and lookups
6. supporting features

This guided the implementation order.

## Architecture decisions
The system uses a simple layered approach:
- Express routes handle HTTP
- service layer holds pricing logic
- data layer manages SQLite access
- frontend is plain HTML/CSS/JS to stay fast and maintainable

This keeps rules centralized without over-engineering. Plain HTML, CSS, and JavaScript are sufficient for the separate authentication and dashboard views without adding framework overhead.

## Technology choice and trade-offs
Node.js + Express + SQLite is a good fit for the short time limit. It avoids unnecessary infrastructure and keeps execution simple. The frontend remains light so the project stays easy to explain and debug.

## Database design decisions
A minimal schema was chosen with users, garages, parking_spots, and parking_sessions. This is enough to support parking logic and future additions without unnecessary complexity.

## Parking allocation strategy
The policy used is:
- EV vehicles must get EV spots.
- Compact/standard vehicles prefer compact spots first.
- If no compact spot is available, they can fall back to any free spot.

This is a reasonable engineering decision and is documented in the README.

## EV enforcement
EV enforcement is handled at the backend business layer by validating the selected spot type before a session is created. This ensures the frontend cannot bypass the rule.

## Double-parking prevention
The app prevents duplicate active sessions by checking the plate before creating a new session.
It also prevents a spot from being reused by marking `is_occupied` and checking before assignment.

## Fee calculation approach
The prices are stored centrally in `src/config.js` and used through `src/services/feeService.js`. This keeps the pricing model configurable and avoids value duplication.

## Handling ambiguous requirements
Some requirements are intentionally broad (like pricing and allocation policy). The app chooses a sensible default and documents it clearly rather than inventing a more complicated solution.

## Edge cases
The implementation covers several important edge cases:
- invalid input
- duplicate active vehicle
- no spot available
- invalid vehicle type
- unauthorized requests
- invalid history query parameters

## Testing approach
The project verifies the most important business behaviors through HTTP-focused tests in the Node runtime where practical. The testing goal is core business correctness, not UI perfection.

## Actual development process
The project was created incrementally with the core server and database foundation first, then auth, then parking logic, then UI and docs.

## Frontend flow decisions
The authentication page shows one form at a time with Login and Signup pill tabs. A successful login opens the dashboard, where Check-In, Check-Out, Vehicle Search, and Parking History are separate views. The active view is selected through the dashboard navigation, and the mobile layout collapses that navigation behind a hamburger menu.

Successful check-in, checkout, and vehicle search responses are rendered as read-only cards. Checkout is presented as a receipt with the fee, vehicle plate, garage, spot, spot type, session ID, and a print action. Check-in and search use the same visual language while showing their own API fields. API responses and backend behavior remain unchanged.

## Actual issues encountered
The main practical issue was creating a project from an empty repo and ensuring the app stayed minimal while still satisfying the required product features. The UI initially displayed multiple operations together and exposed raw JSON responses. This was resolved with centralized view toggling, responsive navigation, and dedicated result renderers.

## Regression testing
The project was validated by running the server and checking the main flows, especially auth, check-in, checkout, vehicle search, and history. Frontend JavaScript is checked with `node --check public/app.js`, and the served HTML is checked for the authentication, dashboard, and navigation hooks.

## Time-limit trade-offs
The implementation prioritizes correctness and required features while keeping the UI responsive and task-focused. This matches the assessment guidance to focus on the most important business logic first.

## Requirement-change adaptation
The architecture is modular enough to accommodate new twists such as a messy rate card, an auto-close endpoint, or session transfer by centralizing pricing logic and session management.

## Future improvements
- richer admin dashboard
- rate-card CRUD
- more robust API validation
- automated integration tests
- stronger data model constraints
