# PaceLog

A running progress diary that helps runners track activities, build consistency,
monitor pace improvements, and estimate race performance.

## Live demo

[Open PaceLog](https://pacelog-pai11.vercel.app)

> The free Render API may take up to one minute to wake after inactivity.

## Features

- Log running and walking activities
- Switch between kilometres and miles
- Track total and weekly distance
- Monitor running pace over time
- Build and measure weekly streaks
- View personal records
- Estimate 5K, 10K, half-marathon, and marathon performance
- Review and delete previous activities
- Use the responsive interface on desktop and mobile

## Technology

- **Frontend:** React, TypeScript, and Vite
- **Backend:** Ruby on Rails API
- **Database:** PostgreSQL hosted by Neon
- **Frontend hosting:** Vercel
- **API hosting:** Render
- **Testing:** Vitest and Rails tests

## Architecture

The React frontend communicates with the Rails JSON API. The Rails application
stores activities in PostgreSQL and calculates summaries, pace trends, streaks,
records, and race predictions.

The Rails API lives in `api/` and the React frontend lives in `web/`.

## Project status

PaceLog is currently a working prototype. Activity data is shared because user
accounts and authentication have not been implemented yet. Do not store
sensitive personal information.

## Running locally

Install the dependencies:

```sh
(cd api && bundle install && bin/rails db:create db:migrate db:seed)
(cd web && npm install)
```

Start the Rails API and React frontend:

```sh
bin/dev
```

| Service  | Local URL               |
| -------- | ----------------------- |
| Frontend | `http://127.0.0.1:5173` |
| API      | `http://127.0.0.1:3001` |

## Deployment

- React frontend: Vercel
- Rails API: Render
- PostgreSQL database: Neon

The frontend uses `VITE_API_BASE_URL` to connect to Rails. The API uses
`DATABASE_URL` for PostgreSQL and `FRONTEND_ORIGINS` for its CORS allowlist.

## Tests

```sh
(cd api && bin/rails test)   # model + request specs
(cd web && npm test)         # API client + save-flow component tests
```

## API endpoints

- `GET  /api/v1/activities` — activities and dashboard summary
- `POST /api/v1/activities` — create an activity
- `DELETE /api/v1/activities/:id` — delete an activity
