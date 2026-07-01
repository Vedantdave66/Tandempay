import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Animated, ActivityIndicator, Image, Alert, Dimensions,
  InteractionManager, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Users, Check, ReceiptText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import {
  receiptsApi, groupsApi, expensesApi,
  ParsedReceiptItem, GroupListItem, GroupMember,
} from '../services/api';
import CharacterShape from '../components/CharacterShape';
import SkeletonBlock from '../components/SkeletonBlock';
import { buildMembersList } from '../utils/helpers';

type Phase = 'idle' | 'parsing' | 'result' | 'error';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT_HALF = SCREEN_H * 0.55;

interface MemberEntry {
  user_id: string;
  name: string;
  character_shape: string;
  character_color: string;
}

export default function ReceiptScanScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const paramsGroupId: string | undefined  = route?.params?.groupId;
  const paramsMembers: GroupMember[] | undefined = route?.params?.members;

  const [phase, setPhase]               = useState<Phase>('idle');
  const [pickerVisible, setPickerVisible] = useState(false);

  const [groupId, setGroupId]       = useState<string | null>(paramsGroupId ?? null);
  const [groupName, setGroupName]   = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>(paramsMembers ?? []);

  const [pickerGroups, setPickerGroups]         = useState<GroupListItem[]>([]);
  const [pickerLoading, setPickerLoading]       = useState(false);
  const [pickerError, setPickerError]           = useState(false);
  const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{
    items: ParsedReceiptItem[]; subtotal: number; tax: number;
    tax_rate: number; tip_detected: number; total: number; currency: string;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [claimed, setClaimed]             = useState<Set<string>>(new Set());
  const [adding, setAdding]               = useState(false);

  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT_HALF)).current;
  const cardAnim  = useRef(new Animated.Value(SCREEN_H)).current;

  // Camera lifecycle guards: launching the camera while the picker Modal is
  // still animating closed makes iOS dismiss it immediately. The camera only
  // opens from the Modal's onDismiss, gated by these refs.
  const cameraOpenPending       = useRef(false);
  const shouldOpenCameraOnDismiss = useRef(false);
  const startedWithGroup        = useRef(!!paramsGroupId);

  useEffect(() => () => { cameraOpenPending.current = false; }, []);

  // ── Load groups when picker opens ─────────────────────────────────────────
  const loadGroups = useCallback(() => {
    setPickerLoading(true);
    setPickerError(false);
    groupsApi.list()
      .then(raw => {
        const groups = Array.isArray(raw) ? raw : (raw as any)?.items ?? (raw as any)?.groups ?? [];
        setPickerGroups(groups);
      })
      .catch(() => setPickerError(true))
      .finally(() => setPickerLoading(false));
  }, []);

  useEffect(() => {
    if (!pickerVisible) return;
    loadGroups();
  }, [pickerVisible, loadGroups]);

  useEffect(() => {
    if (pickerVisible) {
      Animated.spring(sheetAnim, {
        toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true,
      }).start();
    }
  }, [pickerVisible]);

  useEffect(() => {
    if (phase === 'result') {
      cardAnim.setValue(SCREEN_H);
      Animated.spring(cardAnim, {
        toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  const closePicker = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: SHEET_HEIGHT_HALF, damping: 20, stiffness: 200, useNativeDriver: true,
    }).start(() => {
      setPickerVisible(false);
      sheetAnim.setValue(SHEET_HEIGHT_HALF);
    });
  }, [sheetAnim]);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera access required',
          'TandemPay needs camera access to scan receipts. Enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        cameraOpenPending.current = false;
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      cameraOpenPending.current = false;
      if (result.canceled || !result.assets?.[0]) {
        // Don't strand the user: if the group came from the picker, reopen it
        if (!startedWithGroup.current) {
          setPhase('idle');
          setPickerVisible(true);
        }
        return;
      }

      const asset = result.assets[0];
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const base64Image = compressed.base64 ?? '';
      if (!base64Image) {
        Alert.alert('Error', 'Could not process image. Try again.');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCapturedUri(compressed.uri);
      setParseError(null);
      setClaimed(new Set());
      setItemsExpanded(false);
      setParseResult(null);
      setPhase('parsing');

      try {
        const parsed = await receiptsApi.parse(base64Image);
        if (parsed.parse_failed) {
          setParseError("Couldn't read this receipt. Try a clearer photo.");
          setPhase('error');
          return;
        }
        setParseResult(parsed);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('result');
      } catch (err: any) {
        setParseError(err?.message || 'Could not read this receipt. Try a clearer photo.');
        setPhase('error');
      }
    } catch (err: any) {
      cameraOpenPending.current = false;
      Alert.alert('Camera error', err?.message || 'Could not open the camera. Try again.');
    }
  }, []);

  // Opens the camera only after the picker Modal has fully dismissed and all
  // animations/interactions have settled — anything earlier and iOS kills it.
  const openCameraAfterModalClose = useCallback(() => {
    if (!shouldOpenCameraOnDismiss.current) return;
    shouldOpenCameraOnDismiss.current = false;
    if (cameraOpenPending.current) return;
    cameraOpenPending.current = true;
    InteractionManager.runAfterInteractions(() => {
      // Extra safety buffer for slower devices
      setTimeout(() => {
        cameraOpenPending.current = false;
        openCamera();
      }, 150);
    });
  }, [openCamera]);

  // Modal.onDismiss is iOS-only; on Android fire off the visibility change
  useEffect(() => {
    if (Platform.OS === 'android' && !pickerVisible) openCameraAfterModalClose();
  }, [pickerVisible, openCameraAfterModalClose]);

  // Auto-open camera when group context provided via route.params
  useEffect(() => {
    if (!startedWithGroup.current) return;
    const t = setTimeout(openCamera, 400);
    return () => clearTimeout(t);
  }, [openCamera]);

  // ── Computed split values ─────────────────────────────────────────────────
  const allMembers = useMemo<MemberEntry[]>(
    () => buildMembersList(groupMembers, user, colors.accent),
    [groupMembers, user, colors.accent],
  );

  const splitCount = allMembers.length;
  const total      = parseResult?.total ?? 0;
  const evenShare  = splitCount > 0 ? parseFloat((total / splitCount).toFixed(2)) : 0;

  const myFoodTotal = useMemo(
    () => (parseResult?.items ?? []).filter(i => claimed.has(i.id)).reduce((s, i) => s + i.price, 0),
    [claimed, parseResult],
  );
  const myShare = useMemo(() => {
    if (!parseResult || claimed.size === 0) return evenShare;
    const { subtotal, tax, tip_detected } = parseResult;
    const frac = subtotal > 0 ? myFoodTotal / subtotal : 0;
    return parseFloat((myFoodTotal + tax * frac + tip_detected / splitCount).toFixed(2));
  }, [parseResult, claimed, myFoodTotal, evenShare, splitCount]);

  // ── Add Expense ────────────────────────────────────────────────────────────
  const handleAddExpense = useCallback(async () => {
    if (!groupId || !parseResult || !user) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const participantIds = allMembers.map(m => m.user_id);
      await expensesApi.create(groupId, {
        title: 'Shared receipt',
        amount: parseResult.total,
        paid_by: user.id,
        participant_ids: participantIds,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('MainTabs', { screen: 'Groups' });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Could not add expense. Try again.');
      setAdding(false);
    }
  }, [groupId, parseResult, user, allMembers, navigation]);

  // ── GROUP PICKER MODAL ─────────────────────────────────────────────────────
  const renderPicker = () => (
    <Modal
      visible={pickerVisible}
      transparent
      animationType="none"
      onRequestClose={() => setPickerVisible(false)}
      onDismiss={openCameraAfterModalClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          activeOpacity={1}
          onPress={closePicker}
        />
        <Animated.View style={[styles.pickerSheet, {
          backgroundColor: colors.surface,
          transform: [{ translateY: sheetAnim }],
        }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
          </View>
          <View style={{ paddingHorizontal: scale(24), paddingBottom: vs(14) }}>
            <Text style={[styles.pickerTitle, T.bold, { color: colors.text }]}>Which group?</Text>
            <Text style={[styles.pickerSub, T.regular, { color: colors.secondaryText }]}>
              Choose the group to split this receipt with
            </Text>
          </View>

          {pickerLoading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: vs(28) }} />
          ) : pickerError ? (
            <View style={styles.pickerEmpty}>
              <Users size={36} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(10) }} />
              <Text style={[styles.pickerEmptyTitle, T.bold, { color: colors.text }]}>Couldn't load groups</Text>
              <Text style={[styles.pickerEmptySub, T.regular, { color: colors.secondaryText }]}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={[styles.pickerRetryBtn, { backgroundColor: colors.accent }]}
                onPress={loadGroups}
                activeOpacity={0.82}
              >
                <Text style={[styles.pickerRetryText, T.bold]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pickerGroups.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Users size={36} color={colors.secondaryText} style={{ opacity: 0.3, marginBottom: vs(10) }} />
              <Text style={[styles.pickerEmptyTitle, T.bold, { color: colors.text }]}>No groups yet</Text>
              <Text style={[styles.pickerEmptySub, T.regular, { color: colors.secondaryText }]}>
                Create a group first to split receipts.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: vs(32) }}
            >
              {pickerGroups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.pickerRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                  activeOpacity={0.75}
                  disabled={!!selectingGroupId}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectingGroupId(g.id);
                    try {
                      const full = await groupsApi.get(g.id);
                      setGroupId(g.id);
                      setGroupName(g.name);
                      setGroupMembers(full.members);
                      // Only close the modal here — the camera opens from
                      // the Modal's onDismiss once teardown is complete
                      shouldOpenCameraOnDismiss.current = true;
                      closePicker();
                    } catch {
                      Alert.alert('Error', 'Could not load group. Try again.');
                    } finally {
                      setSelectingGroupId(null);
                    }
                  }}
                >
                  {/* Mini character cluster — placeholder shapes since GroupListItem has no member shapes */}
                  <View style={styles.pickerCluster}>
                    {Array.from({ length: Math.min(g.member_count, 3) }).map((_, i) => (
                      <View key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }}>
                        <CharacterShape
                          shape="rect"
                          color={colors.accent + (i === 0 ? '' : i === 1 ? 'BB' : '77')}
                          variant="cluster"
                        />
                      </View>
                    ))}
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
        </Animated.View>
      </View>
    </Modal>
  );

  // ── IDLE ───────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + vs(4) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.idleBody}>
          <LinearGradient
            colors={isDark
              ? [colors.accent + '38', colors.accent + '14', colors.accent + '00']
              : [colors.accent + '29', colors.accent + '0D', colors.accent + '00']}
            style={styles.iconGlow}
          >
            <View style={[styles.iconCircle, {
              backgroundColor: isDark ? colors.accent + '2E' : colors.accent + '24',
            }]}>
              <Camera size={42} color={colors.accent} strokeWidth={1.6} />
            </View>
          </LinearGradient>
          <Text style={[styles.idleTitle, T.extrabold, { color: colors.text }]}>Scan a receipt</Text>
          <Text style={[styles.idleSub, T.regular, { color: colors.secondaryText }]}>
            Snap a photo and split the bill in seconds.
          </Text>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.82}
            onPress={() => { if (!groupId) setPickerVisible(true); else openCamera(); }}
          >
            <Camera size={19} color="#fff" strokeWidth={2.2} />
            <Text style={[styles.scanBtnText, T.bold]}>Scan receipt</Text>
          </TouchableOpacity>
          {groupName ? (
            <TouchableOpacity
              style={[styles.changeGroupChip, { borderColor: colors.border }]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Users size={13} color={colors.secondaryText} />
              <Text style={[{ fontSize: ms(12), color: colors.secondaryText }, T.semibold]}>
                {groupName} · change
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {renderPicker()}
      </View>
    );
  }

  // ── PARSING ────────────────────────────────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <View style={[styles.root, { backgroundColor: '#0A0A0A' }]}>
        {capturedUri && (
          <Image
            source={{ uri: capturedUri }}
            style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
            blurRadius={18}
            resizeMode="cover"
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.50)' }]} />
        <View style={styles.parsingBody}>
          <Text style={[styles.parsingTitle, T.bold, { color: '#fff', marginBottom: vs(24) }]}>
            Reading receipt…
          </Text>
          <SkeletonBlock width={scale(260)} height={vs(16)} radius={ms(8)} delay={0} />
          <View style={{ height: vs(10) }} />
          <SkeletonBlock width={scale(200)} height={vs(14)} radius={ms(7)} delay={120} />
          <View style={{ height: vs(10) }} />
          <SkeletonBlock width={scale(230)} height={vs(14)} radius={ms(7)} delay={240} />
          <View style={{ height: vs(10) }} />
          <SkeletonBlock width={scale(180)} height={vs(14)} radius={ms(7)} delay={360} />
          <View style={{ height: vs(10) }} />
          <SkeletonBlock width={scale(210)} height={vs(14)} radius={ms(7)} delay={480} />
          <Text style={[{ fontSize: ms(13), color: 'rgba(255,255,255,0.45)', marginTop: vs(20) }, T.regular]}>
            Identifying items, tax & tip
          </Text>
        </View>
      </View>
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <View style={[styles.root, { backgroundColor: capturedUri ? '#0A0A0A' : colors.background }]}>
        {capturedUri && (
          <Image
            source={{ uri: capturedUri }}
            style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}
            blurRadius={20}
            resizeMode="cover"
          />
        )}
        {capturedUri && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        )}
        <View style={[styles.topBar, { paddingTop: insets.top + vs(4) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setPhase('idle')}>
            <ArrowLeft size={22} color={capturedUri ? '#fff' : colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorBody}>
          <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
            <ReceiptText size={40} color="#EF4444" strokeWidth={1.4} style={{ marginBottom: vs(14) }} />
            <Text style={[styles.errorTitle, T.bold, { color: colors.text }]}>Scan failed</Text>
            <Text style={[styles.errorMsg, T.regular, { color: colors.secondaryText }]}>
              {parseError}
            </Text>
            <TouchableOpacity
              style={[styles.errorPrimaryBtn, { backgroundColor: colors.accent }]}
              onPress={() => { setPhase('idle'); openCamera(); }}
              activeOpacity={0.82}
            >
              <Camera size={17} color="#fff" />
              <Text style={[styles.errorBtnText, T.bold]}>Try again</Text>
            </TouchableOpacity>
            {groupId && (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddExpense', { groupId, members: groupMembers })}
                style={{ marginTop: vs(12) }}
                activeOpacity={0.7}
              >
                <Text style={[{ fontSize: ms(14), color: colors.accent }, T.semibold]}>
                  Enter manually →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: '#0A0A0A' }]}>
      {capturedUri && (
        <Image
          source={{ uri: capturedUri }}
          style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
          blurRadius={18}
          resizeMode="cover"
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.50)' }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + vs(4) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setPhase('idle')}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.resultTopTitle, T.bold, { color: 'rgba(255,255,255,0.7)' }]}>
          {groupName || 'Receipt'}
        </Text>
        <View style={{ width: scale(44) }} />
      </View>

      <Animated.View style={[styles.resultCard, {
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom + vs(12),
        transform: [{ translateY: cardAnim }],
      }]}>
        <View style={styles.handleRow}>
          <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultScroll}>
          {/* Total */}
          <View style={{ marginBottom: vs(18) }}>
            <Text style={[styles.receiptLabel, T.regular, { color: colors.secondaryText }]}>
              Receipt total
            </Text>
            <Text style={[styles.receiptTotal, T.extrabold, { color: colors.text }]}>
              ${parseResult?.total.toFixed(2)}
              <Text style={[{ fontSize: ms(15), color: colors.secondaryText }, T.semibold]}>
                {'  '}{parseResult?.currency}
              </Text>
            </Text>
          </View>

          {/* Even split card */}
          <View style={[styles.splitCard, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: colors.border,
          }]}>
            <View style={styles.splitCluster}>
              {allMembers.slice(0, 5).map((m, i) => (
                <View key={m.user_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
                  <CharacterShape
                    shape={m.character_shape}
                    color={m.character_color}
                    variant="mini"
                  />
                </View>
              ))}
              {allMembers.length > 5 && (
                <View style={[styles.splitClusterMore, { backgroundColor: colors.border, marginLeft: -8 }]}>
                  <Text style={[{ fontSize: ms(10), color: colors.secondaryText }, T.bold]}>
                    +{allMembers.length - 5}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: vs(10) }}>
              <Text style={[styles.splitLabel, T.regular, { color: colors.secondaryText }]}>
                ÷ {splitCount} {splitCount === 1 ? 'person' : 'people'}
              </Text>
              <Text style={[styles.splitEach, T.extrabold, { color: colors.accent }]}>
                ${evenShare.toFixed(2)}{' '}
                <Text style={[{ fontSize: ms(13), color: colors.secondaryText }, T.regular]}>each</Text>
              </Text>
            </View>
          </View>

          {/* Collapsible items */}
          <TouchableOpacity
            style={[styles.customizeRow, { borderTopColor: colors.border }]}
            onPress={() => setItemsExpanded(v => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.customizeLabel, T.semibold, { color: colors.text }]}>
              {itemsExpanded
                ? 'Customize split'
                : `Customize split · ${(parseResult?.items ?? []).length} items`}
            </Text>
            {itemsExpanded
              ? <ChevronUp size={18} color={colors.secondaryText} />
              : <ChevronDown size={18} color={colors.secondaryText} />
            }
          </TouchableOpacity>

          {itemsExpanded && (
            <View style={[styles.itemsList, { borderColor: colors.border }]}>
              {(parseResult?.items ?? []).length === 0 ? (
                <Text style={[{ fontSize: ms(13), color: colors.secondaryText, padding: scale(12) }, T.regular]}>
                  No line items detected. Using the total.
                </Text>
              ) : (parseResult?.items ?? []).map(item => {
                const isClaimed = claimed.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setClaimed(prev => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                  >
                    <View style={[styles.itemCheck, {
                      backgroundColor: isClaimed ? colors.accent : 'transparent',
                      borderColor: isClaimed ? colors.accent : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.20)'),
                    }]}>
                      {isClaimed && <Check size={12} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text style={[styles.itemName, T.semibold, {
                      color: isClaimed ? colors.accent : colors.text, flex: 1,
                    }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.itemPrice, T.semibold, {
                      color: isClaimed ? colors.accent : colors.secondaryText,
                    }]}>${item.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
              {claimed.size > 0 && (
                <View style={[styles.myShareRow, { backgroundColor: colors.accentBg }]}>
                  <Text style={[{ fontSize: ms(13), color: colors.accent }, T.semibold]}>My share</Text>
                  <Text style={[{ fontSize: ms(16), color: colors.accent }, T.extrabold]}>
                    ${myShare.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={{ height: vs(8) }} />
        </ScrollView>

        <View style={[styles.ctaWrap, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.addExpenseBtn, {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              opacity: adding ? 0.75 : 1,
            }]}
            activeOpacity={0.82}
            onPress={handleAddExpense}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.addExpenseBtnText, T.bold]}>
                  Add expense · ${parseResult?.total.toFixed(2)}
                </Text>
                <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(6), justifyContent: 'space-between' },
  backBtn: { padding: scale(12), alignSelf: 'flex-start' },

  // ── Idle
  idleBody:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(36), gap: vs(14), marginTop: -vs(40) },
  iconGlow:        { width: scale(180), height: scale(180), borderRadius: scale(90), alignItems: 'center', justifyContent: 'center', marginBottom: vs(4) },
  iconCircle:      { width: scale(88), height: scale(88), borderRadius: scale(44), alignItems: 'center', justifyContent: 'center' },
  idleTitle:       { fontSize: ms(28), textAlign: 'center', letterSpacing: -0.5 },
  idleSub:         { fontSize: ms(15), textAlign: 'center', lineHeight: 22, opacity: 0.75 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingVertical: vs(15), paddingHorizontal: scale(36),
    borderRadius: ms(16), marginTop: vs(8),
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  scanBtnText:      { fontSize: ms(16), color: '#fff' },
  changeGroupChip:  { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(12), paddingVertical: vs(7), borderRadius: ms(10), borderWidth: StyleSheet.hairlineWidth },

  // ── Picker sheet
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT_HALF,
    borderTopLeftRadius: ms(28), borderTopRightRadius: ms(28),
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 24,
  },
  handleRow:  { alignItems: 'center', paddingTop: vs(12), paddingBottom: vs(6) },
  handlePill: { width: scale(40), height: vs(4), borderRadius: 2 },
  pickerTitle: { fontSize: ms(22), letterSpacing: -0.4 },
  pickerSub:   { fontSize: ms(14), opacity: 0.65, marginTop: vs(4), lineHeight: 20 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: ms(16), borderWidth: 1,
    padding: scale(14), marginBottom: vs(8),
  },
  pickerCluster: { flexDirection: 'row', alignItems: 'flex-end', marginRight: scale(12) },
  pickerRowInfo:  { flex: 1 },
  pickerRowName:  { fontSize: ms(15), marginBottom: vs(2) },
  pickerRowMeta:  { fontSize: ms(12) },
  pickerEmpty:    { alignItems: 'center', paddingHorizontal: scale(36), marginTop: vs(28) },
  pickerEmptyTitle: { fontSize: ms(16), marginBottom: vs(6) },
  pickerEmptySub:   { fontSize: ms(13), textAlign: 'center', lineHeight: 20, opacity: 0.7 },
  pickerRetryBtn:   { paddingVertical: vs(11), paddingHorizontal: scale(32), borderRadius: ms(12), marginTop: vs(16) },
  pickerRetryText:  { fontSize: ms(14), color: '#fff' },

  // ── Parsing
  parsingBody:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24) },
  parsingTitle: { fontSize: ms(20), letterSpacing: -0.3 },

  // ── Error
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(28) },
  errorCard: {
    width: '100%', alignItems: 'center', padding: scale(28),
    borderRadius: ms(28),
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 24, elevation: 12,
  },
  errorTitle:      { fontSize: ms(20), letterSpacing: -0.3, marginBottom: vs(8) },
  errorMsg:        { fontSize: ms(14), textAlign: 'center', lineHeight: 20, marginBottom: vs(20), opacity: 0.8 },
  errorPrimaryBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: vs(13), paddingHorizontal: scale(32), borderRadius: ms(14) },
  errorBtnText:    { fontSize: ms(15), color: '#fff' },

  // ── Result
  resultTopTitle: { fontSize: ms(14) },
  resultCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_H * 0.78,
    borderTopLeftRadius: ms(28), borderTopRightRadius: ms(28),
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22, shadowRadius: 28, elevation: 28,
  },
  resultScroll: { paddingHorizontal: scale(24), paddingTop: vs(4), paddingBottom: vs(12) },
  receiptLabel: { fontSize: ms(10), letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: vs(4) },
  receiptTotal: { fontSize: ms(40), letterSpacing: -1.5, lineHeight: vs(50) },

  splitCard:         { borderRadius: ms(18), borderWidth: 1, padding: scale(16), marginBottom: vs(16) },
  splitCluster:      { flexDirection: 'row', alignItems: 'flex-end' },
  splitClusterMore:  { width: scale(24), height: scale(32), borderRadius: ms(4), alignItems: 'center', justifyContent: 'center' },
  splitLabel:        { fontSize: ms(12), marginBottom: vs(2) },
  splitEach:         { fontSize: ms(22), letterSpacing: -0.5 },

  customizeRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(14), borderTopWidth: StyleSheet.hairlineWidth },
  customizeLabel: { fontSize: ms(14) },
  itemsList:     { borderWidth: StyleSheet.hairlineWidth, borderRadius: ms(14), overflow: 'hidden', marginBottom: vs(4) },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: scale(12), padding: scale(13), borderBottomWidth: StyleSheet.hairlineWidth, minHeight: scale(48) },
  itemCheck:     { width: scale(22), height: scale(22), borderRadius: scale(11), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemName:      { fontSize: ms(14) },
  itemPrice:     { fontSize: ms(14), letterSpacing: -0.2 },
  myShareRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(14) },

  ctaWrap:         { paddingHorizontal: scale(20), paddingTop: vs(12), borderTopWidth: StyleSheet.hairlineWidth },
  addExpenseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: vs(16), borderRadius: ms(16),
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  },
  addExpenseBtnText: { fontSize: ms(16), color: '#fff' },
});
