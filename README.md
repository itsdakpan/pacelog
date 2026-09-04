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

```sh
bin/dev
```

That starts both halves and does not return until one of them exits:

| Process | URL                     |
| ------- | ----------------------- |
| API     | `http://127.0.0.1:3001` |
| web     | `http://127.0.0.1:5173` |

`bin/dev` refuses to start if either port is taken, waits for the API to answer
`/up` before starting Vite, and shuts everything down if either process dies —
so the frontend is never left running against an API that isn't there.

Override the ports if you need to: `API_PORT=4001 WEB_PORT=4173 bin/dev`.

The API uses port 3001 locally to avoid conflicts with other development
services. The default lives in `api/config/puma.rb` and is honoured by `PORT`.

### How the frontend reaches the API

The browser calls same-origin paths (`/api/v1/...`), and Vite proxies `/api` to
the API port (`web/vite.config.ts`). Nothing hardcodes a host or port into the
client bundle in development.

## Deployment configuration

The two halves can be hosted separately. Build the frontend with the API's
public base URL (including `/api/v1`):

```sh
cd web
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build
```

Set `FRONTEND_ORIGINS` on the Rails service to the exact public frontend
origin. Multiple origins are comma-separated:

```sh
FRONTEND_ORIGINS=https://pacelog.example.com
```

The demo intentionally accepts visitor writes. Schedule the following command
nightly on the API host to replace visitor data with the deterministic seed:

```sh
cd api
bin/rails pacelog:reset_demo
```

## First-time setup

```sh
(cd api && bundle install && bin/rails db:create db:migrate db:seed)
(cd web && npm install)
```

## Tests

```sh
(cd api && bin/rails test)   # model + request specs
(cd web && npm test)         # API client + save-flow component tests
```

## Endpoints

- `GET  /api/v1/activities` — activities and dashboard summary
- `POST /api/v1/activities` — create an activity
- `DELETE /api/v1/activities/:id` — delete an activity

## Known environment issue

Vite 8 wants Node 20.19+ or 22.12+; this machine has 20.17.0. Dev and build
currently work but print a warning, and jsdom is pinned to 26 because 27 needs
the newer Node. Upgrading Node clears both.
