import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ArrowLeft, Check, ReceiptText, ChevronRight, UserPlus, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import { receiptsApi, groupsApi, ParsedReceiptItem, GroupListItem, GroupMember } from '../services/api';
import * as ImageManipulator from 'expo-image-manipulator';

type Phase = 'group_picker' | 'idle' | 'parsing' | 'people' | 'items';

export default function ReceiptScanScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // If caller already provides group context (e.g. GroupDetailScreen), skip picker.
  const paramsGroupId: string | undefined = route?.params?.groupId;
  const paramsMembers: GroupMember[] | undefined = route?.params?.members;
  const startedWithGroup = useRef(!!paramsGroupId);

  const [phase, setPhase] = useState<Phase>(paramsGroupId ? 'idle' : 'group_picker');

  // Group state
  const [groupId, setGroupId]           = useState<string | null>(paramsGroupId ?? null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>(paramsMembers ?? []);

  // Group picker state
  const [pickerGroups, setPickerGroups]         = useState<GroupListItem[]>([]);
  const [pickerLoading, setPickerLoading]       = useState(false);
  const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);

  // People & claims — seed included from real member user_ids when available
  const [included, setIncluded] = useState<Set<string>>(
    paramsMembers
      ? new Set(['me', ...paramsMembers.map(m => m.user_id)])
      : new Set(['me']),
  );
  const [claimed, setClaimed]     = useState<Set<string>>(new Set());
  const [tipAmount, setTipAmount] = useState('');
  const [tipActive, setTipActive] = useState(false);

  const [items, setItems]             = useState<ParsedReceiptItem[]>([]);
  const [subtotal, setSubtotal]       = useState(0);
  const [tax, setTax]                 = useState(0);
  const [taxRate, setTaxRate]         = useState(0.13);
  const [tipDetected, setTipDetected] = useState(0);
  const [parseError, setParseError]   = useState<string | null>(null);

  // Parsing animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const scanLoop  = useRef<Animated.CompositeAnimation | null>(null);

  const MAX_ITEMS = 30;
  const itemAnims = useRef(
    Array.from({ length: MAX_ITEMS }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(vs(14)),
    }))
  ).current;

  const checkAnims = useRef(
    Object.fromEntries(Array.from({ length: MAX_ITEMS }, (_, i) => [String(i), new Animated.Value(0)]))
  ).current;

  // People entrance
  const peopleAnim = useRef(new Animated.Value(0)).current;

  // ── Load groups for picker ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'group_picker') return;
    setPickerLoading(true);
    groupsApi.list()
      .then(setPickerGroups)
      .catch(() => Alert.alert('Error', 'Could not load groups.'))
      .finally(() => setPickerLoading(false));
  }, [phase]);

  useEffect(() => {
    if (phase === 'people') {
      Animated.spring(peopleAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 260 }).start();
    }
    if (phase === 'items') {
      const count = Math.min(items.length, MAX_ITEMS);
      const anims = itemAnims.slice(0, count).flatMap(({ opacity, translateY }, i) => [
        Animated.timing(opacity,    { toValue: 1, duration: 200, delay: i * 40, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, delay: i * 40, useNativeDriver: true }),
      ]);
      Animated.parallel(anims).start();
    }
  }, [phase]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'TandemPay needs camera access to scan receipts. Enable it in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    // Resize + compress to stay well under Vercel's 4.5 MB body limit
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 800 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    const base64Image = compressed.base64 ?? '';
    if (!base64Image) {
      Alert.alert('Error', 'Could not compress image. Please try again.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setParseError(null);
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

    try {
      const parsed = await receiptsApi.parse(base64Image);

      pulseLoop.current?.stop();
      scanLoop.current?.stop();

      setItems(parsed.items);
      setSubtotal(parsed.subtotal);
      setTax(parsed.tax);
      setTaxRate(parsed.tax_rate);
      setTipDetected(parsed.tip_detected);
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
  }, []);

  // Auto-open camera on mount only when groupId was provided via route.params
  useEffect(() => {
    if (!startedWithGroup.current) return;
    const timer = setTimeout(openCamera, 400);
    return () => clearTimeout(timer);
  }, [openCamera]);

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

  // ── Calculations ──────────────────────────────────────────────────────────
  const tip        = parseFloat(tipAmount) || 0;
  const total      = parseFloat((subtotal + tax + tip).toFixed(2));
  const splitCount = included.size;
  const myFood     = items.filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0);
  const myFraction = subtotal > 0 ? myFood / subtotal : 0;
  const myShare    = parseFloat((myFood + tax * myFraction + (tip > 0 ? tip / splitCount : 0)).toFixed(2));
  const hasClaim   = claimed.size > 0;

  const scanTop = scanLineY.interpolate({ inputRange: [0, 1], outputRange: ['0%', '90%'] });

  // ── Phase navigation ──────────────────────────────────────────────────────
  const goBack = () => {
    if (phase === 'idle' && !startedWithGroup.current) { setPhase('group_picker'); return; }
    if (phase === 'people') { setPhase('idle'); setClaimed(new Set()); return; }
    if (phase === 'items')  { setPhase('people'); return; }
    navigation.goBack();
  };

  // Fix: from a modal stack screen, reach the tab navigator by name
  const navigateToGroups = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('MainTabs', { screen: 'Groups' });
  };

  // ── GROUP PICKER ──────────────────────────────────────────────────────────
  if (phase === 'group_picker') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.pickerHeader}>
          <Text style={[styles.pickerTitle, T.extrabold, { color: colors.text }]}>Which group?</Text>
          <Text style={[styles.pickerSub, T.regular, { color: colors.secondaryText }]}>
            Choose the group to split this receipt with
          </Text>
        </View>

        {pickerLoading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: vs(48) }} />
        ) : pickerGroups.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Users size={40} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(12) }} />
            <Text style={[styles.pickerEmptyTitle, T.bold, { color: colors.text }]}>No groups yet</Text>
            <Text style={[styles.pickerEmptySub, T.regular, { color: colors.secondaryText }]}>
              Create a group first to split receipts.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            {pickerGroups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.pickerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.75}
                disabled={!!selectingGroupId}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectingGroupId(g.id);
                  try {
                    const full = await groupsApi.get(g.id);
                    // Exclude the current user — they're represented by the 'me' slot in people phase
                    const members = full.members.filter(m => m.user_id !== user?.id);
                    setGroupId(g.id);
                    setGroupMembers(members);
                    setIncluded(new Set(['me', ...members.map(m => m.user_id)]));
                    setPhase('idle');
                    openCamera();
                  } catch {
                    Alert.alert('Error', 'Could not load group members. Try again.');
                  } finally {
                    setSelectingGroupId(null);
                  }
                }}
              >
                <View style={[styles.pickerRowIcon, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }]}>
                  <Users size={20} color={colors.accent} />
                </View>
                <View style={styles.pickerRowInfo}>
                  <Text style={[styles.pickerRowName, T.semibold, { color: colors.text }]}>{g.name}</Text>
                  <Text style={[styles.pickerRowMeta, T.regular, { color: colors.secondaryText }]}>
                    {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                {selectingGroupId === g.id
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <ChevronRight size={18} color={colors.secondaryText} />
                }
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
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
          {parseError ? (
            <Text style={[styles.idleSub, T.regular, { color: '#EF4444', textAlign: 'center' }]}>
              {parseError}
            </Text>
          ) : (
            <Text style={[styles.idleSub, T.regular, { color: colors.secondaryText }]}>
              Take a photo and each roommate taps what's theirs. Tax and tip are split automatically.
            </Text>
          )}
          {parseError && (
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: '#10B981' }]}
              activeOpacity={0.82}
              onPress={openCamera}
            >
              <Camera size={19} color="#fff" strokeWidth={2.2} />
              <Text style={[styles.cameraBtnText, T.bold]}>Try Again</Text>
            </TouchableOpacity>
          )}
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
    const allMembers = [
      {
        id: 'me',
        name: 'You',
        initial: (user?.character_nickname?.[0] ?? 'Y').toUpperCase(),
        color: user?.character_color ?? colors.accent,
      },
      ...groupMembers.map(m => ({
        id: m.user_id,
        name: m.name,
        initial: (m.name?.[0] ?? '?').toUpperCase(),
        color: m.avatar_color,
      })),
    ];

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <Animated.View style={[styles.peopleBody, {
          opacity:   peopleAnim,
          transform: [{ translateY: peopleAnim.interpolate({ inputRange: [0, 1], outputRange: [vs(20), 0] }) }],
        }]}>
          <Text style={[styles.peopleTitle, T.extrabold, { color: colors.text }]}>Who's splitting this?</Text>
          <Text style={[styles.peopleSub, T.regular, { color: colors.secondaryText }]}>
            Tap to include or remove people from the bill
          </Text>

          <View style={styles.memberGrid}>
            {allMembers.map(m => {
              const isIn = included.has(m.id);
              return (
                <TouchableOpacity key={m.id} style={styles.memberItem} activeOpacity={0.75} onPress={() => toggleMember(m.id)}>
                  <View style={[styles.memberAvatar, {
                    backgroundColor: m.color + (isIn ? 'FF' : '40'),
                    borderWidth: isIn ? 2.5 : 0,
                    borderColor: m.color,
                  }]}>
                    <Text style={[styles.memberInitial, { color: isIn ? '#fff' : m.color + 'AA' }]}>{m.initial}</Text>
                    {isIn && (
                      <View style={[styles.memberCheckmark, { backgroundColor: m.color }]}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.memberName, T.semibold, { color: isIn ? colors.text : colors.tertiaryText }]} numberOfLines={1}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add person chip */}
            <TouchableOpacity style={styles.memberItem} activeOpacity={0.75} onPress={() => {}}>
              <View style={[styles.memberAvatar, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                borderStyle: 'dashed',
              }]}>
                <UserPlus size={20} color={colors.secondaryText} strokeWidth={1.6} />
              </View>
              <Text style={[styles.memberName, T.regular, { color: colors.tertiaryText }]}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.countText, T.semibold, { color: colors.secondaryText }]}>
              {included.size} people · ~${((subtotal + tax) / Math.max(included.size, 1)).toFixed(2)} each before items
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
          onPress={() => { setItems([]); setParseError(null); setPhase('idle'); setClaimed(new Set()); openCamera(); }}
        >
          <Camera size={13} color={colors.secondaryText} strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={[styles.rescanText, T.semibold, { color: colors.secondaryText }]}>Retake</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.itemsScroll}>
        {items.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: vs(40), gap: vs(12) }}>
            <Text style={[{ fontSize: ms(15), color: colors.secondaryText, textAlign: 'center' }, T.regular]}>
              No items detected.{'\n'}Try scanning with better lighting.
            </Text>
            <TouchableOpacity onPress={() => setPhase('idle')}>
              <Text style={[{ color: colors.accent, fontSize: ms(14) }, T.semibold]}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
        {items.map((item, idx) => {
          const isClaimed  = claimed.has(item.id);
          const animKey    = String(idx);
          const checkScale = checkAnims[animKey].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

          return (
            <Animated.View key={item.id} style={{
              opacity:   itemAnims[idx]?.opacity    ?? new Animated.Value(1),
              transform: [{ translateY: itemAnims[idx]?.translateY ?? new Animated.Value(0) }],
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
            <Text style={[styles.summaryValue, T.regular, { color: colors.text }]}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, T.regular, { color: colors.secondaryText }]}>Tax {(taxRate * 100).toFixed(0)}%</Text>
            <Text style={[styles.summaryValue, T.regular, { color: colors.text }]}>${tax.toFixed(2)}</Text>
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

      <View style={[styles.ctaBar, { backgroundColor: colors.background }]}>
        {hasClaim ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.84}
            onPress={navigateToGroups}
          >
            <Text style={[styles.ctaBtnText, T.bold]}>My Share  ·  ${myShare.toFixed(2)}</Text>
            <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.ctaBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.ctaBtnText, T.semibold, { color: colors.tertiaryText }]}>Tap items you ordered</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn:       { padding: scale(16), alignSelf: 'flex-start' },
  backBtnInline: { padding: scale(16) },

  // ── Group picker
  pickerHeader: {
    paddingHorizontal: scale(24),
    paddingTop: vs(4),
    paddingBottom: vs(20),
  },
  pickerTitle: { fontSize: ms(28), letterSpacing: -0.5 },
  pickerSub:   { fontSize: ms(14), opacity: 0.65, marginTop: vs(6), lineHeight: 20 },
  pickerList:  { paddingHorizontal: scale(20), paddingBottom: vs(48) },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(18),
    borderWidth: 1,
    padding: scale(16),
    marginBottom: vs(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pickerRowIcon: {
    width: 44,
    height: 44,
    borderRadius: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  pickerRowInfo:  { flex: 1 },
  pickerRowName:  { fontSize: ms(15), marginBottom: vs(2) },
  pickerRowMeta:  { fontSize: ms(12) },
  pickerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(36),
    marginTop: -vs(44),
  },
  pickerEmptyTitle: { fontSize: ms(17), marginBottom: vs(6) },
  pickerEmptySub:   { fontSize: ms(14), textAlign: 'center', lineHeight: 20, opacity: 0.7 },

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

  // ── Items
  itemsHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: scale(16), paddingBottom: vs(4) },
  itemsTitle:  { fontSize: ms(20), letterSpacing: -0.4 },
  itemsSub:    { fontSize: ms(13), opacity: 0.65, marginTop: vs(1) },
  rescanChip:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: vs(6), borderRadius: ms(10), borderWidth: StyleSheet.hairlineWidth },
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
  ctaBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: scale(20), paddingBottom: vs(36), paddingTop: vs(12) },
  ctaBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: vs(16), borderRadius: ms(16) },
  ctaBtnText: { fontSize: ms(16), color: '#fff' },
});
