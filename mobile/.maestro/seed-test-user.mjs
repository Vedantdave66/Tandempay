#!/usr/bin/env node
// Seeds (or reuses) a test account for the Maestro smoke test against a LOCAL
// dev backend. Not for CI, not for production — this is a separate account
// from web's e2e-smoke@ci.tandempay.ca, which only exists inside CI's
// ephemeral Postgres and is recreated fresh on every CI run. Mobile's Maestro
// flow runs locally against whatever backend BASE_URL points to (see
// mobile/README.md), so it needs its own durable seed step here.
//
// Usage (with a local backend running, e.g. `uvicorn app.main:app` from backend/):
//   node mobile/.maestro/seed-test-user.mjs
//
// Env overrides:
//   SEED_API_URL   default: http://localhost:8000/api
//   SEED_EMAIL     default: e2e-mobile-smoke@dev.tandempay.local
//   SEED_PASSWORD  default: E2eMobileSmokePassword123!
//   SEED_NAME      default: E2E Mobile Smoke

const API_URL = process.env.SEED_API_URL || "http://localhost:8000/api";
const EMAIL = process.env.SEED_EMAIL || "e2e-mobile-smoke@dev.tandempay.local";
const PASSWORD = process.env.SEED_PASSWORD || "E2eMobileSmokePassword123!";
const NAME = process.env.SEED_NAME || "E2E Mobile Smoke";

async function main() {
    let token = await register();
    if (!token) token = await login();
    if (!token) {
        console.error("Could not register or log in the seed account. Is the backend running at " + API_URL + "?");
        process.exit(1);
    }

    // The mobile app shows a mandatory, non-dismissable character-setup modal
    // for any account with character_nickname === null, which would block the
    // Maestro flow before the dashboard ever renders. Set it here so the seed
    // account is ready to use immediately.
    await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            character_shape: "rect",
            character_color: "#3ECF8E",
            character_nickname: "E2E",
        }),
    });

    console.log("Seed account ready:");
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
}

async function register() {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: NAME, email: EMAIL, password: PASSWORD }),
    });
    if (!res.ok) return null;
    return (await res.json()).access_token;
}

async function login() {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!res.ok) return null;
    return (await res.json()).access_token;
}

main();
