# PaceLog API

Rails API for the PaceLog fitness activity tracker.

## Setup

```sh
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server
```

The API runs at `http://127.0.0.1:3001` (not Rails' usual 3000, which `next dev`
claims for the portfolio site — see the root README). The React app in `../web`
runs at `http://127.0.0.1:5173` and proxies `/api` here.

Prefer `bin/dev` from the repo root, which starts both and fails loudly if
either port is busy or the API does not come up.

Run the tests with `bin/rails test`.

## Endpoints

- `GET /api/v1/activities` — activities and dashboard summary
- `POST /api/v1/activities` — create an activity
- `POST /api/v1/activities/:id/kudos` — add kudos

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...
