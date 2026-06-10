import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ArrowLeft, Check, ReceiptText, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

// ── Mock receipt data ─────────────────────────────────────────────────────────
const MOCK_ITEMS = [
  { id: '1', name: 'Chicken Tikka Masala', price: 18.50 },
  { id: '2', name: 'Garlic Naan (×2)',     price: 8.00  },
  { id: '3', name: 'Mango Lassi',          price: 6.50  },
  { id: '4', name: 'Palak Paneer',         price: 16.00 },
  { id: '5', name: 'Samosa Platter',       price: 9.50  },
];
const SUBTOTAL = MOCK_ITEMS.reduce((s, i) => s + i.price, 0);
const TAX      = parseFloat((SUBTOTAL * 0.13).toFixed(2));
const TIP      = parseFloat((SUBTOTAL * 0.15).toFixed(2));
const TOTAL    = parseFloat((SUBTOTAL + TAX + TIP).toFixed(2));
const GROUP_SIZE = 3; // mock group size for split calc

type Phase = 'idle' | 'parsing' | 'results';

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [phase, setPhase]                   = useState<Phase>('idle');
  const [claimed, setClaimed]               = useState<Set<string>>(new Set());
  const [splitRemainder, setSplitRemainder] = useState(true);

  // Parsing animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineY = useRef(new Animated.Value(0)).current;

  // Stagger entrance for results items
  const itemAnims = useRef(MOCK_ITEMS.map(() => ({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(vs(16)),
  }))).current;

  // Per-item checkbox scale anims
  const checkAnims = useRef(
    Object.fromEntries(MOCK_ITEMS.map(i => [i.id, new Animated.Value(0)]))
  ).current;

  // Run stagger when results phase begins
  useEffect(() => {
    if (phase !== 'results') return;
    const animations = itemAnims.flatMap(({ opacity, translateY }, idx) => [
      Animated.timing(opacity,    { toValue: 1, duration: 220, delay: idx * 45, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, delay: idx * 45, useNativeDriver: true }),
    ]);
    Animated.parallel(animations).start();
  }, [phase]);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'TandemPay needs camera access to scan receipts. Enable it in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('parsing');

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(scanLineY, { toValue: 0, duration: 0,    useNativeDriver: false }),
      ])
    ).start();

    setTimeout(() => {
      pulseAnim.stopAnimation();
      scanLineY.stopAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('results');
    }, 2500);
  };

  // ── Claim toggle ────────────────────────────────────────────────────────────
  const toggleClaim = (id: string) => {
    Haptics.selectionAsync();
    const next = new Set(claimed);
    if (next.has(id)) {
      next.delete(id);
      Animated.spring(checkAnims[id], {
        toValue: 0, useNativeDriver: true, damping: 18, stiffness: 260,
      }).start();
    } else {
      next.add(id);
      Animated.spring(checkAnims[id], {
        toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260,
      }).start();
    }
    setClaimed(next);
  };

  // ── Share calculation ────────────────────────────────────────────────────────
  const myItemsTotal   = MOCK_ITEMS.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
  const unclaimedItems = MOCK_ITEMS.filter(i => !claimed.has(i.id));
  const unclaimedTotal = unclaimedItems.reduce((s, i) => s + i.price, 0);
  const splitShare     = splitRemainder ? unclaimedTotal / GROUP_SIZE : 0;
  const myFoodTotal    = myItemsTotal + splitShare;
  const myFraction     = SUBTOTAL > 0 ? myFoodTotal / SUBTOTAL : 0;
  const myShare        = parseFloat((myFoodTotal + TAX * myFraction + TIP * myFraction).toFixed(2));

  const scanLineTop = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '90%'],
  });

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.idleBody}>
          <LinearGradient
            colors={isDark
              ? ['rgba(16,185,129,0.22)', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0)']
              : ['rgba(16,185,129,0.16)', 'rgba(16,185,129,0.05)', 'rgba(16,185,129,0)']}
            style={styles.iconGlow}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.14)' }]}>
              <Camera size={42} color="#10B981" strokeWidth={1.6} />
            </View>
          </LinearGradient>

          <Text style={[styles.idleTitle, T.extrabold, { color: colors.text }]}>
            Scan a Receipt
          </Text>
          <Text style={[styles.idleSubtitle, T.regular, { color: colors.secondaryText }]}>
            Take a photo and each roommate taps what's theirs. Tax and tip are split automatically.
          </Text>

          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: '#10B981' }]}
            activeOpacity={0.82}
            onPress={handleOpenCamera}
          >
            <Camera size={19} color="#fff" strokeWidth={2.2} />
            <Text style={[styles.cameraBtnText, T.bold]}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Parsing ────────────────────────────────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.parsingBody}>
          <Animated.View
            style={[
              styles.receiptMock,
              {
                borderColor: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.45)',
                backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <ReceiptText size={56} color="#10B981" strokeWidth={1.2} />
            <Animated.View style={[styles.scanLine, { top: scanLineTop }]} />
          </Animated.View>

          <Text style={[styles.parsingTitle, T.bold, { color: colors.text, marginTop: vs(28) }]}>
            Reading receipt…
          </Text>
          <Text style={[styles.parsingSub, T.regular, { color: colors.secondaryText, marginTop: vs(6) }]}>
            Identifying items, tax & tip
          </Text>
          <ActivityIndicator color="#10B981" size="small" style={{ marginTop: vs(20) }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.resultsHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { setPhase('idle'); setClaimed(new Set()); }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultsTitle, T.extrabold, { color: colors.text }]}>Your Receipt</Text>
          <Text style={[styles.resultsSub, T.regular, { color: colors.secondaryText }]}>
            Tap the items you ordered
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.rescanChip, { borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)' }]}
          onPress={() => { setPhase('idle'); setClaimed(new Set()); }}
        >
          <Text style={[styles.rescanText, T.semibold, { color: colors.secondaryText }]}>Rescan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Items label */}
        <Text style={[styles.sectionLabel, { color: colors.tertiaryText }]}>ITEMS</Text>

        {MOCK_ITEMS.map((item, idx) => {
          const isClaimed = claimed.has(item.id);
          const checkScale = checkAnims[item.id].interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
          });

          return (
            <Animated.View
              key={item.id}
              style={{
                opacity:   itemAnims[idx].opacity,
                transform: [{ translateY: itemAnims[idx].translateY }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: isClaimed
                      ? colors.accent + '50'
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    borderWidth: isClaimed ? 1.5 : StyleSheet.hairlineWidth,
                    shadowColor: isClaimed ? colors.accent : '#000',
                    shadowOpacity: isClaimed ? (isDark ? 0.18 : 0.10) : (isDark ? 0.14 : 0.06),
                  },
                ]}
                activeOpacity={0.78}
                onPress={() => toggleClaim(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.itemName,
                    T.semibold,
                    { color: isClaimed ? colors.accent : colors.text },
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemPrice, T.regular, { color: colors.secondaryText }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>

                {/* Circular checkbox */}
                <Animated.View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isClaimed ? colors.accent : 'transparent',
                      borderColor: isClaimed ? colors.accent : (isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.18)'),
                      transform: [{ scale: isClaimed ? checkScale : new Animated.Value(1) }],
                    },
                  ]}
                >
                  {isClaimed && <Check size={14} color="#fff" strokeWidth={2.8} />}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Split remainder toggle */}
        <View style={[
          styles.splitToggleRow,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}>
          <View style={[styles.splitIconBox, { backgroundColor: 'rgba(99,102,241,0.14)' }]}>
            <Users size={18} color="#6366F1" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.splitTitle, T.semibold, { color: colors.text }]}>
              Split unclaimed items
            </Text>
            <Text style={[styles.splitSub, T.regular, { color: colors.secondaryText }]}>
              Divide equally between {GROUP_SIZE} people
            </Text>
          </View>
          <Switch
            value={splitRemainder}
            onValueChange={v => { Haptics.selectionAsync(); setSplitRemainder(v); }}
            trackColor={{ false: isDark ? '#2A2A2E' : '#E2E8F0', true: colors.accent + 'AA' }}
            thumbColor={splitRemainder ? colors.accent : (isDark ? '#6B7280' : '#CBD5E1')}
            ios_backgroundColor={isDark ? '#2A2A2E' : '#E2E8F0'}
          />
        </View>

        {/* Totals */}
        <Text style={[styles.sectionLabel, { color: colors.tertiaryText, marginTop: vs(24) }]}>SUMMARY</Text>

        <View style={[
          styles.totalsCard,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}>
          {[
            { label: 'Subtotal',   value: `$${SUBTOTAL.toFixed(2)}` },
            { label: 'Tax (13%)',  value: `$${TAX.toFixed(2)}`      },
            { label: 'Tip (15%)', value: `$${TIP.toFixed(2)}`       },
          ].map(row => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={[styles.totalLabel, T.regular, { color: colors.secondaryText }]}>{row.label}</Text>
              <Text style={[styles.totalValue, T.regular, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, T.bold, { color: colors.text, fontSize: ms(15) }]}>Total</Text>
            <Text style={[styles.totalValue, T.extrabold, { color: colors.text, fontSize: ms(17) }]}>${TOTAL.toFixed(2)}</Text>
          </View>
        </View>

        {/* Your share hero */}
        {(claimed.size > 0 || splitRemainder) && (
          <LinearGradient
            colors={isDark
              ? [colors.accent + '20', colors.accent + '08']
              : [colors.accent + '14', colors.accent + '05']}
            style={[styles.shareHero, { borderColor: colors.accent + '30' }]}
          >
            <Text style={[styles.shareLabel, T.semibold, { color: colors.accent }]}>
              YOUR ESTIMATED SHARE
            </Text>
            <Text style={[styles.shareAmount, T.extrabold, { color: colors.accent }]}>
              ${myShare.toFixed(2)}
            </Text>
          </LinearGradient>
        )}

        <View style={{ height: vs(120) }} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            {
              backgroundColor: colors.accent,
              opacity: (claimed.size === 0 && !splitRemainder) ? 0.38 : 1,
            },
          ]}
          activeOpacity={0.84}
          disabled={claimed.size === 0 && !splitRemainder}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate('Groups');
          }}
        >
          <Text style={[styles.ctaBtnText, T.bold]}>Add to Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { padding: scale(16), alignSelf: 'flex-start' },

  // ── Idle
  idleBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(36), gap: vs(14), marginTop: -vs(44),
  },
  iconGlow: {
    width: scale(180), height: scale(180), borderRadius: scale(90),
    alignItems: 'center', justifyContent: 'center', marginBottom: vs(4),
  },
  iconCircle: {
    width: scale(88), height: scale(88), borderRadius: scale(44),
    alignItems: 'center', justifyContent: 'center',
  },
  idleTitle:    { fontSize: ms(28), textAlign: 'center', letterSpacing: -0.5 },
  idleSubtitle: { fontSize: ms(15), textAlign: 'center', lineHeight: 22, opacity: 0.75 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingVertical: vs(15), paddingHorizontal: scale(36),
    borderRadius: ms(16), marginTop: vs(8),
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 12, elevation: 4,
  },
  cameraBtnText: { fontSize: ms(16), color: '#fff' },

  // ── Parsing
  parsingBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  receiptMock: {
    width: scale(148), height: scale(188),
    borderRadius: ms(16), borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: '#10B981', opacity: 0.75,
  },
  parsingTitle: { fontSize: ms(19), letterSpacing: -0.3 },
  parsingSub:   { fontSize: ms(14), opacity: 0.65 },

  // ── Results
  resultsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: scale(20), paddingBottom: vs(4),
  },
  resultsTitle: { fontSize: ms(22), letterSpacing: -0.4 },
  resultsSub:   { fontSize: ms(13), opacity: 0.65, marginTop: vs(1) },
  rescanChip: {
    paddingHorizontal: scale(12), paddingVertical: vs(6),
    borderRadius: ms(10), borderWidth: StyleSheet.hairlineWidth,
  },
  rescanText: { fontSize: ms(13) },

  scrollContent: { paddingHorizontal: scale(20), paddingTop: vs(4) },

  sectionLabel: {
    fontSize: ms(11), letterSpacing: 0.8,
    marginBottom: vs(10), marginTop: vs(4),
  },

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingVertical: vs(14),
    borderRadius: ms(16),
    marginBottom: vs(8),
    minHeight: scale(52),
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  itemName:  { fontSize: ms(15), marginBottom: vs(2) },
  itemPrice: { fontSize: ms(13) },
  checkbox: {
    width: scale(26), height: scale(26), borderRadius: scale(13),
    borderWidth: 1.8, alignItems: 'center', justifyContent: 'center',
  },

  splitToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: scale(14), borderRadius: ms(16),
    borderWidth: StyleSheet.hairlineWidth,
    gap: scale(12), marginTop: vs(4),
    minHeight: scale(52),
  },
  splitIconBox: {
    width: scale(36), height: scale(36), borderRadius: ms(10),
    alignItems: 'center', justifyContent: 'center',
  },
  splitTitle: { fontSize: ms(14) },
  splitSub:   { fontSize: ms(12), opacity: 0.65, marginTop: vs(1) },

  totalsCard: {
    borderRadius: ms(20), borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: scale(16), paddingVertical: vs(14),
    gap: vs(10),
  },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: ms(14) },
  totalValue: { fontSize: ms(14) },
  divider:    { height: StyleSheet.hairlineWidth, marginVertical: vs(2) },

  shareHero: {
    borderRadius: ms(20), borderWidth: 1,
    alignItems: 'center', paddingVertical: vs(20),
    marginTop: vs(14), gap: vs(4),
  },
  shareLabel:  { fontSize: ms(11), letterSpacing: 0.8 },
  shareAmount: { fontSize: ms(36), letterSpacing: -1 },

  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: scale(20), paddingBottom: vs(36), paddingTop: vs(12),
  },
  ctaBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(16), borderRadius: ms(16),
  },
  ctaBtnText: { fontSize: ms(16), color: '#fff' },
});
