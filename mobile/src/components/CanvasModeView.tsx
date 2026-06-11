import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    ViewStyle,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import { Expense } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { X, Plus, Check } from 'lucide-react-native';
import CharacterShape from './CharacterShape';

/**
 * The Table.
 *
 * Expenses are objects laid out on a shared surface — not rows in a list.
 * Color belongs to people: every expense token is neutral stone, and the
 * color in the scene is the members assigned to it. The core gesture is
 * "pick up a friend, paint their expenses" — tap a character in the dock
 * and they hop off their ledge; every expense you then tap toggles them
 * on or off it with a pop. Tap an expense with no one picked up to read
 * its full story and settle.
 */

const EXPENSE_HUES = [335, 218, 158, 40, 272, 52];

function expenseEmoji(title: string): string {
    const t = title.toLowerCase();
    if (/uber|lyft|taxi|ride|car|gas|transit|bus|train/.test(t)) return '🚗';
    if (/food|dinner|lunch|breakfast|eat|restaurant|pizza|sushi|meal/.test(t)) return '🍽️';
    if (/drink|beer|wine|alcohol|bar|pub/.test(t)) return '🍻';
    if (/grocery|groceries|shop|market|costco/.test(t)) return '🛒';
    if (/rent|mortgage|utility|hydro|electric|water|internet|wifi/.test(t)) return '🏠';
    if (/movie|film|netflix|cinema/.test(t)) return '🎬';
    if (/coffee|cafe|tim|starbucks/.test(t)) return '☕';
    if (/snack|chips|candy/.test(t)) return '🍿';
    if (/flight|travel|hotel|airbnb/.test(t)) return '✈️';
    const pool = ['💰', '📦', '🎉', '🧾', '💡', '🎮', '🎵', '🏃'];
    return pool[title.charCodeAt(0) % pool.length];
}

const SCREEN_W = Dimensions.get('window').width;
const GUTTER   = scale(18);
const COL_GAP  = scale(16);
const CARD_W   = Math.floor((SCREEN_W - GUTTER * 2 - COL_GAP) / 2);
const ROW_H    = vs(178);

function charColor(m: any): string {
    return m?.character_color ?? m?.avatar_color ?? '#6B7280';
}

interface CanvasModeViewProps {
    expenses: Expense[];
    members: any[];
    groupId: string;
    groupName: string;
    user: any;
    colors: any;
    isDark: boolean;
    onAddExpense: () => void;
    onSettle: (payment: any) => void;
    onClose: () => void;
    style?: ViewStyle;
}

// ─── Expense token — a stone on the table ────────────────────────────────────

function ExpenseToken({
    expense, index, x, y, rot, assignedMembers, activeMember, isOnActive, onPress, isDark, colors,
}: {
    expense: Expense;
    index: number;
    x: number;
    y: number;
    rot: number;
    assignedMembers: any[];
    activeMember: any | null;
    isOnActive: boolean;
    onPress: () => void;
    isDark: boolean;
    colors: any;
}) {
    const enter = useRef(new Animated.Value(0)).current;
    const bob   = useRef(new Animated.Value(0)).current;
    const pop   = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(140 + Math.min(index, 9) * 60),
            Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 280, useNativeDriver: true }),
        ]).start();

        // Each token drifts on its own slow tide — phase-shifted by index so
        // the table feels alive without ever feeling busy
        const period = 2600 + (index % 5) * 380;
        const drift = Animated.loop(Animated.sequence([
            Animated.timing(bob, { toValue: 1, duration: period, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(bob, { toValue: 0, duration: period, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        const t = setTimeout(() => drift.start(), 700 + (index % 6) * 130);
        return () => { clearTimeout(t); drift.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pop when the assignment roster changes — the token reacts to being touched
    const prevCount = useRef(assignedMembers.length);
    useEffect(() => {
        if (assignedMembers.length !== prevCount.current) {
            prevCount.current = assignedMembers.length;
            Animated.sequence([
                Animated.spring(pop, { toValue: 1.07, damping: 18, stiffness: 280, useNativeDriver: true }),
                Animated.spring(pop, { toValue: 1, damping: 22, stiffness: 200, useNativeDriver: true }),
            ]).start();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignedMembers.length]);

    const hue       = EXPENSE_HUES[index % 6];
    const emojiBg   = isDark ? `hsla(${hue},60%,60%,0.16)` : `hsla(${hue},70%,45%,0.10)`;
    const activeCol = activeMember ? charColor(activeMember) : colors.accent;

    const cardBg = isOnActive
        ? activeCol + (isDark ? '17' : '0D')
        : isDark ? 'rgba(255,255,255,0.055)' : '#FFFFFF';
    const cardBorder = isOnActive
        ? activeCol + (isDark ? 'B8' : '8C')
        : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

    const payerFirst = (expense.payer_name || '').split(' ')[0];

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: CARD_W,
                opacity: enter,
                transform: [
                    { translateY: Animated.add(
                        enter.interpolate({ inputRange: [0, 1], outputRange: [vs(18), 0] }),
                        bob.interpolate({ inputRange: [0, 1], outputRange: [0, -vs(4)] }),
                    ) },
                    { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }), pop) },
                    { rotate: `${rot}deg` },
                ],
            }}
        >
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                style={{
                    borderRadius: ms(20),
                    padding: scale(14),
                    backgroundColor: cardBg,
                    borderWidth: 1.2,
                    borderColor: cardBorder,
                    shadowColor: isOnActive ? activeCol : '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isOnActive ? 0.35 : isDark ? 0.30 : 0.08,
                    shadowRadius: isOnActive ? 14 : 10,
                    elevation: isOnActive ? 8 : 4,
                }}
            >
                {/* Toggle affordance — only while someone is picked up */}
                {activeMember && (
                    <View style={[styles.tokenBadge, isOnActive
                        ? { backgroundColor: activeCol }
                        : {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
                        },
                    ]}>
                        {isOnActive
                            ? <Check size={12} color="#FFFFFF" strokeWidth={3} />
                            : <Plus size={12} color={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.40)'} strokeWidth={2.5} />}
                    </View>
                )}

                <View style={[styles.tokenEmojiChip, { backgroundColor: emojiBg }]}>
                    <Text style={{ fontSize: ms(18) }}>{expenseEmoji(expense.title)}</Text>
                </View>

                <Text style={[styles.tokenTitle, { color: colors.text }, T.semibold]} numberOfLines={2}>
                    {expense.title}
                </Text>
                <Text style={[styles.tokenAmount, { color: colors.text, fontVariant: ['tabular-nums'] }, T.bold]}>
                    ${formatCurrency(expense.amount)}
                </Text>
                <Text style={[styles.tokenPayer, { color: colors.faintText }, T.regular]} numberOfLines={1}>
                    {payerFirst} paid
                </Text>

                {/* Who's on it — the people are the color */}
                {assignedMembers.length > 0 && (
                    <View style={styles.tokenPips}>
                        {assignedMembers.slice(0, 4).map((m, pi) => (
                            <View key={m.user_id} style={[styles.tokenPipWrap, { marginLeft: pi > 0 ? -scale(8) : 0 }]}>
                                <CharacterShape
                                    variant="cluster"
                                    shape={m.character_shape ?? 'rect'}
                                    color={charColor(m)}
                                />
                            </View>
                        ))}
                        {assignedMembers.length > 4 && (
                            <Text style={[styles.tokenPipMore, { color: colors.faintText }, T.semibold]}>
                                +{assignedMembers.length - 4}
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Member chip — a character standing on the ledge ─────────────────────────

function MemberChip({
    member, active, dimmed, onPress, isDark, colors,
}: {
    member: any;
    active: boolean;
    dimmed: boolean;
    onPress: () => void;
    isDark: boolean;
    colors: any;
}) {
    const lift = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(lift, { toValue: active ? 1 : 0, damping: 18, stiffness: 280, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const color = charColor(member);
    const first = (member.name || '').split(' ')[0];

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.memberChip}>
            <Animated.View
                style={{
                    height: 66,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    opacity: dimmed ? 0.4 : 1,
                    transform: [
                        { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -vs(8)] }) },
                        { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                    ],
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: active ? 0.45 : 0,
                    shadowRadius: 12,
                    elevation: active ? 6 : 0,
                }}
            >
                <CharacterShape
                    variant="mini"
                    shape={member.character_shape ?? 'rect'}
                    color={color}
                />
            </Animated.View>
            <Text
                style={[
                    styles.memberName,
                    { color: active ? color : (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)') },
                    active ? T.semibold : T.regular,
                ]}
                numberOfLines={1}
            >
                {first}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

export default function CanvasModeView({
    expenses, members, groupId, groupName, user, colors, isDark,
    onAddExpense, onSettle, onClose, style,
}: CanvasModeViewProps) {
    const insets = useSafeAreaInsets();

    // Who is currently "picked up" from the dock
    const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
    const activeMember = activeMemberId ? members.find(m => m.user_id === activeMemberId) ?? null : null;

    // Assignment edits layered over the real participant data — the canvas
    // starts truthful and lets you play from there
    const [overrides, setOverrides] = useState<Record<string, string[]>>({});
    const assignedIds = useCallback(
        (e: Expense) => overrides[e.id] ?? e.participants.map(p => p.user_id),
        [overrides],
    );

    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const sheetAnim = useRef(new Animated.Value(500)).current;

    // Chrome (header, dock, fab) arrives together, after the canvas exists
    const chrome = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(chrome, { toValue: 1, damping: 22, stiffness: 200, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Organic two-column scatter — deterministic jitter, no physics needed.
    // Order is preserved (newest first, same as the list view) so the spatial
    // layout still reads as a sequence.
    const layout = useMemo(() => expenses.map((_e, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return {
            x: GUTTER + col * (CARD_W + COL_GAP) + (((i * 53) % 17) - 8),
            y: row * ROW_H + (col === 1 ? vs(62) : 0) + (((i * 31) % 29) - 14),
            rot: (((i * 47) % 9) - 4) * 0.45,
        };
    }), [expenses]);

    const contentH = Math.ceil(expenses.length / 2) * ROW_H + vs(160);
    const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

    // Dust — faint depth, golden-angle scatter
    const DUST = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
        key: i,
        left: `${((i * 137.508) % 100).toFixed(1)}%` as any,
        top:  `${((i * 241.313) % 100).toFixed(1)}%` as any,
        size: i % 5 === 0 ? 2.2 : 1.2,
        a: i % 5 === 0 ? 1 : 0.5,
    })), []);

    // ── Interactions ──

    const pickUpMember = useCallback((uid: string) => {
        Haptics.selectionAsync();
        setActiveMemberId(prev => (prev === uid ? null : uid));
    }, []);

    const toggleAssign = useCallback((exp: Expense) => {
        if (!activeMemberId) return;
        const cur = assignedIds(exp);
        const has = cur.includes(activeMemberId);
        setOverrides(prev => ({
            ...prev,
            [exp.id]: has ? cur.filter(id => id !== activeMemberId) : [...cur, activeMemberId],
        }));
        Haptics.impactAsync(has ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    }, [activeMemberId, assignedIds]);

    const openSheet = useCallback((expId: string) => {
        setSelectedExpenseId(expId);
        Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
    }, [sheetAnim]);

    const closeSheet = useCallback(() => {
        Animated.timing(sheetAnim, { toValue: 500, useNativeDriver: true, duration: 220, easing: Easing.out(Easing.cubic) }).start(() => {
            setSelectedExpenseId(null);
        });
    }, [sheetAnim]);

    const settleGroup = useCallback(() => {
        const nonPayer = members.find(m => m.user_id !== user?.id);
        if (!nonPayer) return;
        onSettle({
            payee_id: nonPayer.user_id,
            payee_name: nonPayer.name,
            payee_email: nonPayer.email,
            payee_avatar_color: nonPayer.avatar_color,
            amount: 0,
            group_id: groupId,
            payer_id: user?.id,
            description: groupName,
        });
    }, [members, user, groupId, groupName, onSettle]);

    // ── Sheet data ──

    const selectedExpense = selectedExpenseId ? expenses.find(e => e.id === selectedExpenseId) ?? null : null;
    const sheetAssignedIds = selectedExpense ? assignedIds(selectedExpense) : [];
    const sheetAssigned = sheetAssignedIds
        .map(uid => members.find(m => m.user_id === uid))
        .filter(Boolean);
    const perPerson   = selectedExpense && sheetAssignedIds.length > 0 ? selectedExpense.amount / sheetAssignedIds.length : 0;
    const payerMember = selectedExpense ? members.find(m => m.user_id === selectedExpense.paid_by) ?? null : null;
    const iAmPayer    = selectedExpense?.paid_by === user?.id;
    const iAmAssigned = selectedExpense ? sheetAssignedIds.includes(user?.id) : false;
    const payerFirst  = selectedExpense ? (selectedExpense.payer_name || 'payer').split(' ')[0] : '';

    const activeFirst = activeMember ? (activeMember.name || '').split(' ')[0] : '';

    // ── Render ──

    return (
        <View style={[styles.root, style]}>
            <View style={styles.canvas}>
                <LinearGradient
                    colors={colors.heroGradient as [string, string, string]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                {DUST.map(d => (
                    <View key={d.key} pointerEvents="none" style={{
                        position: 'absolute', left: d.left, top: d.top,
                        width: d.size, height: d.size, borderRadius: d.size / 2,
                        backgroundColor: isDark
                            ? `rgba(255,255,255,${(0.34 * d.a).toFixed(2)})`
                            : `rgba(40,90,60,${(0.18 * d.a).toFixed(2)})`,
                    }} />
                ))}

                {/* ── The table ── */}
                {expenses.length === 0 ? (
                    <View style={[styles.emptyWrap, { paddingTop: insets.top + vs(90) }]}>
                        <View style={styles.emptyCast}>
                            {members.slice(0, 4).map(m => (
                                <View key={m.user_id} style={styles.emptyCastChar}>
                                    <CharacterShape
                                        variant="mini"
                                        shape={m.character_shape ?? 'rect'}
                                        color={charColor(m)}
                                    />
                                </View>
                            ))}
                        </View>
                        <View style={[styles.emptyLedge, { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)' }]} />
                        <Text style={[styles.emptyTitle, { color: colors.text }, T.bold]}>A quiet canvas</Text>
                        <Text style={[styles.emptySub, { color: colors.secondaryText }, T.regular]}>
                            Add the first expense and put it in play.
                        </Text>
                        <TouchableOpacity
                            style={[styles.emptyCta, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddExpense(); }}
                            activeOpacity={0.8}
                        >
                            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={[styles.emptyCtaText, T.semibold]}>Add expense</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: insets.top + vs(122),
                            paddingBottom: insets.bottom + vs(180),
                        }}
                    >
                        <View style={{ height: contentH }}>
                            {expenses.map((exp, i) => {
                                const aIds = assignedIds(exp);
                                const aMembers = aIds.map(uid => members.find(m => m.user_id === uid)).filter(Boolean);
                                return (
                                    <ExpenseToken
                                        key={exp.id}
                                        expense={exp}
                                        index={i}
                                        x={layout[i].x}
                                        y={layout[i].y}
                                        rot={layout[i].rot}
                                        assignedMembers={aMembers}
                                        activeMember={activeMember}
                                        isOnActive={!!activeMemberId && aIds.includes(activeMemberId)}
                                        onPress={() => (activeMemberId ? toggleAssign(exp) : openSheet(exp.id))}
                                        isDark={isDark}
                                        colors={colors}
                                    />
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {/* ── Header ── */}
                <Animated.View
                    style={[styles.header, {
                        paddingTop: insets.top + vs(8),
                        opacity: chrome,
                        transform: [{ translateY: chrome.interpolate({ inputRange: [0, 1], outputRange: [-vs(12), 0] }) }],
                    }]}
                    pointerEvents="box-none"
                >
                    <LinearGradient
                        colors={isDark
                            ? ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0)']
                            : ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0)']}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            style={[styles.closeChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.78)' }]}
                            onPress={onClose}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                        >
                            <X size={17} color={colors.text} strokeWidth={2.2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.settlePill, { backgroundColor: colors.gold + '26' }]}
                            onPress={settleGroup}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.settlePillText, { color: colors.gold }, T.semibold]}>Settle up</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.text }, T.extrabold]} numberOfLines={1}>
                        {groupName}
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.secondaryText }, T.regular]}>
                        {expenses.length === 0
                            ? 'Nothing on the table yet'
                            : `${expenses.length} expense${expenses.length === 1 ? '' : 's'} · $${formatCurrency(total)} on the table`}
                    </Text>
                </Animated.View>

                {/* ── Add — always within thumb's reach ── */}
                {expenses.length > 0 && (
                    <Animated.View
                        style={[styles.fabWrap, {
                            bottom: insets.bottom + vs(140),
                            opacity: chrome,
                            transform: [{ scale: chrome }],
                        }]}
                    >
                        <TouchableOpacity
                            style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddExpense(); }}
                            activeOpacity={0.8}
                        >
                            <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── Dock — the cast, standing on a ledge ── */}
                {expenses.length > 0 && (
                    <Animated.View
                        style={[styles.dock, {
                            opacity: chrome,
                            transform: [{ translateY: chrome.interpolate({ inputRange: [0, 1], outputRange: [vs(36), 0] }) }],
                        }]}
                        pointerEvents="box-none"
                    >
                        <LinearGradient
                            colors={[
                                'transparent',
                                isDark ? 'rgba(4,7,5,0.86)' : 'rgba(244,250,246,0.90)',
                                isDark ? 'rgba(4,7,5,0.99)' : 'rgba(244,250,246,0.99)',
                            ]}
                            locations={[0, 0.40, 1]}
                            style={StyleSheet.absoluteFillObject}
                            pointerEvents="none"
                        />
                        <View style={[styles.hintRow, { paddingBottom: vs(10) }]}>
                            {activeMember ? (
                                <>
                                    <Text style={[styles.hintText, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }, T.semibold]}>
                                        Tap what {activeFirst} is splitting
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.doneChip, { backgroundColor: colors.accent + '22' }]}
                                        onPress={() => { Haptics.selectionAsync(); setActiveMemberId(null); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.doneChipText, { color: colors.accent }, T.semibold]}>Done</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <Text style={[styles.hintText, { color: isDark ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.30)' }, T.regular]}>
                                    Pick a friend, then tap expenses to split
                                </Text>
                            )}
                        </View>
                        <View style={{ paddingBottom: insets.bottom + vs(12) }}>
                            <View style={[styles.ledge, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' }]} />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.dockScroll}
                            >
                                {members.map(m => (
                                    <MemberChip
                                        key={m.user_id}
                                        member={m}
                                        active={activeMemberId === m.user_id}
                                        dimmed={!!activeMemberId && activeMemberId !== m.user_id}
                                        onPress={() => pickUpMember(m.user_id)}
                                        isDark={isDark}
                                        colors={colors}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    </Animated.View>
                )}

                {/* Backdrop while the sheet is up */}
                {selectedExpenseId && (
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet}>
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.52)' }]} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Detail sheet ── */}
            <Animated.View
                style={[
                    styles.sheet,
                    { backgroundColor: isDark ? '#141C16' : '#F5FAF6', transform: [{ translateY: sheetAnim }] },
                ]}
                pointerEvents={selectedExpenseId ? 'box-none' : 'none'}
            >
                <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />

                {selectedExpense && (
                    <>
                        <View style={styles.sheetTitleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetTitle, { color: colors.text }, T.semibold]} numberOfLines={1}>
                                    {expenseEmoji(selectedExpense.title)} {selectedExpense.title}
                                </Text>
                                <Text style={[styles.sheetSubtitle, { color: colors.secondaryText }, T.regular]}>
                                    {payerFirst} paid
                                    {sheetAssignedIds.length > 0 && ` · $${formatCurrency(perPerson)} each between ${sheetAssignedIds.length}`}
                                </Text>
                            </View>
                            <Text style={[styles.sheetAmount, { color: colors.text, fontVariant: ['tabular-nums'] }, T.bold]}>
                                ${formatCurrency(selectedExpense.amount)}
                            </Text>
                            <TouchableOpacity onPress={closeSheet} style={styles.sheetCloseBtn} activeOpacity={0.7}>
                                <X size={18} color={colors.faintText} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetContent}>
                            {sheetAssigned.length === 0 ? (
                                <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                    No one's on this yet — pick a friend from the dock, then tap this expense.
                                </Text>
                            ) : (
                                sheetAssigned.map(m => {
                                    const isPayer = m.user_id === selectedExpense.paid_by;
                                    const net = isPayer ? selectedExpense.amount - perPerson : -perPerson;
                                    const pos = net > 0;
                                    return (
                                        <View key={m.user_id} style={styles.balanceRow}>
                                            <View style={styles.balanceCharWrap}>
                                                <CharacterShape
                                                    variant="cluster"
                                                    shape={m.character_shape ?? 'rect'}
                                                    color={charColor(m)}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.balanceName, { color: colors.text }, T.semibold]}>
                                                    {m.user_id === user?.id ? 'You' : (m.name || '').split(' ')[0]}
                                                </Text>
                                                <Text style={[styles.balanceRole, { color: colors.secondaryText }, T.regular]}>
                                                    {isPayer ? 'Paid' : 'Owes'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.balanceNet, { color: pos ? colors.accent : colors.warningBright, fontVariant: ['tabular-nums'] }, T.semibold]}>
                                                {pos ? '+' : '−'}${formatCurrency(Math.abs(net))}
                                            </Text>
                                        </View>
                                    );
                                })
                            )}

                            {/* Context-aware action */}
                            {sheetAssigned.length > 0 && (
                                iAmPayer ? (
                                    <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                        You paid — everyone else owes you ${formatCurrency(perPerson)}.
                                    </Text>
                                ) : iAmAssigned ? (
                                    <TouchableOpacity
                                        style={[styles.payBtn, { backgroundColor: colors.gold, shadowColor: colors.gold }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            closeSheet();
                                            onSettle({
                                                payee_id: selectedExpense.paid_by,
                                                payee_name: payerMember?.name ?? 'User',
                                                payee_email: payerMember?.email ?? '',
                                                payee_avatar_color: payerMember?.avatar_color ?? '',
                                                amount: perPerson,
                                                group_id: groupId,
                                                payer_id: user?.id,
                                                description: selectedExpense.title,
                                            });
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.payBtnText, T.semibold]}>
                                            Pay {payerFirst} ${formatCurrency(perPerson)}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                        You're not on this one.
                                    </Text>
                                )
                            )}
                        </View>
                    </>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100,
    },
    canvas: { flex: 1, overflow: 'hidden' },

    // Header
    header: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        paddingHorizontal: scale(20),
        paddingBottom: vs(18),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(10),
    },
    closeChip: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    settlePill: {
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(7),
    },
    settlePillText: { fontSize: ms(13) },
    headerTitle: {
        fontSize: ms(26),
        letterSpacing: -0.8,
    },
    headerSub: {
        fontSize: ms(12.5),
        marginTop: vs(3),
    },

    // Expense token
    tokenBadge: {
        position: 'absolute',
        top: scale(10),
        right: scale(10),
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    tokenEmojiChip: {
        width: scale(38),
        height: scale(38),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(8),
    },
    tokenTitle: {
        fontSize: ms(14),
        letterSpacing: -0.2,
        lineHeight: ms(18),
    },
    tokenAmount: {
        fontSize: ms(18),
        letterSpacing: -0.5,
        marginTop: vs(3),
    },
    tokenPayer: {
        fontSize: ms(11),
        marginTop: vs(1),
    },
    tokenPips: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: vs(8),
    },
    tokenPipWrap: {
        height: 32,
        justifyContent: 'flex-end',
    },
    tokenPipMore: {
        fontSize: ms(11),
        marginLeft: scale(5),
        marginBottom: vs(2),
    },

    // FAB
    fabWrap: {
        position: 'absolute',
        right: scale(20),
    },
    fab: {
        width: scale(52),
        height: scale(52),
        borderRadius: scale(26),
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },

    // Dock
    dock: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingTop: vs(34),
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
        paddingHorizontal: scale(20),
    },
    hintText: {
        fontSize: ms(12),
        letterSpacing: 0.2,
    },
    doneChip: {
        borderRadius: 999,
        paddingHorizontal: scale(12),
        paddingVertical: vs(4),
    },
    doneChipText: { fontSize: ms(12) },
    ledge: {
        position: 'absolute',
        left: scale(24),
        right: scale(24),
        bottom: vs(24),
        height: StyleSheet.hairlineWidth,
    },
    dockScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: scale(20),
    },
    memberChip: {
        alignItems: 'center',
        marginHorizontal: scale(9),
    },
    memberName: {
        fontSize: ms(11),
        marginTop: vs(7),
        letterSpacing: 0.2,
        maxWidth: scale(64),
        textAlign: 'center',
    },

    // Empty state
    emptyWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCast: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(14),
    },
    emptyCastChar: {
        justifyContent: 'flex-end',
    },
    emptyLedge: {
        width: scale(190),
        height: StyleSheet.hairlineWidth,
        marginTop: 0,
        marginBottom: vs(22),
    },
    emptyTitle: {
        fontSize: ms(20),
        letterSpacing: -0.4,
    },
    emptySub: {
        fontSize: ms(13),
        marginTop: vs(6),
        marginBottom: vs(20),
        textAlign: 'center',
        paddingHorizontal: scale(40),
    },
    emptyCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        borderRadius: 999,
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
        elevation: 6,
    },
    emptyCtaText: {
        color: '#FFFFFF',
        fontSize: ms(14),
    },

    // Sheet
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        maxHeight: vs(430),
        borderTopLeftRadius: ms(20),
        borderTopRightRadius: ms(20),
        paddingBottom: vs(28),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(2),
        alignSelf: 'center',
        marginTop: vs(10),
        marginBottom: vs(14),
    },
    sheetTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(20),
        gap: scale(10),
        marginBottom: vs(14),
    },
    sheetTitle: {
        fontSize: ms(17),
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: ms(12),
        marginTop: vs(2),
    },
    sheetAmount: {
        fontSize: ms(20),
        letterSpacing: -0.6,
        paddingTop: vs(1),
    },
    sheetCloseBtn: {
        padding: scale(4),
        marginTop: vs(2),
    },
    sheetContent: {
        paddingHorizontal: scale(20),
        gap: vs(12),
    },
    emptyHint: {
        fontSize: ms(13),
        textAlign: 'center',
        paddingVertical: vs(10),
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    balanceCharWrap: {
        width: 36,
        height: 34,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    balanceName: { fontSize: ms(14) },
    balanceRole: { fontSize: ms(11), marginTop: vs(1) },
    balanceNet: { fontSize: ms(16), letterSpacing: -0.3 },
    payBtn: {
        borderRadius: ms(14),
        paddingVertical: vs(13),
        alignItems: 'center',
        marginTop: vs(4),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 5,
    },
    payBtnText: { color: '#fff', fontSize: ms(15) },
});
