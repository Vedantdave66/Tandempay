import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ArrowLeft, CheckCircle2, Users, User, ChevronRight, ReceiptText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

// ── Mock receipt data (replace with real API response later) ──────────────────
const MOCK_ITEMS = [
  { id: '1', name: 'Chicken Tikka Masala', price: 18.50 },
  { id: '2', name: 'Garlic Naan (×2)',     price: 8.00  },
  { id: '3', name: 'Mango Lassi',          price: 6.50  },
  { id: '4', name: 'Palak Paneer',         price: 16.00 },
  { id: '5', name: 'Samosa Platter',       price: 9.50  },
];
const MOCK_SUBTOTAL = MOCK_ITEMS.reduce((s, i) => s + i.price, 0);
const MOCK_TAX      = parseFloat((MOCK_SUBTOTAL * 0.13).toFixed(2));
const MOCK_TIP      = parseFloat((MOCK_SUBTOTAL * 0.15).toFixed(2));
const MOCK_TOTAL    = parseFloat((MOCK_SUBTOTAL + MOCK_TAX + MOCK_TIP).toFixed(2));

type ClaimMode = 'mine' | 'shared' | 'none';

type Phase = 'idle' | 'parsing' | 'results';

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [phase, setPhase] = useState<Phase>('idle');
  const [claims, setClaims] = useState<Record<string, ClaimMode>>({});

  // Scanning pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineY  = useRef(new Animated.Value(0)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(scanLineY, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'TandemPay needs camera access to scan receipts. Enable it in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: false,
    });

    if (result.canceled) return;

    // Start "parsing" phase with mock delay
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('parsing');
    startPulse();

    // Simulate OCR processing (replace with real API call later)
    setTimeout(() => {
      pulseAnim.stopAnimation();
      scanLineY.stopAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('results');
    }, 2500);
  };

  const toggleClaim = (id: string) => {
    Haptics.selectionAsync();
    setClaims(prev => {
      const current = prev[id] ?? 'none';
      const next: ClaimMode =
        current === 'none'   ? 'mine'   :
        current === 'mine'   ? 'shared' : 'none';
      return { ...prev, [id]: next };
    });
  };

  const claimColor = (mode: ClaimMode) => {
    if (mode === 'mine')   return colors.accent;
    if (mode === 'shared') return '#6366F1';
    return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  };

  const claimLabel = (mode: ClaimMode) => {
    if (mode === 'mine')   return 'Mine';
    if (mode === 'shared') return 'Shared';
    return 'Tap';
  };

  const claimIcon = (mode: ClaimMode) => {
    if (mode === 'mine')   return <User   size={13} color="#fff" />;
    if (mode === 'shared') return <Users  size={13} color="#fff" />;
    return null;
  };

  const myItems     = MOCK_ITEMS.filter(i => (claims[i.id] ?? 'none') === 'mine');
  const sharedItems = MOCK_ITEMS.filter(i => (claims[i.id] ?? 'none') === 'shared');
  const myTotal     = myItems.reduce((s, i) => s + i.price, 0)
                    + sharedItems.reduce((s, i) => s + i.price / 2, 0)
                    + MOCK_TAX / MOCK_ITEMS.length * (myItems.length + sharedItems.length / 2)
                    + MOCK_TIP / MOCK_ITEMS.length * (myItems.length + sharedItems.length / 2);

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.idleBody}>
          <LinearGradient
            colors={isDark ? ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0)'] : ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0)']}
            style={styles.iconGlow}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16,185,129,0.16)' }]}>
              <Camera size={44} color="#10B981" strokeWidth={1.6} />
            </View>
          </LinearGradient>

          <Text style={[styles.idleTitle, T.extrabold, { color: colors.text }]}>Scan a Receipt</Text>
          <Text style={[styles.idleSubtitle, T.regular, { color: colors.secondaryText }]}>
            Point your camera at any receipt. AI parses every item — then each roommate taps what's theirs.
          </Text>

          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: '#10B981' }]}
            activeOpacity={0.85}
            onPress={handleOpenCamera}
          >
            <Camera size={20} color="#fff" strokeWidth={2} />
            <Text style={[styles.cameraBtnText, T.bold]}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Parsing ───────────────────────────────────────────────────────────────────
  if (phase === 'parsing') {
    const scanY = scanLineY.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '92%'],
    });
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.parsingBody}>
          <Animated.View style={[styles.receiptPreview, {
            borderColor: isDark ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.5)',
            backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
            transform: [{ scale: pulseAnim }],
          }]}>
            <ReceiptText size={64} color="#10B981" strokeWidth={1.2} />
            {/* Scan line */}
            <Animated.View style={[styles.scanLine, { top: scanY }]} />
          </Animated.View>

          <ActivityIndicator color="#10B981" size="large" style={{ marginTop: vs(24) }} />
          <Text style={[styles.parsingTitle, T.bold, { color: colors.text, marginTop: vs(16) }]}>
            Reading receipt…
          </Text>
          <Text style={[styles.parsingSub, T.regular, { color: colors.secondaryText }]}>
            Identifying items, tax & tip
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.resultsHeader}>
        <TouchableOpacity onPress={() => { setPhase('idle'); setClaims({}); }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: scale(12) }}>
          <Text style={[styles.resultsTitle, T.extrabold, { color: colors.text }]}>Receipt Parsed</Text>
          <Text style={[styles.resultsSub, T.regular, { color: colors.secondaryText }]}>
            Tap each item to claim it
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.rescanBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }]}
          onPress={() => { setPhase('idle'); setClaims({}); }}
        >
          <Text style={[styles.rescanText, { color: colors.secondaryText }]}>Rescan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.resultsList}
        showsVerticalScrollIndicator={false}
      >
        {/* Claim legend */}
        <View style={[styles.legendRow, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderRadius: ms(12),
        }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendText, { color: colors.secondaryText }]}>Mine</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
            <Text style={[styles.legendText, { color: colors.secondaryText }]}>Shared</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />
            <Text style={[styles.legendText, { color: colors.secondaryText }]}>Unclaimed</Text>
          </View>
        </View>

        {/* Items */}
        {MOCK_ITEMS.map((item) => {
          const mode = claims[item.id] ?? 'none';
          const bg   = claimColor(mode);
          const isClaimed = mode !== 'none';
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemRow,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: isClaimed ? bg + '60' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  borderWidth: isClaimed ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
              activeOpacity={0.78}
              onPress={() => toggleClaim(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, T.semibold, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, T.regular, { color: colors.secondaryText }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.claimBadge, {
                backgroundColor: isClaimed ? bg : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              }]}>
                {claimIcon(mode)}
                <Text style={[styles.claimText, { color: isClaimed ? '#fff' : colors.secondaryText }]}>
                  {claimLabel(mode)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Totals card */}
        <View style={[styles.totalsCard, {
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${MOCK_SUBTOTAL.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Tax (13%)</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${MOCK_TAX.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Tip (15%)</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${MOCK_TIP.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalDivider, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabelBold, T.bold, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValueBold, T.extrabold, { color: colors.text }]}>${MOCK_TOTAL.toFixed(2)}</Text>
          </View>
          {myTotal > 0 && (
            <View style={[styles.myShareRow, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[styles.myShareLabel, T.semibold, { color: colors.accent }]}>Your estimated share</Text>
              <Text style={[styles.myShareValue, T.extrabold, { color: colors.accent }]}>${myTotal.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={{ height: vs(120) }} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, {
            backgroundColor: colors.accent,
            opacity: Object.keys(claims).length === 0 ? 0.4 : 1,
          }]}
          activeOpacity={0.85}
          disabled={Object.keys(claims).length === 0}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate('Groups');
          }}
        >
          <CheckCircle2 size={20} color="#fff" strokeWidth={2.2} />
          <Text style={[styles.ctaBtnText, T.bold]}>Add to Group</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { padding: scale(16), alignSelf: 'flex-start' },

  // Idle
  idleBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(36), gap: vs(16), marginTop: -vs(40),
  },
  iconGlow: {
    width: scale(160), height: scale(160),
    borderRadius: scale(80),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: vs(8),
  },
  iconCircle: {
    width: scale(96), height: scale(96),
    borderRadius: scale(48),
    alignItems: 'center', justifyContent: 'center',
  },
  idleTitle:    { fontSize: ms(30), textAlign: 'center' },
  idleSubtitle: { fontSize: ms(15), textAlign: 'center', lineHeight: 22, opacity: 0.8 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingVertical: vs(15), paddingHorizontal: scale(32),
    borderRadius: ms(16), marginTop: vs(8),
  },
  cameraBtnText: { fontSize: ms(16), color: '#fff' },

  // Parsing
  parsingBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  receiptPreview: {
    width: scale(160), height: scale(200),
    borderRadius: ms(16), borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: '#10B981', opacity: 0.8,
  },
  parsingTitle: { fontSize: ms(20) },
  parsingSub:   { fontSize: ms(14), opacity: 0.7 },

  // Results
  resultsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(20), paddingTop: vs(8), paddingBottom: vs(12),
  },
  resultsTitle: { fontSize: ms(20) },
  resultsSub:   { fontSize: ms(13), opacity: 0.7 },
  rescanBtn: {
    paddingHorizontal: scale(12), paddingVertical: vs(6),
    borderRadius: ms(10), borderWidth: StyleSheet.hairlineWidth,
  },
  rescanText: { fontSize: ms(13) },
  resultsList: { paddingHorizontal: scale(20), gap: vs(10) },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: scale(20), paddingVertical: vs(10) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: ms(12) },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: scale(14), borderRadius: ms(16),
  },
  itemName:  { fontSize: ms(15), marginBottom: vs(2) },
  itemPrice: { fontSize: ms(13) },
  claimBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    paddingHorizontal: scale(10), paddingVertical: vs(5),
    borderRadius: ms(10),
  },
  claimText: { fontSize: ms(12), fontWeight: '600' },

  totalsCard: {
    borderRadius: ms(20), borderWidth: StyleSheet.hairlineWidth,
    padding: scale(16), gap: vs(8), marginTop: vs(4),
  },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:     { fontSize: ms(14) },
  totalValue:     { fontSize: ms(14) },
  totalLabelBold: { fontSize: ms(16) },
  totalValueBold: { fontSize: ms(18) },
  totalDivider:   { height: StyleSheet.hairlineWidth, marginVertical: vs(4) },
  myShareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: ms(12), paddingHorizontal: scale(12), paddingVertical: vs(10),
    marginTop: vs(4),
  },
  myShareLabel: { fontSize: ms(14) },
  myShareValue: { fontSize: ms(18) },

  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: scale(20), paddingBottom: vs(36), paddingTop: vs(12),
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: scale(8), paddingVertical: vs(16), borderRadius: ms(16),
  },
  ctaBtnText: { fontSize: ms(16), color: '#fff', flex: 1, textAlign: 'center', marginLeft: -scale(28) },
});
