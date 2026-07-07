# TandemPay Mobile (Expo)

## Maestro smoke test

Local-run only for now — not wired into CI (simulator costs on CI runners are a
separate decision). One flow: launch the app, log in, confirm the Dashboard
renders.

### Install Maestro CLI

```
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Point the app at a backend

By default the app talks to production (`https://api.tandempay.ca/api`) — see
`src/services/api.ts`. To run the smoke test against a local backend instead,
set `EXPO_PUBLIC_API_URL` before building/starting the dev client, e.g. in
`mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

(Use your machine's LAN IP instead of `localhost` when running on a physical
device or some emulator configurations.)

### Seed the test account

The account used by `.maestro/dashboard-smoke.yaml` isn't the same one the web
Playwright smoke test uses (`e2e-smoke@ci.tandempay.ca`) — that account only
ever exists inside CI's ephemeral Postgres and is recreated fresh on every CI
run, so it isn't reachable from a local dev backend. With your local backend
running:

```
node .maestro/seed-test-user.mjs
```

This registers (or logs into, if it already exists) `e2e-mobile-smoke@dev.tandempay.local`
against `SEED_API_URL` (defaults to `http://localhost:8000/api`) and sets a
character nickname, since the app shows a mandatory setup modal for any
account without one — see env var overrides at the top of the script.

### Run the flow

With a simulator/emulator running and the dev build installed (and pointed at
the backend you seeded against):

```
maestro test .maestro/dashboard-smoke.yaml
```
