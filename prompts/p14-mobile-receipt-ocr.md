# Mobile — Wire ReceiptScanScreen to Real OCR API

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 25 (Mobile Navigation & Notifications), 16 (UI Primitive Components), 37 (Mobile Theme System).

Replace all hardcoded mock data in `ReceiptScanScreen.tsx` with live data from the `/api/receipts/parse` endpoint. Also add the API types to `api.ts`.

---

## Files to modify

- `mobile/src/services/api.ts`
- `mobile/src/screens/ReceiptScanScreen.tsx`

---

## Change 1 — Add types + API method to `api.ts`

Add before the closing of the file (after `friendsApi`):

```typescript
// --- Receipts ---
export interface ParsedReceiptItem {
  id: string;
  name: string;
  price: number;
}

export interface ReceiptParseResponse {
  items: ParsedReceiptItem[];
  subtotal: number;
  tax: number;
  tax_rate: number;
  tip_detected: number;
  total: number;
  currency: string;
}

export const receiptsApi = {
  parse: (imageBase64: string) =>
    request<ReceiptParseResponse>('/receipts/parse', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),
};
```

---

## Change 2 — Remove mock constants from `ReceiptScanScreen.tsx`

Delete these lines entirely from the top of the file:
```tsx
const MOCK_ITEMS = [
  { id: '1', name: 'Butter Chicken',   price: 19.50 },
  { id: '2', name: 'Garlic Naan (×2)', price: 8.00  },
  { id: '3', name: 'Mango Lassi',      price: 6.50  },
  { id: '4', name: 'Palak Paneer',     price: 16.00 },
  { id: '5', name: 'Samosa Platter',   price: 9.50  },
];
const SUBTOTAL = MOCK_ITEMS.reduce((s, i) => s + i.price, 0);
const TAX_RATE = 0.13;
const TAX      = parseFloat((SUBTOTAL * TAX_RATE).toFixed(2));
```

---

## Change 3 — Add import for receiptsApi

Add `receiptsApi, ParsedReceiptItem` to the existing `api` import line:
```tsx
import { friendsApi, Friend, receiptsApi, ParsedReceiptItem } from '../services/api';
```

---

## Change 4 — Replace hardcoded item anims with dynamic pre-allocation

The item entrance and checkbox animations are currently sized to `MOCK_ITEMS`. Replace them with a max-size pre-allocation so they work for any number of items from the API.

Replace:
```tsx
  // Stagger entrance for items
  const itemAnims = useRef(MOCK_ITEMS.map(() => ({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(vs(14)),
  }))).current;

  // Per-item spring scale for checkbox
  const checkAnims = useRef(
    Object.fromEntries(MOCK_ITEMS.map(i => [i.id, new Animated.Value(0)]))
  ).current;
```

With:
```tsx
  // Pre-allocate for up to 30 receipt items
  const MAX_ITEMS = 30;
  const itemAnims = useRef(
    Array.from({ length: MAX_ITEMS }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(vs(14)),
    }))
  ).current;

  // Keyed by item index string (0..MAX_ITEMS-1)
  const checkAnims = useRef(
    Object.fromEntries(
      Array.from({ length: MAX_ITEMS }, (_, i) => [String(i), new Animated.Value(0)])
    )
  ).current;
```

---

## Change 5 — Add receipt state

Add these state variables alongside the other `useState` calls at the top of the component:

```tsx
const [items, setItems]           = useState<ParsedReceiptItem[]>([]);
const [subtotal, setSubtotal]     = useState(0);
const [tax, setTax]               = useState(0);
const [taxRate, setTaxRate]       = useState(0.13);
const [tipDetected, setTipDetected] = useState(0);
const [parseError, setParseError] = useState<string | null>(null);
```

---

## Change 6 — Update `handleOpenCamera` to call the real API

Replace the existing `handleOpenCamera` function entirely:

```tsx
const handleOpenCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Camera Access', 'TandemPay needs camera access to scan receipts. Enable it in Settings.');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    base64: true,         // ← request base64 so we can send to backend
  });
  if (result.canceled || !result.assets?.[0]) return;

  const asset = result.assets[0];
  if (!asset.base64) {
    Alert.alert('Error', 'Could not read image data. Please try again.');
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setParseError(null);
  setPhase('parsing');

  // Start parsing animations
  pulseLoop.current = Animated.loop(Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
    Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
  ]));
  scanLoop.current = Animated.loop(Animated.sequence([
    Animated.timing(scanLineY, { toValue: 1, duration: 1500, useNativeDriver: false }),
    Animated.timing(scanLineY, { toValue: 0, duration: 0,    useNativeDriver: false }),
  ]));
  pulseLoop.current.start();
  scanLoop.current.start();

  try {
    const parsed = await receiptsApi.parse(asset.base64);

    pulseLoop.current?.stop();
    scanLoop.current?.stop();

    // Populate state from API response
    setItems(parsed.items);
    setSubtotal(parsed.subtotal);
    setTax(parsed.tax);
    setTaxRate(parsed.tax_rate);
    // Pre-fill tip if the receipt already had one
    if (parsed.tip_detected > 0) {
      setTipAmount(parsed.tip_detected.toFixed(2));
      setTipActive(true);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('people');

  } catch (err: any) {
    pulseLoop.current?.stop();
    scanLoop.current?.stop();

    const msg = err?.message || 'Could not read this receipt. Try a clearer photo.';
    setParseError(msg);
    setPhase('idle');
    Alert.alert('Scan Failed', msg);
  }
};
```

---

## Change 7 — Replace all `MOCK_ITEMS` / `SUBTOTAL` / `TAX` / `TAX_RATE` references

After the state changes above, every remaining reference to the old constants needs to point to state.

**In the calculations section**, replace:
```tsx
const tip        = parseFloat(tipAmount) || 0;
const total      = parseFloat((SUBTOTAL + TAX + tip).toFixed(2));
const splitCount = included.size;
const myFood     = MOCK_ITEMS.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
const myFraction = SUBTOTAL > 0 ? myFood / SUBTOTAL : 0;
const myShare    = parseFloat((myFood + TAX * myFraction + (tip > 0 ? tip / splitCount : 0)).toFixed(2));
const hasClaim   = claimed.size > 0;
```

With:
```tsx
const tip        = parseFloat(tipAmount) || 0;
const total      = parseFloat((subtotal + tax + tip).toFixed(2));
const splitCount = included.size;
const myFood     = items.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
const myFraction = subtotal > 0 ? myFood / subtotal : 0;
const myShare    = parseFloat((myFood + tax * myFraction + (tip > 0 ? tip / splitCount : 0)).toFixed(2));
const hasClaim   = claimed.size > 0;
const evenSplit  = parseFloat((total / Math.max(splitCount, 1)).toFixed(2));
```

(Remove the standalone `const evenSplit = ...` line that was already there — it's now part of this block.)

**In the people picker**, replace `SUBTOTAL + TAX` with `subtotal + tax`:
```tsx
{included.size} people · ~${((subtotal + tax) / included.size).toFixed(2)} each before items
```

**In the items phase**, replace all `MOCK_ITEMS.map(...)` and `MOCK_ITEMS.filter(...)` with `items.map(...)` and `items.filter(...)`.

Also update the `itemAnims` entrance animation to use `items.length` instead of `MOCK_ITEMS.length`:
```tsx
if (phase === 'items') {
  const anims = items.flatMap(({ opacity, translateY }, i) =>  // ← wrong, itemAnims is indexed by position
```

Wait — the `itemAnims` is indexed by position, not by item. Fix the animation trigger:
```tsx
if (phase === 'items') {
  const count = Math.min(items.length, MAX_ITEMS);
  const anims = itemAnims.slice(0, count).flatMap(({ opacity, translateY }, i) => [
    Animated.timing(opacity,    { toValue: 1, duration: 200, delay: i * 40, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: 0, duration: 200, delay: i * 40, useNativeDriver: true }),
  ]);
  Animated.parallel(anims).start();
}
```

**In the items render**, update each item's animation and checkbox lookup to use index:
```tsx
{items.map((item, idx) => {
  const isClaimed  = claimed.has(item.id);
  const animKey    = String(idx);                  // ← use index, not item.id
  const checkScale = checkAnims[animKey].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View key={item.id} style={{
      opacity:   itemAnims[idx]?.opacity    ?? new Animated.Value(1),
      transform: [{ translateY: itemAnims[idx]?.translateY ?? new Animated.Value(0) }],
    }}>
      ...
    </Animated.View>
  );
})}
```

And in `toggleClaim`, update the checkAnim key from `id` to index:
```tsx
const toggleClaim = (id: string) => {
  Haptics.selectionAsync();
  const idx = items.findIndex(i => i.id === id);
  const animKey = String(idx);
  setClaimed(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
      Animated.spring(checkAnims[animKey], { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 280 }).start();
    } else {
      next.add(id);
      Animated.spring(checkAnims[animKey], { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }).start();
    }
    return next;
  });
};
```

**In the summary rows**, replace `SUBTOTAL.toFixed(2)` with `subtotal.toFixed(2)` and `TAX.toFixed(2)` with `tax.toFixed(2)` and `(TAX_RATE * 100).toFixed(0)` with `(taxRate * 100).toFixed(0)`.

**Empty state**: Add this at the top of the items phase render, before mapping items, to handle the case where OCR returned 0 items:
```tsx
{items.length === 0 && (
  <View style={{ alignItems: 'center', paddingVertical: vs(40), gap: vs(12) }}>
    <Text style={[{ fontSize: ms(15), color: colors.secondaryText, textAlign: 'center' }, T.regular]}>
      No items were detected.{'\n'}Try scanning again with better lighting.
    </Text>
    <TouchableOpacity onPress={() => setPhase('idle')}>
      <Text style={[{ color: colors.accent, fontSize: ms(14) }, T.semibold]}>Scan Again</Text>
    </TouchableOpacity>
  </View>
)}
```

---

## Verification

Run `cd mobile && npx tsc --noEmit`. Expect zero errors.

Test on device (requires p13 deployed to Vercel first):
1. Open camera → take photo of a real receipt
2. Parsing animation plays while API call is in-flight (~2-5 seconds)
3. People picker appears — then items screen shows the real items from the receipt
4. Tax row shows the actual scanned tax amount and rate
5. If tip was on the receipt, the tip field is pre-filled
6. If scan fails (bad lighting, etc.), returns to idle with an error alert
