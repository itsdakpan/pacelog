# PaceLog

Run logging with distance/pace stats, an activity feed, and kudos.
Rails API in `api/`, React + Vite frontend in `web/`.

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

### Why the API is on 3001, not Rails' usual 3000

`next dev` claims port 3000 by default, and the portfolio site in
`../Dylan_about` runs there. When both were on 3000 they could each hold the
port at once — Next on the `*:3000` wildcard, Rails on the specific
`127.0.0.1:3000` — so which server answered a request depended on bind order
and which address the client used. Saves silently went to the wrong server.

The default lives in `api/config/puma.rb` and is honoured by `PORT`.

### How the frontend reaches the API

The browser calls same-origin paths (`/api/v1/...`), and Vite proxies `/api` to
the API port (`web/vite.config.ts`). Nothing hardcodes a host or port into the
client bundle, and there is no CORS in dev.

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
- `POST /api/v1/activities/:id/kudos` — add kudos

## Known environment issue

Vite 8 wants Node 20.19+ or 22.12+; this machine has 20.17.0. Dev and build
currently work but print a warning, and jsdom is pinned to 26 because 27 needs
the newer Node. Upgrading Node clears both.
