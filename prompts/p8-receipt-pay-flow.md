# Receipt Scan — Pay Flow (Apple/Google Pay, no database records)

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

Two files change. The goal: after claiming items, the user pays their share directly via Apple Pay / Google Pay. Zero TandemPay database records — the receipt is ephemeral.

---

## Files to modify

- `mobile/src/screens/ReceiptScanScreen.tsx`
- `mobile/src/screens/SettleUpScreen.tsx`

---

## ReceiptScanScreen.tsx — 3 changes

### Change 1 — Add `payer` state

Add alongside the other `useState` calls at the top of the component:
```tsx
// Default payer = first non-me member; user can change this in the people picker
const [payerId, setPayerId] = useState<string>(MOCK_MEMBERS[0].id);
```

### Change 2 — Redesign the people picker phase

The people picker now has two sections:
1. **"Who paid the bill?"** — single selection, one person is the payer (they fronted the cash)
2. **"Who's splitting it?"** — multi-select, everyone being asked to chip in

Replace the entire `if (phase === 'people')` block with:

```tsx
if (phase === 'people') {
  const allMembers = [
    { id: 'me', name: user?.character_nickname || 'You', initial: (user?.character_nickname?.[0] || 'Y').toUpperCase(), color: user?.character_color || colors.accent },
    ...MOCK_MEMBERS,
  ];

  const payer = allMembers.find(m => m.id === payerId) ?? allMembers[1] ?? allMembers[0];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>

      <Animated.View style={[
        styles.peopleBody,
        { opacity: peopleAnim, transform: [{ translateY: peopleAnim.interpolate({ inputRange: [0, 1], outputRange: [vs(20), 0] }) }] },
      ]}>

        {/* WHO PAID */}
        <Text style={[styles.peopleTitle, T.extrabold, { color: colors.text }]}>Who paid the bill?</Text>
        <Text style={[styles.peopleSub, T.regular, { color: colors.secondaryText }]}>
          Everyone else will pay them back
        </Text>

        <View style={[styles.memberGrid, { marginBottom: vs(28) }]}>
          {allMembers.map(m => {
            const isPayer = m.id === payerId;
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.memberItem}
                activeOpacity={0.75}
                onPress={() => { Haptics.selectionAsync(); setPayerId(m.id); }}
              >
                <View style={[
                  styles.memberAvatar,
                  {
                    backgroundColor: m.color + (isPayer ? 'FF' : '30'),
                    borderWidth: isPayer ? 2.5 : 0,
                    borderColor: m.color,
                  },
                ]}>
                  <Text style={[styles.memberInitial, { color: isPayer ? '#fff' : m.color + '99' }]}>
                    {m.initial}
                  </Text>
                  {isPayer && (
                    <View style={[styles.memberCheckmark, { backgroundColor: m.color }]}>
                      <Text style={{ fontSize: 9 }}>💳</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.memberName, T.semibold, { color: isPayer ? colors.text : colors.tertiaryText }]} numberOfLines={1}>
                  {m.id === 'me' ? 'Me' : m.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* DIVIDER */}
        <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

        {/* WHO'S SPLITTING */}
        <Text style={[styles.peopleSplitLabel, T.extrabold, { color: colors.text, marginTop: vs(20) }]}>
          Who's splitting it?
        </Text>
        <Text style={[styles.peopleSub, T.regular, { color: colors.secondaryText }]}>
          Tap to include or remove people
        </Text>

        <View style={[styles.memberGrid, { marginTop: vs(16) }]}>
          {allMembers.map(m => {
            const isIn  = included.has(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.memberItem}
                activeOpacity={0.75}
                onPress={() => toggleMember(m.id)}
              >
                <View style={[
                  styles.memberAvatar,
                  {
                    backgroundColor: m.color + (isIn ? 'FF' : '30'),
                    borderWidth: isIn ? 2.5 : 0,
                    borderColor: m.color,
                  },
                ]}>
                  <Text style={[styles.memberInitial, { color: isIn ? '#fff' : m.color + '99' }]}>
                    {m.initial}
                  </Text>
                  {isIn && (
                    <View style={[styles.memberCheckmark, { backgroundColor: m.color }]}>
                      <Check size={9} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.memberName, T.semibold, { color: isIn ? colors.text : colors.tertiaryText }]} numberOfLines={1}>
                  {m.id === 'me' ? 'Me' : m.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live split preview */}
        <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', marginTop: vs(16) }]}>
          <Text style={[styles.countText, T.semibold, { color: colors.secondaryText }]}>
            {included.size} people · ~${((SUBTOTAL + TAX) / included.size).toFixed(2)} each before items
          </Text>
        </View>
      </Animated.View>

      <View style={[styles.ctaBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.84}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase('items'); }}
        >
          <Text style={[styles.ctaBtnText, T.bold]}>Choose My Items</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

Add the missing style `sectionDivider` and `peopleSplitLabel` to the StyleSheet:
```tsx
sectionDivider:    { height: StyleSheet.hairlineWidth, marginHorizontal: -scale(4) },
peopleSplitLabel:  { fontSize: ms(22), letterSpacing: -0.4 },
```

### Change 3 — Update the summary CTA to go to SettleUpScreen

In the `if (phase === 'summary')` block, find the `navigateToGroups` call and replace the CTA `TouchableOpacity`:

```tsx
// Build the payment object from the receipt data
const allMembersForSummary = [
  { id: 'me', name: user?.character_nickname || 'You', initial: (user?.character_nickname?.[0] || 'Y').toUpperCase(), color: user?.character_color || colors.accent },
  ...MOCK_MEMBERS,
];
const payerMember = allMembersForSummary.find(m => m.id === payerId) ?? allMembersForSummary[0];

// CTA button:
<TouchableOpacity
  style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
  activeOpacity={0.84}
  onPress={() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('SettleUp', {
      payment: {
        amount: myShare,
        description: 'Receipt Split',
        payee_name: payerMember.id === 'me' ? (user?.character_nickname || 'You') : payerMember.name,
        payee_id: payerMember.id === 'me' ? null : payerMember.id,
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
```

---

## SettleUpScreen.tsx — 2 changes

### Change 1 — Read `isReceiptPayment` from route params

In SettleUpScreen, after `const { payment } = route.params;` add:
```tsx
const isReceiptPayment: boolean = payment.isReceiptPayment === true;
```

### Change 2 — Skip settlement creation for receipt payments

In `handleSend`, wrap the settlement-related API calls in `if (!isReceiptPayment)` guards:

**Interac branch** — replace the existing interac block with:
```tsx
if (m === 'interac') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (!isReceiptPayment) {
    // Normal group flow: create + update settlement record
    let settlementId: string | null = payment.id ?? null;
    if (!settlementId) {
      const created = await settlementsApi.create(payment.group_id, payment.payee_id, amount, 'etransfer');
      settlementId = (created as any)?.id ?? null;
      if (!settlementId) {
        const all = await meApi.getPayments();
        const rec = (all as Array<{ payer_id: string; payee_id: string; status: string; id: string }>)
          .find(r => r.payer_id === payment.payer_id && r.payee_id === payment.payee_id && r.status === 'pending');
        settlementId = rec?.id ?? null;
      }
    }
    if (settlementId) await settlementsApi.updateStatus(payment.group_id, settlementId, 'sent');
  }
  // Receipt payment: just mark as sent locally — no backend record
  setMethod('interac');
  setView('sent');
}
```

**Card branch** — replace the `createPaymentIntent` call with:
```tsx
} else if (m === 'card') {
  const { client_secret } = await paymentsApi.createPaymentIntent({
    payee_id: payment.payee_id,
    amount: Math.round(amount * 100),
    // Omit settlement_id for receipt payments — no record created
    ...(isReceiptPayment ? {} : { settlement_id: payment.id }),
  });
  const { error: initError } = await initPaymentSheet({
    paymentIntentClientSecret: client_secret,
    merchantDisplayName: 'TandemPay',
    applePay: { merchantCountryCode: 'CA' },
    googlePay: { merchantCountryCode: 'CA', testEnv: true },
  });
  if (initError) { setLoading(false); Alert.alert('Payment Error', initError.message); return; }
  const { error: presentError } = await presentPaymentSheet();
  if (!presentError) {
    setMethod('card');
    setView('sent');
  } else if (presentError.code !== 'Canceled') {
    Alert.alert('Payment Failed', presentError.message);
  }
}
```

**Manual branch** — wrap in `if (!isReceiptPayment)` so it doesn't try to call `settlementsApi.updateStatus` with null IDs:
```tsx
} else {
  if (!isReceiptPayment && payment.group_id && payment.id) {
    await settlementsApi.updateStatus(payment.group_id, payment.id, 'settled');
  }
  navigation.goBack();
}
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. Scan → parsing → **People picker**: top section "Who paid?" — tap different avatars, card icon (💳) moves to the selected payer. Bottom section "Who's splitting?" — tap to include/exclude.
2. Items → claim items → "My Share · $X.XX" CTA
3. Summary → "Pay [PayerName] · $X.XX" CTA
4. **SettleUpScreen opens** pre-loaded with the receipt amount and payer name
5. Tap "Pay by Card" → Apple Pay / Google Pay sheet appears (payment may fail in dev — that's expected without a real payee Stripe account)
6. Tap "Send Interac" → shows the 'sent' confirmation state with no API errors (no settlement created)
7. Confirm nothing is saved to the TandemPay database after the flow (check network requests — no `/settlements` POST should fire for receipt payments)
