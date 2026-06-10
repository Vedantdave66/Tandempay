# Receipt Scan — Summary Phase + Navigation Fix

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

Two changes to `mobile/src/screens/ReceiptScanScreen.tsx`:
1. **Add a `summary` phase** — shown after "My Share" is tapped, displays everyone's calculated shares, then lets the user add the expense to a group.
2. **Fix navigation** — `navigation.navigate('MainTabs', { screen: 'Groups' })` doesn't always work from a modal in RN v7. Replace with `CommonActions.navigate`.

---

## File to modify

`mobile/src/screens/ReceiptScanScreen.tsx`

---

## Change 1 — Fix the import block

Add `CommonActions` to the react-navigation import:
```tsx
import { CommonActions } from '@react-navigation/native';
```

---

## Change 2 — Add `'summary'` to the Phase type

```tsx
type Phase = 'idle' | 'parsing' | 'people' | 'items' | 'summary';
```

---

## Change 3 — Replace `navigateToGroups` helper

Replace the existing `navigateToGroups` function with this:
```tsx
const navigateToGroups = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // Dismiss the modal first, then navigate to the Groups tab
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Groups' } }],
    })
  );
};
```

---

## Change 4 — Update the "My Share" CTA in the items phase

In the items phase CTA, change `onPress={navigateToGroups}` to:
```tsx
onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setPhase('summary');
}}
```

---

## Change 5 — Add the summary phase JSX

Add this new phase block just before the final items phase `return` statement (after the `if (phase === 'people')` block closes).

The summary screen shows:
- "Bill Summary" header with back arrow
- Each person's share as a card row (avatar circle + name + amount)
- Total row at the bottom
- Big "Add to Group" CTA that calls `navigateToGroups()`

```tsx
// ─────────────────────────────────────────────────────────────────────────
// SUMMARY — per-person breakdown
// ─────────────────────────────────────────────────────────────────────────
if (phase === 'summary') {
  const tip = parseFloat(tipAmount) || 0;
  const total = parseFloat((SUBTOTAL + TAX + tip).toFixed(2));
  const splitCount = included.size;

  // Build per-person breakdown
  // "me" gets their claimed items + prorated tax/tip
  // everyone else splits unclaimed items + prorated tax/tip equally
  const myFood       = MOCK_ITEMS.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
  const unclaimedFood= MOCK_ITEMS.filter(i => !claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
  const othersCount  = Math.max(splitCount - 1, 1);

  const myFoodWithUnclaimed = myFood + unclaimedFood / splitCount;
  const otherFoodEach = unclaimedFood / splitCount;

  const myFraction   = SUBTOTAL > 0 ? myFoodWithUnclaimed / SUBTOTAL : 1 / splitCount;
  const myTaxTip     = (TAX + tip) * myFraction;
  const myTotal      = parseFloat((myFoodWithUnclaimed + myTaxTip).toFixed(2));

  const otherFraction = SUBTOTAL > 0 ? otherFoodEach / SUBTOTAL : 1 / splitCount;
  const otherTaxTip   = (TAX + tip) * otherFraction;
  const otherTotal    = parseFloat((otherFoodEach + otherTaxTip).toFixed(2));

  const allMembers = [
    { id: 'me', name: 'You', initial: (user?.character_nickname?.[0] || 'Y').toUpperCase(), color: user?.character_color || colors.accent, amount: myTotal },
    ...MOCK_MEMBERS.filter(m => included.has(m.id)).map(m => ({ ...m, amount: otherTotal })),
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.itemsHeader}>
        <TouchableOpacity style={styles.backBtnInline} onPress={() => setPhase('items')}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemsTitle, T.extrabold, { color: colors.text }]}>Bill Summary</Text>
          <Text style={[styles.itemsSub, T.regular, { color: colors.secondaryText }]}>
            {splitCount} people · ${total.toFixed(2)} total
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.itemsScroll, { paddingTop: vs(8) }]}>

        {/* Per-person rows */}
        {allMembers.map((person, idx) => {
          const isMe = person.id === 'me';
          return (
            <View
              key={person.id}
              style={[
                styles.summaryPersonRow,
                {
                  backgroundColor: isMe
                    ? (isDark ? colors.accent + '14' : colors.accent + '0E')
                    : (isDark ? colors.surface : '#FFFFFF'),
                  borderColor: isMe
                    ? colors.accent + '35'
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  borderWidth: isMe ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              {/* Avatar circle */}
              <View style={[styles.summaryAvatar, { backgroundColor: person.color + (isMe ? 'FF' : 'CC') }]}>
                <Text style={styles.summaryInitial}>{person.initial}</Text>
              </View>

              {/* Name + label */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryPersonName, T.semibold, { color: colors.text }]}>
                  {person.name}
                </Text>
                <Text style={[styles.summaryPersonLabel, T.regular, { color: colors.secondaryText }]}>
                  {isMe
                    ? claimed.size > 0 ? `${claimed.size} item${claimed.size > 1 ? 's' : ''} claimed` : 'Equal share'
                    : 'Equal share'}
                </Text>
              </View>

              {/* Amount */}
              <Text style={[
                styles.summaryPersonAmount,
                T.extrabold,
                { color: isMe ? colors.accent : colors.text },
              ]}>
                ${person.amount.toFixed(2)}
              </Text>
            </View>
          );
        })}

        {/* Total row */}
        <View style={[styles.summaryTotalRow, {
          borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        }]}>
          <Text style={[styles.summaryTotalLabel, T.semibold, { color: colors.secondaryText }]}>
            Receipt Total
          </Text>
          <Text style={[styles.summaryTotalValue, T.extrabold, { color: colors.text }]}>
            ${total.toFixed(2)}
          </Text>
        </View>

        <View style={{ height: vs(130) }} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.84}
          onPress={navigateToGroups}
        >
          <Text style={[styles.ctaBtnText, T.bold]}>Add to Group</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## Change 6 — Add summary styles to StyleSheet

Add these entries inside the existing `StyleSheet.create({...})`:
```tsx
summaryPersonRow: {
  flexDirection: 'row', alignItems: 'center',
  padding: scale(14), borderRadius: ms(16),
  marginBottom: vs(8), gap: scale(12),
  minHeight: scale(56),
},
summaryAvatar: {
  width: scale(44), height: scale(44),
  borderRadius: scale(22),
  alignItems: 'center', justifyContent: 'center',
},
summaryInitial: {
  fontSize: ms(18), fontWeight: '700', color: '#fff',
},
summaryPersonName:   { fontSize: ms(15) },
summaryPersonLabel:  { fontSize: ms(12), opacity: 0.65, marginTop: vs(1) },
summaryPersonAmount: { fontSize: ms(20), letterSpacing: -0.4 },
summaryTotalRow: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  paddingTop: vs(16), borderTopWidth: StyleSheet.hairlineWidth, marginTop: vs(4),
},
summaryTotalLabel: { fontSize: ms(14) },
summaryTotalValue: { fontSize: ms(18), letterSpacing: -0.4 },
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. Scan → People → Items → claim some items → tap "My Share · $X.XX"
2. **Summary screen** appears showing your avatar row (highlighted in accent) + other members' rows each with equal share amount
3. "Your" row shows "X items claimed", others show "Equal share"
4. "Receipt Total" at the bottom matches the sum
5. Tap "Add to Group" → modal dismisses and lands on the Groups tab (no navigator error)
6. Back arrow on summary goes back to the items screen
