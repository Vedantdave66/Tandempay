import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, TextInput, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ArrowLeft, Check, ReceiptText, ChevronRight, UserPlus, Link } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { friendsApi, Friend } from '../services/api';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

// ── Mock receipt data (replaced with real OCR response later) ─────────────────
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


type Phase = 'idle' | 'parsing' | 'people' | 'items';

export default function ReceiptScanScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [phase, setPhase]                   = useState<Phase>('idle');
  const [included, setIncluded]             = useState<Set<string>>(new Set(['me']));
  const [claimed, setClaimed]               = useState<Set<string>>(new Set());
  const [tipAmount, setTipAmount]           = useState('');
  const [tipActive, setTipActive]           = useState(false);
  const [payerId, setPayerId]               = useState<string>('');
  const [friends, setFriends]               = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Parsing animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const scanLoop  = useRef<Animated.CompositeAnimation | null>(null);

  // Stagger entrance for items
  const itemAnims = useRef(MOCK_ITEMS.map(() => ({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(vs(14)),
  }))).current;

  // Per-item spring scale for checkbox
  const checkAnims = useRef(
    Object.fromEntries(MOCK_ITEMS.map(i => [i.id, new Animated.Value(0)]))
  ).current;

  // People entrance
  const peopleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'people') {
      Animated.spring(peopleAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 260 }).start();
    }
    if (phase === 'items') {
      const anims = itemAnims.flatMap(({ opacity, translateY }, i) => [
        Animated.timing(opacity,    { toValue: 1, duration: 200, delay: i * 40, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, delay: i * 40, useNativeDriver: true }),
      ]);
      Animated.parallel(anims).start();
    }
  }, [phase]);

  useEffect(() => {
    friendsApi.getMyFriends()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setFriends(list);
        if (list.length > 0 && !payerId) {
          setPayerId(list[0].id);
        }
      })
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────
  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'TandemPay needs camera access to scan receipts. Enable it in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('parsing');

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

    setTimeout(() => {
      pulseLoop.current?.stop();
      scanLoop.current?.stop();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('people');
    }, 2500);
  };

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleMember = (id: string) => {
    Haptics.selectionAsync();
    setIncluded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const toggleClaim = (id: string) => {
    Haptics.selectionAsync();
    setClaimed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        Animated.spring(checkAnims[id], { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 280 }).start();
      } else {
        next.add(id);
        Animated.spring(checkAnims[id], { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }).start();
      }
      return next;
    });
  };

  // ── Calculations ──────────────────────────────────────────────────────────
  const tip        = parseFloat(tipAmount) || 0;
  const total      = parseFloat((SUBTOTAL + TAX + tip).toFixed(2));
  const splitCount = included.size;
  const myFood     = MOCK_ITEMS.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
  const myFraction = SUBTOTAL > 0 ? myFood / SUBTOTAL : 0;
  const myShare    = parseFloat((myFood + TAX * myFraction + (tip > 0 ? tip / splitCount : 0)).toFixed(2));
  const hasClaim   = claimed.size > 0;

  // Payer member — computed once at component level so Share handler is stable
  const allMembersCtx = [
    { id: 'me', name: user?.character_nickname || 'Me', initial: (user?.character_nickname?.[0] || 'M').toUpperCase(), color: user?.character_color || colors.accent, email: '' },
    ...friends.map(f => ({ id: f.id, name: f.name, initial: f.name[0]?.toUpperCase() ?? '?', color: f.avatar_color || '#6366F1', email: f.email })),
  ];
  const payerMember = allMembersCtx.find(m => m.id === payerId) ?? allMembersCtx[0];

  const evenSplit = parseFloat((total / Math.max(splitCount, 1)).toFixed(2));

  const handleShareLink = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const payerName  = payerMember?.id === 'me' ? (user?.character_nickname || 'Me') : (payerMember?.name ?? 'Someone');
    const payerEmail = payerMember?.email ?? '';

    const payload = {
      a: myShare.toFixed(2),
      p: payerName,
      e: payerEmail,
      d: 'Receipt Split',
    };
    const encoded  = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const shareUrl = `https://tandempay.ca/pay?r=${encoded}`;

    const message = payerEmail
      ? `Pay ${payerName} $${myShare.toFixed(2)} via Interac e-Transfer to: ${payerEmail}`
      : `You owe ${payerName} $${myShare.toFixed(2)} for a receipt split.`;

    Share.share(
      { message, url: shareUrl },
      { dialogTitle: `Pay ${payerName} $${myShare.toFixed(2)}` },
    ).catch(() => {
      Alert.alert(
        `Pay ${payerName} · $${myShare.toFixed(2)}`,
        payerEmail
          ? `Send $${myShare.toFixed(2)} via Interac e-Transfer to:\n\n${payerEmail}`
          : `You owe ${payerName} $${myShare.toFixed(2)}.`,
        [{ text: 'OK' }],
      );
    });
  };

  const scanTop = scanLineY.interpolate({ inputRange: [0, 1], outputRange: ['0%', '90%'] });

  // ── Phase navigation ──────────────────────────────────────────────────────
  const goBack = () => {
    if (phase === 'people') { setPhase('idle'); setClaimed(new Set()); return; }
    if (phase === 'items')  { setPhase('people'); return; }
    navigation.goBack();
  };

  // Fix: from a modal stack screen, reach the tab navigator by name
  const navigateToGroups = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('MainTabs', { screen: 'Groups' });
  };

  // ── IDLE ──────────────────────────────────────────────────────────────────
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
          <Text style={[styles.idleTitle, T.extrabold, { color: colors.text }]}>Scan a Receipt</Text>
          <Text style={[styles.idleSub, T.regular, { color: colors.secondaryText }]}>
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

  // ── PARSING ───────────────────────────────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.parsingBody}>
          <Animated.View style={[styles.receiptMock, {
            borderColor: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.45)',
            backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
            transform: [{ scale: pulseAnim }],
          }]}>
            <ReceiptText size={52} color="#10B981" strokeWidth={1.2} />
            <Animated.View style={[styles.scanLine, { top: scanTop }]} />
          </Animated.View>
          <Text style={[styles.parsingTitle, T.bold, { color: colors.text, marginTop: vs(28) }]}>Reading receipt…</Text>
          <Text style={[styles.parsingSub, T.regular, { color: colors.secondaryText, marginTop: vs(6) }]}>Identifying items, tax & tip</Text>
          <ActivityIndicator color="#10B981" size="small" style={{ marginTop: vs(20) }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── PEOPLE ────────────────────────────────────────────────────────────────
  if (phase === 'people') {
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

    if (friends.length === 0) {
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

    const payer = allMembers.find(m => m.id === payerId) ?? allMembers[1] ?? allMembers[0];

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <Animated.View style={[styles.peopleBody, {
          opacity:   peopleAnim,
          transform: [{ translateY: peopleAnim.interpolate({ inputRange: [0, 1], outputRange: [vs(20), 0] }) }],
        }]}>
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
                  <View style={[styles.memberAvatar, {
                    backgroundColor: m.color + (isPayer ? 'FF' : '30'),
                    borderWidth: isPayer ? 2.5 : 0,
                    borderColor: m.color,
                  }]}>
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
              const isIn = included.has(m.id);
              return (
                <TouchableOpacity key={m.id} style={styles.memberItem} activeOpacity={0.75} onPress={() => toggleMember(m.id)}>
                  <View style={[styles.memberAvatar, {
                    backgroundColor: m.color + (isIn ? 'FF' : '30'),
                    borderWidth: isIn ? 2.5 : 0,
                    borderColor: m.color,
                  }]}>
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

  // ── ITEMS ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.itemsHeader}>
        <TouchableOpacity style={styles.backBtnInline} onPress={goBack}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemsTitle, T.extrabold, { color: colors.text }]}>Choose Your Items</Text>
          <Text style={[styles.itemsSub, T.regular, { color: colors.secondaryText }]}>
            {claimed.size > 0 ? `${claimed.size} item${claimed.size > 1 ? 's' : ''} selected` : 'Tap what you ordered'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.rescanChip, { borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)' }]}
          onPress={() => { setPhase('people'); setClaimed(new Set()); }}
        >
          <Text style={[styles.rescanText, T.semibold, { color: colors.secondaryText }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.itemsScroll}>
        {MOCK_ITEMS.map((item, idx) => {
          const isClaimed  = claimed.has(item.id);
          const checkScale = checkAnims[item.id].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

          return (
            <Animated.View key={item.id} style={{
              opacity:   itemAnims[idx].opacity,
              transform: [{ translateY: itemAnims[idx].translateY }],
            }}>
              <TouchableOpacity
                style={[styles.itemRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                activeOpacity={0.7}
                onPress={() => toggleClaim(item.id)}
              >
                <Animated.View style={[styles.itemCheckbox, {
                  backgroundColor: isClaimed ? colors.accent : 'transparent',
                  borderColor: isClaimed ? colors.accent : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.20)'),
                  transform: [{ scale: isClaimed ? checkScale : new Animated.Value(1) }],
                }]}>
                  {isClaimed && <Check size={13} color="#fff" strokeWidth={3} />}
                </Animated.View>

                <Text style={[styles.itemName, T.semibold, { color: isClaimed ? colors.accent : colors.text, flex: 1, marginLeft: scale(12) }]}>
                  {item.name}
                </Text>

                <Text style={[styles.itemPrice, T.semibold, { color: isClaimed ? colors.accent : colors.secondaryText }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Summary */}
        <View style={[styles.summarySection, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, T.regular, { color: colors.secondaryText }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, T.regular, { color: colors.text }]}>${SUBTOTAL.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, T.regular, { color: colors.secondaryText }]}>Tax {(TAX_RATE * 100).toFixed(0)}%</Text>
            <Text style={[styles.summaryValue, T.regular, { color: colors.text }]}>${TAX.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, T.regular, { color: colors.secondaryText }]}>Tip</Text>
            {tipActive ? (
              <View style={[styles.tipInputWrap, { borderColor: colors.accent + '60', backgroundColor: colors.accent + '0F' }]}>
                <Text style={[styles.tipDollar, { color: colors.accent }]}>$</Text>
                <TextInput
                  style={[styles.tipInput, T.semibold, { color: colors.accent }]}
                  value={tipAmount}
                  onChangeText={setTipAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder="0.00"
                  placeholderTextColor={colors.accent + '60'}
                  onBlur={() => { if (!tipAmount) setTipActive(false); }}
                />
              </View>
            ) : (
              <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setTipActive(true); }}>
                <Text style={[styles.addTipBtn, T.semibold, { color: colors.accent }]}>Add Tip</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, T.bold, { color: colors.text, fontSize: ms(15) }]}>Total</Text>
            <Text style={[styles.summaryValue, T.extrabold, { color: colors.text, fontSize: ms(15) }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: vs(130) }} />
      </ScrollView>

      <View style={[styles.ctaBar, { backgroundColor: colors.background, gap: vs(8) }]}>

        {/* Primary — claimed items pay (only when items are selected) */}
        {hasClaim && (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.84}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.navigate('SettleUp', {
                payment: {
                  amount: myShare,
                  description: 'Receipt Split',
                  payee_name: payerMember?.id === 'me' ? (user?.character_nickname || 'Me') : (payerMember?.name ?? ''),
                  payee_id: payerMember?.id === 'me' ? null : (payerMember?.id ?? null),
                  payer_email: payerMember?.email,
                  group_id: null,
                  id: null,
                  isReceiptPayment: true,
                },
              });
            }}
          >
            <Text style={[styles.ctaBtnText, T.bold]}>
              My Items · ${myShare.toFixed(2)}
            </Text>
            <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        )}

        {/* Secondary row — Even Split + Share Link always visible */}
        <View style={styles.ctaSecondRow}>
          <TouchableOpacity
            style={[styles.ctaSecondBtn, {
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }]}
            activeOpacity={0.78}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('SettleUp', {
                payment: {
                  amount: evenSplit,
                  description: 'Receipt Split (Even)',
                  payee_name: payerMember?.id === 'me' ? (user?.character_nickname || 'Me') : (payerMember?.name ?? ''),
                  payee_id: payerMember?.id === 'me' ? null : (payerMember?.id ?? null),
                  payer_email: payerMember?.email,
                  group_id: null,
                  id: null,
                  isReceiptPayment: true,
                },
              });
            }}
          >
            <Text style={[styles.ctaSecondText, T.bold, { color: colors.text }]}>
              Even Split · ${evenSplit.toFixed(2)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaSecondBtn, {
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }]}
            activeOpacity={0.78}
            onPress={handleShareLink}
          >
            <Link size={15} color={colors.secondaryText} strokeWidth={2} />
            <Text style={[styles.ctaSecondText, T.semibold, { color: colors.secondaryText }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn:       { padding: scale(16), alignSelf: 'flex-start' },
  backBtnInline: { padding: scale(16) },

  // ── Idle
  idleBody:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(36), gap: vs(14), marginTop: -vs(44) },
  iconGlow:      { width: scale(180), height: scale(180), borderRadius: scale(90), alignItems: 'center', justifyContent: 'center', marginBottom: vs(4) },
  iconCircle:    { width: scale(88), height: scale(88), borderRadius: scale(44), alignItems: 'center', justifyContent: 'center' },
  idleTitle:     { fontSize: ms(28), textAlign: 'center', letterSpacing: -0.5 },
  idleSub:       { fontSize: ms(15), textAlign: 'center', lineHeight: 22, opacity: 0.75 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingVertical: vs(15), paddingHorizontal: scale(36),
    borderRadius: ms(16), marginTop: vs(8),
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  cameraBtnText: { fontSize: ms(16), color: '#fff' },

  // ── Parsing
  parsingBody:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  receiptMock:  { width: scale(148), height: scale(188), borderRadius: ms(16), borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanLine:     { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#10B981', opacity: 0.75 },
  parsingTitle: { fontSize: ms(19), letterSpacing: -0.3 },
  parsingSub:   { fontSize: ms(14), opacity: 0.65 },

  // ── People
  peopleBody:      { flex: 1, paddingHorizontal: scale(24), paddingTop: vs(4) },
  peopleTitle:     { fontSize: ms(26), letterSpacing: -0.5 },
  peopleSub:       { fontSize: ms(14), opacity: 0.65, marginTop: vs(6), lineHeight: 20 },
  memberGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: scale(16), marginTop: vs(28), marginBottom: vs(24) },
  memberItem:      { alignItems: 'center', width: scale(64), gap: vs(6) },
  memberAvatar:    { width: scale(56), height: scale(56), borderRadius: scale(28), alignItems: 'center', justifyContent: 'center' },
  memberInitial:   { fontSize: ms(22), fontWeight: '700' },
  memberCheckmark: { position: 'absolute', bottom: -2, right: -2, width: scale(18), height: scale(18), borderRadius: scale(9), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  memberName:      { fontSize: ms(12), textAlign: 'center' },
  countPill:       { alignSelf: 'flex-start', paddingHorizontal: scale(14), paddingVertical: vs(8), borderRadius: ms(20) },
  countText:       { fontSize: ms(13) },
  sectionDivider:  { height: StyleSheet.hairlineWidth, marginHorizontal: -scale(4) },
  peopleSplitLabel:{ fontSize: ms(22), letterSpacing: -0.4 },

  // ── Items
  itemsHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: scale(16), paddingBottom: vs(4) },
  itemsTitle:  { fontSize: ms(20), letterSpacing: -0.4 },
  itemsSub:    { fontSize: ms(13), opacity: 0.65, marginTop: vs(1) },
  rescanChip:  { paddingHorizontal: scale(12), paddingVertical: vs(6), borderRadius: ms(10), borderWidth: StyleSheet.hairlineWidth },
  rescanText:  { fontSize: ms(13) },
  itemsScroll: { paddingHorizontal: scale(20) },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: vs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: scale(52),
  },
  itemCheckbox: { width: scale(24), height: scale(24), borderRadius: scale(12), borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  itemName:     { fontSize: ms(15) },
  itemPrice:    { fontSize: ms(15), letterSpacing: -0.2 },

  summarySection: { paddingTop: vs(20), gap: vs(12), borderTopWidth: StyleSheet.hairlineWidth, marginTop: vs(4) },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:   { fontSize: ms(14) },
  summaryValue:   { fontSize: ms(14) },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: vs(4) },
  tipInputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: ms(8), paddingHorizontal: scale(8), paddingVertical: vs(3) },
  tipDollar:      { fontSize: ms(14), fontWeight: '600', marginRight: 2 },
  tipInput:       { fontSize: ms(14), minWidth: scale(44), padding: 0 },
  addTipBtn:      { fontSize: ms(14) },

  // ── Shared CTA
  ctaBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: scale(20), paddingBottom: vs(36), paddingTop: vs(12) },
  ctaBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: vs(16), borderRadius: ms(16) },
  ctaBtnText:   { fontSize: ms(16), color: '#fff' },
  ctaSecondRow: { flexDirection: 'row', gap: scale(10) },
  ctaSecondBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: vs(13), borderRadius: ms(14), borderWidth: StyleSheet.hairlineWidth },
  ctaSecondText:{ fontSize: ms(14) },
});
