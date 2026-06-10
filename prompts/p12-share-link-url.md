# Fix Share Button — encode URL + message for full iOS share sheet

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components).

**Problem**: `Share.share({ message })` with no `url` shows a minimal iOS sheet. iOS's activity controller only surfaces the full app list (Messages, WhatsApp, Mail, etc.) when a `url` is present.

**Fix**: Encode payment info as base64 into a `https://tandempay.ca/pay?r=BASE64` URL. Pass both `url` and `message` to `Share.share`. iOS then shows the complete share sheet.

---

## File to modify

`mobile/src/screens/ReceiptScanScreen.tsx`

---

## Change — Replace `handleShareLink` body

Find this function (at component level, above `scanTop`):

```tsx
const handleShareLink = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const payerName  = payerMember?.id === 'me' ? (user?.character_nickname || 'Me') : (payerMember?.name ?? 'Someone');
  const payerEmail = payerMember?.email ?? '';
  const msg = `Hey! Here's your share of the bill:\n\n💰 Amount: $${myShare.toFixed(2)}\n📋 For: Receipt Split\n\n${payerEmail ? `Send via Interac e-Transfer to:\n${payerEmail}` : `Pay ${payerName} $${myShare.toFixed(2)}`}\n\n— Sent via TandemPay`;
  Share.share({ message: msg }).catch(() => {
    Alert.alert('Share Payment Request', msg);
  });
};
```

Replace its body only (keep the function signature):

```tsx
const handleShareLink = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const payerName  = payerMember?.id === 'me' ? (user?.character_nickname || 'Me') : (payerMember?.name ?? 'Someone');
  const payerEmail = payerMember?.email ?? '';

  // Encode payment context into URL so iOS shows the full share sheet
  const payload = {
    a: myShare.toFixed(2),      // amount
    p: payerName,               // payer name
    e: payerEmail,              // payer interac email
    d: 'Receipt Split',         // description
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const shareUrl = `https://tandempay.ca/pay?r=${encoded}`;

  const message = payerEmail
    ? `Pay ${payerName} $${myShare.toFixed(2)} via Interac e-Transfer to: ${payerEmail}`
    : `You owe ${payerName} $${myShare.toFixed(2)} for a receipt split.`;

  Share.share(
    { message, url: shareUrl },
    { dialogTitle: `Pay ${payerName} $${myShare.toFixed(2)}` },
  ).catch(() => {
    // Fallback: show inline alert with the key info
    Alert.alert(
      `Pay ${payerName} · $${myShare.toFixed(2)}`,
      payerEmail
        ? `Send $${myShare.toFixed(2)} via Interac e-Transfer to:\n\n${payerEmail}`
        : `You owe ${payerName} $${myShare.toFixed(2)}.`,
      [{ text: 'OK' }],
    );
  });
};
```

No other changes to the file.

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device:
1. Scan receipt → select items → tap "Share" button
2. **iOS**: full activity controller appears — Messages, WhatsApp, Mail, Copy, etc. all visible
3. **Android**: share chooser shows with the message text
4. Tapping Messages pre-fills with the short message + link
5. If dismissed, no crash
