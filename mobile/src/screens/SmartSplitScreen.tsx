import React, {
    useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, Modal,
    TouchableOpacity, KeyboardAvoidingView, Platform, Animated,
    Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    ChevronLeft, ChevronRight, Users, Check, Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import {
    groupsApi, expensesApi, smartSplitApi,
    GroupListItem, GroupMember,
} from '../services/api';
import CharacterShape from '../components/CharacterShape';
import PressableScale from '../components/PressableScale';
import SkeletonBlock from '../components/SkeletonBlock';

type Phase = 'input' | 'review' | 'error';

interface MemberChip {
    user_id: string;
    name: string;
    character_shape: string;
    character_color: string;
}

interface ReviewSplit {
    user_id: string;
    name: string;
    amount: string;
    note: string;
    character_shape: string;
    character_color: string;
}

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.55;

const PLACEHOLDERS = [
    'Thai for 4, Lakshit skipped drinks — $85 total',
    'Groceries $120, Maya got extra items',
    'Uber $34 split 3 ways, I paid',
];

export default function SmartSplitScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [phase, setPhase] = useState<Phase>('input');

    // ── Group picker ──────────────────────────────────────────────────────────
    const [pickerVisible, setPickerVisible]     = useState(false);
    const [pickerGroups, setPickerGroups]       = useState<GroupListItem[]>([]);
    const [pickerLoading, setPickerLoading]     = useState(false);
    const [pickerError, setPickerError]         = useState(false);
    const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);
    const [groupId, setGroupId]                 = useState<string | null>(null);
    const [groupName, setGroupName]             = useState('');
    const [groupMembers, setGroupMembers]       = useState<GroupMember[]>([]);

    // ── Input ─────────────────────────────────────────────────────────────────
    const [description, setDescription] = useState('');
    const [inputFocused, setInputFocused] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());

    // ── Review ────────────────────────────────────────────────────────────────
    const [reviewTitle, setReviewTitle]   = useState('');
    const [reviewTotal, setReviewTotal]   = useState('');
    const [reviewSplits, setReviewSplits] = useState<ReviewSplit[]>([]);
    const [needsTotal, setNeedsTotal]     = useState(false);
    const [adding, setAdding]             = useState(false);

    // ── Animations ────────────────────────────────────────────────────────────
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const placeholderOpacity = useRef(new Animated.Value(1)).current;
    const sheetAnim = useRef(new Animated.Value(SHEET_H)).current;

    // ── Derived ───────────────────────────────────────────────────────────────
    const allMembers = useMemo<MemberChip[]>(() => {
        const others = groupMembers
            .filter(m => m.user_id !== user?.id)
            .map(m => ({
                user_id: m.user_id,
                name: m.name,
                character_shape: m.character_shape ?? 'rect',
                character_color: m.character_color ?? colors.accent,
            }));
        return [
            {
                user_id: user?.id ?? '',
                name: 'You',
                character_shape: user?.character_shape ?? 'rect',
                character_color: user?.character_color ?? colors.accent,
            },
            ...others,
        ];
    }, [groupMembers, user, colors.accent]);

    // Initialize included IDs whenever the group changes
    useEffect(() => {
        setIncludedIds(new Set(allMembers.map(m => m.user_id)));
    }, [allMembers.length]);

    // Cycling placeholder animation
    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(placeholderOpacity, {
                toValue: 0, duration: 300, useNativeDriver: true,
            }).start(() => {
                setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
                Animated.timing(placeholderOpacity, {
                    toValue: 1, duration: 300, useNativeDriver: true,
                }).start();
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // ── Group picker logic ────────────────────────────────────────────────────
    const loadGroups = useCallback(() => {
        setPickerLoading(true);
        setPickerError(false);
        groupsApi.list()
            .then(raw => {
                const groups = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
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
                toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true,
            }).start();
        }
    }, [pickerVisible]);

    const closePicker = useCallback(() => {
        Animated.spring(sheetAnim, {
            toValue: SHEET_H, damping: 24, stiffness: 220, useNativeDriver: true,
        }).start(() => {
            setPickerVisible(false);
            sheetAnim.setValue(SHEET_H);
        });
    }, [sheetAnim]);

    // ── Parse ─────────────────────────────────────────────────────────────────
    const handleParse = useCallback(async () => {
        if (!description.trim() || !groupId || parsing) return;
        setParsing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const memberIds = [...includedIds].filter(Boolean);
        if (user?.id && !memberIds.includes(user.id)) memberIds.push(user.id);

        try {
            const result = await smartSplitApi.parse({
                description,
                group_id: groupId,
                member_ids: memberIds,
            });

            if (result.parse_failed) {
                setPhase('error');
                return;
            }

            const memberMap = new Map(allMembers.map(m => [m.user_id, m]));
            const splits: ReviewSplit[] = (result.splits ?? []).map(s => ({
                user_id: s.user_id,
                name: memberMap.get(s.user_id)?.name ?? 'Member',
                amount: s.amount > 0 ? s.amount.toFixed(2) : '0.00',
                note: s.note ?? '',
                character_shape: memberMap.get(s.user_id)?.character_shape ?? 'rect',
                character_color: memberMap.get(s.user_id)?.character_color ?? colors.accent,
            }));

            setReviewTitle(result.title ?? '');
            setReviewTotal(result.total > 0 ? result.total.toFixed(2) : '');
            setReviewSplits(splits);
            setNeedsTotal(!!result.needs_total);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPhase('review');
        } catch {
            setPhase('error');
        } finally {
            setParsing(false);
        }
    }, [description, groupId, parsing, includedIds, user, allMembers, colors.accent]);

    // ── Add Expense ───────────────────────────────────────────────────────────
    const handleAddExpense = useCallback(async () => {
        if (!groupId || !user || adding) return;
        const total = parseFloat(reviewTotal) || 0;
        if (total <= 0) {
            Alert.alert('Total required', 'Enter the total amount before adding.');
            return;
        }
        setAdding(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const participantIds = reviewSplits.map(s => s.user_id);
            await expensesApi.create(groupId, {
                title: reviewTitle.trim() || 'Shared Expense',
                amount: total,
                paid_by: user.id,
                participant_ids: participantIds,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', err.message || 'Could not add expense. Please try again.');
            setAdding(false);
        }
    }, [groupId, user, adding, reviewTotal, reviewSplits, reviewTitle, navigation]);

    // ── Review derived ────────────────────────────────────────────────────────
    const splitsSum = reviewSplits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalNum  = parseFloat(reviewTotal) || 0;
    const remaining = totalNum > 0 ? parseFloat((totalNum - splitsSum).toFixed(2)) : 0;

    // ── Group picker modal ────────────────────────────────────────────────────
    const renderPicker = () => (
        <Modal
            visible={pickerVisible}
            transparent
            animationType="none"
            onRequestClose={closePicker}
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
                        <Text style={[styles.pickerTitle, T.extrabold, { color: colors.text }]}>Which group?</Text>
                        <Text style={[styles.pickerSub, T.regular, { color: colors.secondaryText }]}>
                            Choose the group to split with
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
                                Create a group first to split expenses.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: vs(32) }}
                        >
                            {pickerGroups.map(g => (
                                <PressableScale
                                    key={g.id}
                                    scaleTo={0.97}
                                    haptic="light"
                                    style={[styles.pickerRow, {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                    }]}
                                    disabled={!!selectingGroupId}
                                    onPress={async () => {
                                        setSelectingGroupId(g.id);
                                        try {
                                            const full = await groupsApi.get(g.id);
                                            setGroupId(g.id);
                                            setGroupName(g.name);
                                            setGroupMembers(full.members);
                                            closePicker();
                                        } catch {
                                            Alert.alert('Error', 'Could not load group. Try again.');
                                        } finally {
                                            setSelectingGroupId(null);
                                        }
                                    }}
                                >
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
                                </PressableScale>
                            ))}
                        </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );

    // ── Error phase ───────────────────────────────────────────────────────────
    if (phase === 'error') {
        return (
            <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => setPhase('input')}
                        style={[styles.backBtn, { backgroundColor: colors.surface }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.screenTitle, T.bold, { color: colors.text }]}>Smart Split</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.errorBody}>
                    <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
                        <CharacterShape shape="round" color="#F59E0B" variant="hero" />
                        <Text style={[styles.errorTitle, T.bold, { color: colors.text }]}>Couldn't parse that</Text>
                        <Text style={[styles.errorMsg, T.regular, { color: colors.secondaryText }]}>
                            Try being more specific — mention amounts and who's included.
                        </Text>
                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                            onPress={() => setPhase('input')}
                        >
                            <Text style={[styles.retryBtnText, T.bold]}>Try again</Text>
                        </PressableScale>
                        <TouchableOpacity
                            onPress={() => { setPhase('input'); setDescription(''); }}
                            activeOpacity={0.7}
                            style={{ marginTop: vs(10) }}
                        >
                            <Text style={[{ fontSize: ms(14), color: colors.secondaryText }, T.regular]}>
                                Start over
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ── Review phase ──────────────────────────────────────────────────────────
    if (phase === 'review') {
        return (
            <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => setPhase('input')}
                        style={[styles.backBtn, { backgroundColor: colors.surface }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.screenTitle, T.bold, { color: colors.text }]}>Review Split</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.reviewScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Title + Total card */}
                        <View style={[styles.titleCard, { backgroundColor: colors.surface }]}>
                            <TextInput
                                value={reviewTitle}
                                onChangeText={setReviewTitle}
                                style={[styles.titleInput, T.bold, { color: colors.text }]}
                                placeholder="Expense name"
                                placeholderTextColor={colors.tertiaryText}
                                maxLength={40}
                            />
                            <View style={[
                                styles.totalRow,
                                needsTotal && {
                                    borderWidth: 1.5,
                                    borderColor: colors.warning,
                                    borderRadius: ms(12),
                                    padding: scale(8),
                                    marginTop: vs(4),
                                },
                            ]}>
                                <Text style={[styles.dollarSign, T.extrabold, { color: colors.accent }]}>$</Text>
                                <TextInput
                                    value={reviewTotal}
                                    onChangeText={v => { setReviewTotal(v); setNeedsTotal(false); }}
                                    style={[styles.totalInput, T.extrabold, { color: colors.accent }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.tertiaryText}
                                />
                            </View>
                            {needsTotal && (
                                <Text style={[styles.totalHint, T.regular, { color: colors.warning }]}>
                                    Add the total amount
                                </Text>
                            )}
                        </View>

                        {/* Split breakdown */}
                        <View style={[styles.splitsCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.splitsHeader, T.semibold, { color: colors.secondaryText }]}>
                                SPLIT BREAKDOWN
                            </Text>
                            {reviewSplits.map((s, i) => (
                                <View
                                    key={s.user_id}
                                    style={[
                                        styles.splitRow,
                                        i < reviewSplits.length - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                        },
                                    ]}
                                >
                                    <CharacterShape
                                        shape={s.character_shape}
                                        color={s.character_color}
                                        variant="mini"
                                    />
                                    <View style={styles.splitRowInfo}>
                                        <Text style={[styles.splitName, T.semibold, { color: colors.text }]}>
                                            {s.name}
                                        </Text>
                                        {!!s.note && (
                                            <Text style={[styles.splitNote, T.regular, { color: colors.secondaryText }]}>
                                                {s.note}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.amountPill, { backgroundColor: colors.accentBg }]}>
                                        <Text style={[styles.dollarSignSmall, T.extrabold, { color: colors.accent }]}>$</Text>
                                        <TextInput
                                            value={s.amount}
                                            onChangeText={val => {
                                                setReviewSplits(prev =>
                                                    prev.map((r, j) => j === i ? { ...r, amount: val } : r)
                                                );
                                            }}
                                            style={[styles.amountInput, T.extrabold, { color: colors.accent }]}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>
                            ))}

                            {/* Remaining warning */}
                            {totalNum > 0 && Math.abs(remaining) > 0.01 && (
                                <View style={[styles.remainingRow, { backgroundColor: colors.dangerBg }]}>
                                    <Text style={[styles.remainingText, T.semibold, { color: colors.danger }]}>
                                        Amounts don't add up — ${Math.abs(remaining).toFixed(2)}{' '}
                                        {remaining > 0 ? 'remaining' : 'over budget'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Add Expense button */}
                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            style={[styles.submitBtn, {
                                backgroundColor: colors.accent,
                                opacity: adding ? 0.75 : 1,
                            }]}
                            onPress={handleAddExpense}
                            disabled={adding}
                        >
                            {adding
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={[styles.submitBtnText, T.semibold]}>Add Expense</Text>
                            }
                        </PressableScale>

                        <TouchableOpacity
                            onPress={() => { setPhase('input'); setDescription(''); }}
                            activeOpacity={0.7}
                            style={styles.startOverBtn}
                        >
                            <Text style={[styles.startOverText, T.regular, { color: colors.secondaryText }]}>
                                Start over
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ── Input phase ───────────────────────────────────────────────────────────
    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={() => navigation.goBack()}
                        style={[styles.backBtn, { backgroundColor: colors.surface }]}
                    >
                        <ChevronLeft size={ms(20)} color={colors.text} />
                    </PressableScale>
                    <Text style={[styles.screenTitle, T.bold, { color: colors.text }]}>Smart Split</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.subtitle, T.regular, { color: colors.secondaryText }]}>
                        Describe your bill in plain English
                    </Text>

                    {/* Group selector */}
                    {!groupId ? (
                        <PressableScale
                            scaleTo={0.97}
                            haptic="light"
                            style={[styles.groupPickerBtn, {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            }]}
                            onPress={() => setPickerVisible(true)}
                        >
                            <Users size={18} color={colors.accent} />
                            <Text style={[styles.groupPickerText, T.semibold, { color: colors.secondaryText }]}>
                                Select a group
                            </Text>
                            <ChevronRight size={16} color={colors.tertiaryText} />
                        </PressableScale>
                    ) : (
                        <View style={[styles.groupChip, { backgroundColor: colors.accentBg }]}>
                            <Users size={14} color={colors.accent} />
                            <Text style={[styles.groupChipText, T.semibold, { color: colors.accent }]}>
                                {groupName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={[{ fontSize: ms(12), color: colors.accent }, T.regular]}>· change</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Text input with animated fake placeholder */}
                    <View style={styles.inputWrap}>
                        <TextInput
                            multiline
                            value={description}
                            onChangeText={setDescription}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            style={[
                                styles.textInput,
                                T.regular,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: inputFocused ? colors.accent : colors.border,
                                    color: colors.text,
                                },
                            ]}
                            textAlignVertical="top"
                        />
                        {!description ? (
                            <View style={styles.fakePlaceholderWrap} pointerEvents="none">
                                <Animated.Text
                                    style={[
                                        styles.fakePlaceholder,
                                        T.regular,
                                        { color: colors.tertiaryText, opacity: placeholderOpacity },
                                    ]}
                                >
                                    {PLACEHOLDERS[placeholderIdx]}
                                </Animated.Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Member chips */}
                    {groupId && allMembers.length > 0 && (
                        <View style={styles.chipsSection}>
                            <Text style={[styles.chipsLabel, T.semibold, { color: colors.secondaryText }]}>
                                SPLITTING WITH
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipsRow}
                            >
                                {allMembers.map(m => {
                                    const included = includedIds.has(m.user_id);
                                    return (
                                        <PressableScale
                                            key={m.user_id}
                                            scaleTo={0.96}
                                            haptic="light"
                                            style={[
                                                styles.memberChip,
                                                {
                                                    backgroundColor: included ? colors.accentBg : colors.surface,
                                                    borderColor: included ? colors.accent : colors.border,
                                                },
                                            ]}
                                            onPress={() =>
                                                setIncludedIds(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(m.user_id) && next.size > 1) {
                                                        next.delete(m.user_id);
                                                    } else {
                                                        next.add(m.user_id);
                                                    }
                                                    return next;
                                                })
                                            }
                                        >
                                            <CharacterShape
                                                shape={m.character_shape}
                                                color={m.character_color}
                                                variant="cluster"
                                            />
                                            <Text style={[
                                                styles.chipName,
                                                T.semibold,
                                                { color: included ? colors.accent : colors.secondaryText },
                                            ]}>
                                                {m.name}
                                            </Text>
                                            {included && (
                                                <Check size={12} color={colors.accent} strokeWidth={2.5} />
                                            )}
                                        </PressableScale>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Submit */}
                    <PressableScale
                        scaleTo={0.97}
                        haptic="medium"
                        style={[
                            styles.submitBtn,
                            {
                                backgroundColor: colors.accent,
                                opacity: (!description.trim() || !groupId || parsing) ? 0.5 : 1,
                            },
                        ]}
                        onPress={handleParse}
                        disabled={!description.trim() || !groupId || parsing}
                    >
                        {parsing ? (
                            <View style={styles.parsingRow}>
                                <SkeletonBlock width={scale(80)} height={vs(14)} radius={ms(7)} />
                                <Text style={[styles.submitBtnText, T.semibold]}>Parsing your bill...</Text>
                            </View>
                        ) : (
                            <View style={styles.submitBtnInner}>
                                <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
                                <Text style={[styles.submitBtnText, T.semibold]}>Split it →</Text>
                            </View>
                        )}
                    </PressableScale>
                </ScrollView>
            </KeyboardAvoidingView>

            {renderPicker()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
    },
    backBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: { width: scale(44) },
    screenTitle: {
        flex: 1,
        fontSize: ms(20),
        letterSpacing: -0.5,
        textAlign: 'center',
    },

    // ── Input ─────────────────────────────────────────────────────────────────
    scrollContent: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(100),
        gap: vs(14),
    },
    subtitle: {
        fontSize: ms(14),
    },
    groupPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        borderRadius: ms(14),
        borderWidth: 1,
        paddingHorizontal: scale(16),
        paddingVertical: vs(14),
    },
    groupPickerText: {
        flex: 1,
        fontSize: ms(15),
    },
    groupChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
    },
    groupChipText: { fontSize: ms(13) },

    inputWrap: { position: 'relative' },
    textInput: {
        minHeight: vs(140),
        borderRadius: ms(20),
        borderWidth: 1,
        fontSize: ms(16),
        padding: scale(18),
        lineHeight: ms(24),
    },
    fakePlaceholderWrap: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        padding: scale(18),
    },
    fakePlaceholder: {
        fontSize: ms(16),
        lineHeight: ms(24),
    },

    chipsSection: { gap: vs(8) },
    chipsLabel: {
        fontSize: ms(11),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: scale(8),
        paddingRight: scale(4),
    },
    memberChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        paddingHorizontal: scale(10),
        paddingVertical: vs(8),
        borderRadius: 999,
        borderWidth: 1,
    },
    chipName: { fontSize: ms(13) },

    submitBtn: {
        height: vs(54),
        borderRadius: 99,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    submitBtnText: {
        fontSize: 17,
        color: '#FFFFFF',
    },
    parsingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },

    // ── Review ────────────────────────────────────────────────────────────────
    reviewScroll: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(100),
        gap: vs(14),
    },
    titleCard: {
        borderRadius: ms(20),
        padding: scale(20),
        gap: vs(6),
    },
    titleInput: {
        fontSize: ms(18),
        letterSpacing: -0.3,
        padding: 0,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    dollarSign: {
        fontSize: ms(22),
        letterSpacing: -0.5,
        marginRight: scale(2),
    },
    totalInput: {
        fontSize: ms(32),
        letterSpacing: -1.2,
        flex: 1,
        padding: 0,
    },
    totalHint: {
        fontSize: ms(12),
        marginTop: vs(2),
    },

    splitsCard: {
        borderRadius: ms(20),
        overflow: 'hidden',
    },
    splitsHeader: {
        fontSize: ms(11),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: scale(16),
        paddingTop: vs(14),
        paddingBottom: vs(6),
    },
    splitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(16),
        minHeight: vs(56),
    },
    splitRowInfo: { flex: 1 },
    splitName: { fontSize: ms(15) },
    splitNote: { fontSize: ms(12), marginTop: vs(1) },
    amountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(10),
        paddingHorizontal: scale(10),
        paddingVertical: vs(6),
    },
    dollarSignSmall: {
        fontSize: ms(14),
        marginRight: scale(1),
    },
    amountInput: {
        fontSize: ms(15),
        minWidth: scale(48),
        padding: 0,
    },
    remainingRow: {
        paddingHorizontal: scale(16),
        paddingVertical: vs(10),
    },
    remainingText: { fontSize: ms(13) },

    startOverBtn: {
        alignItems: 'center',
        paddingVertical: vs(8),
    },
    startOverText: { fontSize: ms(14) },

    // ── Error ─────────────────────────────────────────────────────────────────
    errorBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    errorCard: {
        width: '100%',
        alignItems: 'center',
        padding: scale(28),
        borderRadius: ms(28),
        gap: vs(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
        elevation: 8,
    },
    errorTitle: {
        fontSize: ms(20),
        letterSpacing: -0.3,
        marginTop: vs(8),
    },
    errorMsg: {
        fontSize: ms(14),
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
    },
    retryBtn: {
        borderRadius: ms(14),
        paddingVertical: vs(13),
        paddingHorizontal: scale(32),
        marginTop: vs(8),
    },
    retryBtnText: {
        fontSize: ms(15),
        color: '#fff',
    },

    // ── Picker sheet ──────────────────────────────────────────────────────────
    pickerSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_H,
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    handleRow:  { alignItems: 'center', paddingTop: vs(12), paddingBottom: vs(6) },
    handlePill: { width: scale(36), height: vs(4), borderRadius: 2 },
    pickerTitle: { fontSize: ms(22), letterSpacing: -0.4 },
    pickerSub:   { fontSize: ms(14), opacity: 0.65, marginTop: vs(4), lineHeight: 20 },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(16),
        borderWidth: 1,
        padding: scale(14),
        marginBottom: vs(8),
    },
    pickerCluster: { flexDirection: 'row', alignItems: 'flex-end', marginRight: scale(12) },
    pickerRowInfo: { flex: 1 },
    pickerRowName: { fontSize: ms(15), marginBottom: vs(2) },
    pickerRowMeta: { fontSize: ms(12) },
    pickerEmpty:   { alignItems: 'center', paddingHorizontal: scale(36), marginTop: vs(28) },
    pickerEmptyTitle: { fontSize: ms(16), marginBottom: vs(6) },
    pickerEmptySub:   { fontSize: ms(13), textAlign: 'center', lineHeight: 20, opacity: 0.7 },
    pickerRetryBtn:   { paddingVertical: vs(11), paddingHorizontal: scale(32), borderRadius: ms(12), marginTop: vs(16) },
    pickerRetryText:  { fontSize: ms(14), color: '#fff' },
});
