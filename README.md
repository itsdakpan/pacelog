# PaceLog

PaceLog is a simple running diary for people who want to see their progress and
become stronger runners.

## Try it

[Open PaceLog](https://pacelog-pai11.vercel.app)

The app uses free hosting, so it may take up to one minute to load after it has
not been used for a while.

## What you can do

- Record a run or walk
- Choose kilometres or miles
- See your weekly and total distance
- Follow your pace and running streak
- View your best performances
- Get estimated finish times for a 5K, 10K, half-marathon, and marathon
- Look back at or delete previous activities

## Why I built it

Improvement can be difficult to notice from one run to the next. PaceLog brings
your activities and progress together so you can see how far you have come and
stay motivated toward your next goal.

## Built with

PaceLog uses React and TypeScript for the website, Ruby on Rails for the API,
and PostgreSQL for storing activities. It is hosted using Vercel, Render, and
Neon.

## Project status

PaceLog is currently a working prototype. Everyone shares the same demo
activity list because personal accounts have not been added yet. Please do not
enter sensitive personal information.

## Run it on your computer

Install the project:

```sh
(cd api && bundle install && bin/rails db:create db:migrate db:seed)
(cd web && npm install)
```

Start PaceLog:

```sh
bin/dev
```

Then open `http://127.0.0.1:5173` in your browser.

## About me

Portfolio: [My Portfolio](https://dylan-akpan.vercel.app/#top)
