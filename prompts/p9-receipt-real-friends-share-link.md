# Receipt Scan — Real Friends + Share Link

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

Two fixes to `mobile/src/screens/ReceiptScanScreen.tsx`:
1. **Fix 404 "Payee not found"**: replace mock members with real friends from `friendsApi.getMyFriends()` so `payee_id` is a real user ID.
2. **Add Share Link**: on the summary screen, a second button shares a plain-text payment request anyone can act on — no app required.

---

## File to modify

`mobile/src/screens/ReceiptScanScreen.tsx`

---

## Change 1 — New imports

Add to the import block:
```tsx
import { Share } from 'react-native';
import { friendsApi, Friend } from '../services/api';
import { Link } from 'lucide-react-native';
```

---

## Change 2 — Replace mock members with real friends state

Remove the `MOCK_MEMBERS` constant entirely. Replace with live state inside the component:

```tsx
const [friends, setFriends]           = useState<Friend[]>([]);
const [loadingFriends, setLoadingFriends] = useState(true);
```

Add a `useEffect` to load friends on mount (alongside existing useEffect):
```tsx
useEffect(() => {
  friendsApi.getMyFriends()
    .then(data => setFriends(Array.isArray(data) ? data : []))
    .catch(() => setFriends([]))
    .finally(() => setLoadingFriends(false));
}, []);
```

---

## Change 3 — Update people picker to use real friends

In the `if (phase === 'people')` block, replace the `allMembers` array construction with:
```tsx
const allMembers = [
  {
    id: 'me',
    name: user?.character_nickname || 'Me',
    initial: (user?.character_nickname?.[0] || 'M').toUpperCase(),
    color: user?.character_color || colors.accent,
    email: '',
  },
  ...friends.map(f => ({
    id: f.id,
    name: f.name,
    initial: f.name[0]?.toUpperCase() ?? '?',
    color: f.avatar_color || '#6366F1',
    email: f.email,
  })),
];
```

Also update the default payer initialization. Change the `useState` for `payerId` to:
```tsx
// Will be set to first friend once friends load
const [payerId, setPayerId] = useState<string>('');
```

And add this inside the friends `useEffect`, after `setFriends(data)`:
```tsx
// Auto-select first friend as payer if none set yet
if (data.length > 0 && !payerId) {
  setPayerId(data[0].id);
}
```

In the people picker JSX, show a loading spinner while friends are loading:
```tsx
if (loadingFriends) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[{ color: colors.secondaryText, marginTop: vs(12), fontSize: ms(14) }, T.regular]}>
          Loading your friends…
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

Add this loading check at the very top of the `if (phase === 'people')` block, before the `const allMembers` line.

Also show an empty state when friends list is empty:
```tsx
if (!loadingFriends && friends.length === 0) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(40), gap: vs(12) }}>
        <Text style={[styles.peopleTitle, T.extrabold, { color: colors.text, textAlign: 'center' }]}>
          No friends yet
        </Text>
        <Text style={[styles.peopleSub, T.regular, { color: colors.secondaryText, textAlign: 'center' }]}>
          Add friends from the Me tab so you can split receipts with them.
        </Text>
        <TouchableOpacity
          style={[styles.cameraBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('FriendsHub')}
        >
          <Text style={[styles.cameraBtnText, T.bold]}>Add Friends</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## Change 4 — Pass payer email to summary

The summary phase needs the payer's email for the share link. Update the `allMembersForSummary` array in the `if (phase === 'summary')` block:
```tsx
const allMembersForSummary = [
  {
    id: 'me',
    name: user?.character_nickname || 'Me',
    initial: (user?.character_nickname?.[0] || 'M').toUpperCase(),
    color: user?.character_color || colors.accent,
    email: '',
  },
  ...friends.map(f => ({
    id: f.id,
    name: f.name,
    initial: f.name[0]?.toUpperCase() ?? '?',
    color: f.avatar_color || '#6366F1',
    email: f.email,
  })),
];
const payerMember = allMembersForSummary.find(m => m.id === payerId) ?? allMembersForSummary[0];
```

---

## Change 5 — Add Share Link button to summary screen

In the `if (phase === 'summary')` block, add a share helper and a second button in the `ctaBar`. Replace the single CTA view with:

```tsx
const handleShareLink = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const payerName  = payerMember.id === 'me' ? (user?.character_nickname || 'Me') : payerMember.name;
  const payerEmail = payerMember.email || '';
  const message = [
    `Hey! Here's your share of the bill:`,
    ``,
    `💰 Amount: $${myShare.toFixed(2)}`,
    `📋 For: Receipt Split`,
    ``,
    payerEmail
      ? `Send via Interac e-Transfer to:\n${payerEmail}`
      : `Pay ${payerName} $${myShare.toFixed(2)}`,
    ``,
    `— Sent via TandemPay`,
  ].join('\n');

  try {
    await Share.share({ message, title: `Pay ${payerName} $${myShare.toFixed(2)}` });
  } catch {}
};
```

Replace the `ctaBar` View in the summary phase:
```tsx
<View style={[styles.ctaBar, { backgroundColor: colors.background, gap: vs(10) }]}>
  {/* Primary: Pay via app */}
  <TouchableOpacity
    style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
    activeOpacity={0.84}
    onPress={() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('SettleUp', {
        payment: {
          amount: myShare,
          description: 'Receipt Split',
          payee_name: payerMember.id === 'me' ? (user?.character_nickname || 'Me') : payerMember.name,
          payee_id: payerMember.id === 'me' ? null : payerMember.id,
          payer_email: payerMember.email,
          group_id: null,
          id: null,
          isReceiptPayment: true,
        },
      });
    }}
  >
    <Text style={[styles.ctaBtnText, T.bold]}>
      Pay {payerMember.id === 'me' ? 'Yourself' : payerMember.name}  ·  ${myShare.toFixed(2)}
    </Text>
    <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
  </TouchableOpacity>

  {/* Secondary: Share link for people without the app */}
  <TouchableOpacity
    style={[styles.shareLinkBtn, {
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    }]}
    activeOpacity={0.78}
    onPress={handleShareLink}
  >
    <Link size={17} color={colors.secondaryText} strokeWidth={2} />
    <Text style={[styles.shareLinkText, T.semibold, { color: colors.secondaryText }]}>
      Share Link
    </Text>
  </TouchableOpacity>
</View>
```

Add `shareLinkBtn` and `shareLinkText` to StyleSheet:
```tsx
shareLinkBtn: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: scale(8), paddingVertical: vs(13), borderRadius: ms(16),
  borderWidth: StyleSheet.hairlineWidth,
},
shareLinkText: { fontSize: ms(15) },
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. Scan → parsing → People picker shows a loading spinner → then real friends appear
2. Select a real friend as payer → their real user ID is passed to SettleUpScreen
3. Claim items → Summary → tap "Pay [Friend] · $X" → SettleUpScreen opens → card/Apple Pay no longer 404s (payee is a real user)
4. Back on Summary, tap "Share Link" → native iOS/Android share sheet appears with a pre-written message containing the amount + payer's Interac email
5. If you have no friends added yet, an empty state appears with an "Add Friends" button that navigates to FriendsHub
