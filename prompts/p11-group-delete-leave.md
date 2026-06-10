# Group Delete / Leave from Dashboard

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

Currently `groupsApi.deleteGroup` exists in `api.ts` but is never called from the UI. Users cannot delete or leave groups from the Groups screen. Fix: add a long-press action on every group card that opens a destructive confirmation alert.

- **Group creator** → "Delete Group" (removes the group entirely for all members)
- **Non-creator member** → "Leave Group" (removes only themselves)

Both must work for all users — no creator-only gating.

---

## Files to modify

- `mobile/src/components/GroupCard.tsx`
- `mobile/src/screens/GroupsScreen.tsx`

---

## Change 1 — Add `onLongPress` prop to GroupCard

In `GroupCard.tsx`, update the `GroupCardProps` interface:
```tsx
interface GroupCardProps {
  group: GroupListItem;
  members?: UserBalance[];
  myNetBalance?: number;
  compact?: boolean;
  onPress: () => void;
  onLongPress?: () => void;   // ← add this
}
```

Update the function signature to destructure it:
```tsx
export default function GroupCard({ group, members = [], myNetBalance = 0, compact = false, onPress, onLongPress }: GroupCardProps) {
```

Pass it to the root `TouchableOpacity` (wherever `onPress={onPress}` is):
```tsx
onLongPress={onLongPress}
delayLongPress={350}
```

---

## Change 2 — Wire delete/leave in GroupsScreen

In `GroupsScreen.tsx`, add these imports at the top (alongside existing ones):
```tsx
import { Alert } from 'react-native';
import { groupsApi } from '../services/api';
```

Note: `Alert` and `groupsApi` might already be imported — don't duplicate.

Add a `handleGroupLongPress` function inside the component (after `onRefresh`):
```tsx
const handleGroupLongPress = (item: GroupListItem) => {
  const isCreator = item.created_by === user?.id;

  if (isCreator) {
    Alert.alert(
      'Delete Group',
      `"${item.name}" will be permanently deleted for all members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.deleteGroup(item.id);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete group.');
            }
          },
        },
      ]
    );
  } else {
    Alert.alert(
      'Leave Group',
      `You'll be removed from "${item.name}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.removeMember(item.id, user!.id);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not leave group.');
            }
          },
        },
      ]
    );
  }
};
```

Pass `onLongPress` to each `GroupCard`:
```tsx
<GroupCard
  key={item.id}
  group={item}
  members={members}
  myNetBalance={myNetBalance}
  compact={false}
  onPress={() => navigation.navigate('Group', { groupId: item.id })}
  onLongPress={() => handleGroupLongPress(item)}
/>
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. On the Groups screen, long-press a group you created → alert shows "Delete Group" with red destructive button → confirm → group disappears from the list
2. Long-press a group you did NOT create → alert shows "Leave Group" → confirm → you're removed and group disappears from your list
3. Normal tap still opens GroupDetailScreen (no regression)
