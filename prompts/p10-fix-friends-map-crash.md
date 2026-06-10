# Fix: `friends.map is not a function` crash in FriendsScreen

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components).

**Root cause**: `FriendsScreen.tsx` calls `setFriends(friendsData)` directly without a defensive array check. If the `/me/friends` endpoint returns `null`, `{}`, or a wrapped object, `friends` becomes a non-array and `friends.map(...)` throws.

**Fix**: One line change in `FriendsScreen.tsx`.

---

## File to modify

`mobile/src/screens/FriendsScreen.tsx`

---

## Change — Normalize friends API response before storing

Find the `loadData` function where `friendsApi.getMyFriends()` is called. The current code is:
```tsx
const [friendsData, requestsData] = await Promise.all([
    friendsApi.getMyFriends(),
    friendsApi.getPendingRequests()
]);
setFriends(friendsData);
setRequests(requestsData);
```

Replace `setFriends(friendsData)` with:
```tsx
setFriends(
    Array.isArray(friendsData)
        ? friendsData
        : Array.isArray((friendsData as any)?.friends)
            ? (friendsData as any).friends
            : []
);
```

No other changes.

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. Navigate to the Friends/FriendsHub screen
2. Screen loads without crashing — friends list appears (or empty state if no friends)
3. Add a friend via email — no crash, success toast or error message appears
