# [Character System 2/2] Mobile — types + updateProfile

## Context
Load `graphify-out/GRAPH_REPORT.md` first.
Relevant communities: **17** (React Native Auth Context), **5** (Mobile Social Screens — api.ts).

---

## Problem

The mobile `User` interface in `api.ts` is missing `character_shape`, `character_color`, and `character_nickname` — the backend already returns them from `GET /auth/me` but mobile ignores them. There is also no `authApi.updateProfile()` method to call `PATCH /auth/me`.

---

## Task

**MODIFY `mobile/src/services/api.ts`:**

1. Add three fields to the `User` interface:
```ts
character_shape?: string | null;
character_color?: string | null;
character_nickname?: string | null;
```

2. Add `updateProfile` to `authApi`:
```ts
updateProfile: (data: {
  name?: string;
  interac_email?: string;
  character_shape?: string;
  character_color?: string;
  character_nickname?: string;
}) => request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
```

No other changes to the file.

---

**MODIFY `mobile/src/context/AuthContext.tsx`:**

`refreshUser` already exists and re-fetches the user — no change needed there. Just make sure the `AuthContextType` interface exposes it (it already does). Only change needed: after a successful `login()`, the fetched user will now include character fields automatically since they come from `authApi.me()`.

No changes needed to `AuthContext.tsx` unless `refreshUser` is not already exported — in that case expose it.

---

## Rules

1. Additive only — no existing fields or methods removed or renamed.
2. No changes to navigation, screens, or components.
3. `character_shape | null` not just `string` — backend can return null for users who haven't set a character yet.
