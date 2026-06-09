import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    LayoutChangeEvent,
    ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import { Expense } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { ArrowLeft, X } from 'lucide-react-native';
import CharacterShape from './CharacterShape';

// Pre-computed rgba approximations for 6 hue palette entries
// Columns: [bgDark, bgLight, borderDark, borderLight, textDark, textLight]
const BUBBLE_PALETTES = [
    ['rgba(219,105,146,0.12)', 'rgba(219,105,146,0.10)', 'rgba(219,105,146,0.42)', 'rgba(219,105,146,0.35)', 'rgba(255,160,192,1)', 'rgba(180,55,95,1)'],
    ['rgba(80,122,206,0.12)',  'rgba(80,122,206,0.10)',  'rgba(80,122,206,0.42)',  'rgba(80,122,206,0.35)',  'rgba(150,190,255,1)', 'rgba(50,100,185,1)'],
    ['rgba(75,192,151,0.12)',  'rgba(75,192,151,0.10)',  'rgba(75,192,151,0.42)',  'rgba(75,192,151,0.35)',  'rgba(150,240,210,1)', 'rgba(35,150,115,1)'],
    ['rgba(206,164,75,0.12)',  'rgba(206,164,75,0.10)',  'rgba(206,164,75,0.42)',  'rgba(206,164,75,0.35)',  'rgba(255,225,150,1)', 'rgba(175,120,35,1)'],
    ['rgba(162,80,206,0.12)',  'rgba(162,80,206,0.10)',  'rgba(162,80,206,0.42)',  'rgba(162,80,206,0.35)',  'rgba(215,160,255,1)', 'rgba(130,50,180,1)'],
    ['rgba(192,192,75,0.12)',  'rgba(192,192,75,0.10)',  'rgba(192,192,75,0.42)',  'rgba(192,192,75,0.35)',  'rgba(245,245,150,1)', 'rgba(155,155,35,1)'],
];

const HUB_R = 82;
const BUBBLE_R = 50;
const WALL_INSET = 56;
const HUB_Y_CENTER = 314; // canvas-local Y of hub center

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

export default function CanvasModeView({
    expenses, members, groupId, groupName, user, colors, isDark,
    onAddExpense, onSettle, onClose, style,
}: CanvasModeViewProps) {
    const insets = useSafeAreaInsets();
    const visibleExpenses = expenses.slice(0, 6);

    // Physics refs — updated every frame, no setState
    const posRef          = useRef<{ x: number; y: number }[]>([]);
    const velRef          = useRef<{ vx: number; vy: number }[]>([]);
    const bubbleRefs      = useRef<(View | null)[]>([]);
    const rafRef          = useRef<number>(0);
    const canvasOriginRef = useRef({ x: 0, y: 0 });
    const canvasViewRef   = useRef<View>(null);

    // Drag state
    const [ghost, setGhost] = useState<{
        x: number; y: number; shape: string; color: string;
    } | null>(null);
    const dragMemberRef = useRef<any>(null);

    // Up-to-date copies accessible inside stable callbacks
    const membersRef           = useRef(members);
    membersRef.current         = members;
    const visibleExpensesRef   = useRef(visibleExpenses);
    visibleExpensesRef.current = visibleExpenses;

    const [assignments, setAssignments]               = useState<Record<string, string[]>>({});
    const [selectedExpenseId, setSelectedExpenseId]   = useState<string | null>(null);
    const [sheetTab, setSheetTab]                     = useState<'balance' | 'settle'>('balance');
    const [highlightBubbleIdx, setHighlightBubbleIdx] = useState(-1);

    const sheetAnim = useRef(new Animated.Value(500)).current;

    // ─── Physics ────────────────────────────────────────────────────────────────

    const initPositions = useCallback((w: number, h: number, count: number) => {
        if (count === 0) return;
        const hubX = w / 2;
        const r = Math.min(175, h * 0.36, w * 0.42);
        const positions: { x: number; y: number }[] = [];
        const velocities: { vx: number; vy: number }[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            positions.push({
                x: Math.max(WALL_INSET + BUBBLE_R, Math.min(w - WALL_INSET - BUBBLE_R, hubX + Math.cos(angle) * r)),
                y: Math.max(WALL_INSET + BUBBLE_R, Math.min(h - WALL_INSET - BUBBLE_R, HUB_Y_CENTER + Math.sin(angle) * r)),
            });
            velocities.push({ vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
        }
        posRef.current = positions;
        velRef.current = velocities;
        positions.forEach((p, i) => {
            bubbleRefs.current[i]?.setNativeProps({
                style: { transform: [{ translateX: p.x - BUBBLE_R }, { translateY: p.y - BUBBLE_R }] },
            });
        });
    }, []);

    const startLoop = useCallback((w: number, h: number) => {
        cancelAnimationFrame(rafRef.current);
        const hubX = w / 2;

        const tick = () => {
            const pos = posRef.current;
            const vel = velRef.current;
            for (let i = 0; i < pos.length; i++) {
                let { x, y } = pos[i];
                let { vx, vy } = vel[i];

                vx += (Math.random() - 0.5) * 0.006;
                vy += (Math.random() - 0.5) * 0.006;
                vx *= 0.997;
                vy *= 0.997;
                const speed = Math.sqrt(vx * vx + vy * vy);
                if (speed > 0.55) { vx = (vx / speed) * 0.55; vy = (vy / speed) * 0.55; }

                // Repel from hub
                const dx = x - hubX;
                const dy = y - HUB_Y_CENTER;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minHub = HUB_R + BUBBLE_R + 26;
                if (dist < minHub) {
                    const f = ((minHub - dist) / minHub) * 0.4;
                    vx += (dx / dist) * f;
                    vy += (dy / dist) * f;
                }

                // Repel from siblings
                for (let j = 0; j < pos.length; j++) {
                    if (i === j) continue;
                    const ox = x - pos[j].x;
                    const oy = y - pos[j].y;
                    const od = Math.sqrt(ox * ox + oy * oy) || 1;
                    const minBub = BUBBLE_R * 2 + 18;
                    if (od < minBub) {
                        const f = ((minBub - od) / minBub) * 0.3;
                        vx += (ox / od) * f;
                        vy += (oy / od) * f;
                    }
                }

                x += vx;
                y += vy;
                if (x < WALL_INSET + BUBBLE_R) { x = WALL_INSET + BUBBLE_R; vx = Math.abs(vx) * 0.6; }
                if (x > w - WALL_INSET - BUBBLE_R) { x = w - WALL_INSET - BUBBLE_R; vx = -Math.abs(vx) * 0.6; }
                if (y < WALL_INSET + BUBBLE_R) { y = WALL_INSET + BUBBLE_R; vy = Math.abs(vy) * 0.6; }
                if (y > h - WALL_INSET - BUBBLE_R) { y = h - WALL_INSET - BUBBLE_R; vy = -Math.abs(vy) * 0.6; }

                pos[i] = { x, y };
                vel[i] = { vx, vy };
                bubbleRefs.current[i]?.setNativeProps({
                    style: { transform: [{ translateX: x - BUBBLE_R }, { translateY: y - BUBBLE_R }] },
                });
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (!width || !height) return;
        canvasViewRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
            canvasOriginRef.current = { x: px, y: py };
        });
        initPositions(width, height, visibleExpenses.length);
        startLoop(width, height);
    }, [visibleExpenses.length, initPositions, startLoop]);

    // ─── Sheet ──────────────────────────────────────────────────────────────────

    const openSheet = useCallback((expId: string) => {
        setSelectedExpenseId(expId);
        setSheetTab('balance');
        Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
    }, [sheetAnim]);

    const closeSheet = useCallback(() => {
        Animated.timing(sheetAnim, { toValue: 500, useNativeDriver: true, duration: 220 }).start(() => {
            setSelectedExpenseId(null);
        });
    }, [sheetAnim]);

    // ─── Drag ───────────────────────────────────────────────────────────────────

    const nearestBubble = useCallback((pageX: number, pageY: number): number => {
        const { x: ox, y: oy } = canvasOriginRef.current;
        const cx = pageX - ox;
        const cy = pageY - oy;
        let best = -1;
        let bestD = Infinity;
        posRef.current.forEach((p, i) => {
            const d = Math.hypot(cx - p.x, cy - p.y);
            if (d < BUBBLE_R + 30 && d < bestD) { bestD = d; best = i; }
        });
        return best;
    }, []);

    // Stable PanResponder per member index — fresh data flows through refs
    const panResponders = useMemo(() => {
        return members.map((_m, memberIdx) =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: (evt) => {
                    const m = membersRef.current[memberIdx];
                    dragMemberRef.current = m;
                    const { pageX, pageY } = evt.nativeEvent;
                    const { x: ox, y: oy } = canvasOriginRef.current;
                    setGhost({
                        x: pageX - ox,
                        y: pageY - oy,
                        shape: m?.character_shape ?? 'rect',
                        color: m?.character_color ?? m?.avatar_color ?? '#6B7280',
                    });
                },
                onPanResponderMove: (evt) => {
                    const { pageX, pageY } = evt.nativeEvent;
                    const { x: ox, y: oy } = canvasOriginRef.current;
                    setGhost(prev => prev ? { ...prev, x: pageX - ox, y: pageY - oy } : null);
                    setHighlightBubbleIdx(nearestBubble(pageX, pageY));
                },
                onPanResponderRelease: (evt) => {
                    setGhost(null);
                    setHighlightBubbleIdx(-1);
                    const nearest = nearestBubble(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                    if (nearest >= 0 && dragMemberRef.current) {
                        const exp = visibleExpensesRef.current[nearest];
                        const uid = dragMemberRef.current.user_id;
                        setAssignments(prev => {
                            const cur = prev[exp.id] ?? [];
                            if (cur.includes(uid)) return prev;
                            return { ...prev, [exp.id]: [...cur, uid] };
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    dragMemberRef.current = null;
                },
                onPanResponderTerminate: () => {
                    setGhost(null);
                    setHighlightBubbleIdx(-1);
                    dragMemberRef.current = null;
                },
            })
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members.length, nearestBubble]);

    // ─── Derived sheet data ──────────────────────────────────────────────────────

    const selectedExpense = useMemo(
        () => (selectedExpenseId ? visibleExpenses.find(e => e.id === selectedExpenseId) ?? null : null),
        [selectedExpenseId, visibleExpenses],
    );
    const selectedAssigned        = selectedExpense ? (assignments[selectedExpense.id] ?? []) : [];
    const selectedAssignedMembers = selectedAssigned
        .map(uid => members.find(m => m.user_id === uid))
        .filter(Boolean);
    const perPerson   = selectedExpense && selectedAssigned.length > 0 ? selectedExpense.amount / selectedAssigned.length : 0;
    const payerMember = selectedExpense ? members.find(m => m.user_id === selectedExpense.paid_by) ?? null : null;
    const iAmPayer    = selectedExpense?.paid_by === user?.id;
    const iAmAssigned = selectedExpense ? selectedAssigned.includes(user?.id) : false;

    const selectedBubbleIdx = selectedExpense ? visibleExpenses.findIndex(e => e.id === selectedExpense.id) : -1;
    const sheetTitleColor   = selectedBubbleIdx >= 0
        ? (isDark ? BUBBLE_PALETTES[selectedBubbleIdx % 6][4] : BUBBLE_PALETTES[selectedBubbleIdx % 6][5])
        : colors.text;

    const canvasGrad: [string, string, string] = isDark
        ? ['rgba(18,42,26,0.98)', '#0B130E', '#070B08']
        : ['rgba(220,240,228,0.98)', '#F0F7F2', '#EBF4EE'];

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <View style={[styles.root, style]}>
            {/* ── Canvas (fills above the dock) ── */}
            <View ref={canvasViewRef} style={styles.canvas} onLayout={handleCanvasLayout}>
                <LinearGradient colors={canvasGrad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFillObject} />

                {/* Orbit rings — each centered on hub */}
                {[296, 428, 560].map((size, i) => (
                    <View
                        key={size}
                        style={[
                            styles.orbitRing,
                            {
                                width: size, height: size, borderRadius: size / 2,
                                top: HUB_Y_CENTER - size / 2,
                                borderColor: isDark
                                    ? `rgba(34,197,94,${0.05 - i * 0.01})`
                                    : `rgba(34,197,94,${0.08 - i * 0.015})`,
                            },
                        ]}
                    />
                ))}

                {/* Hub */}
                <View
                    style={[
                        styles.hub,
                        { backgroundColor: isDark ? '#0F1D14' : '#E8F5EE', borderColor: colors.accent + '73', shadowColor: colors.accent },
                    ]}
                >
                    <Text style={[styles.hubName, { color: colors.text }, T.extrabold]} numberOfLines={2}>{groupName}</Text>
                    <View style={styles.hubPills}>
                        <TouchableOpacity
                            style={[styles.hubPill, { backgroundColor: colors.accent + '29', borderColor: colors.accent + '47' }]}
                            onPress={onAddExpense}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.hubPillText, { color: colors.accent }, T.bold]}>＋ Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.hubPill, { backgroundColor: colors.gold + '2E', borderColor: colors.gold + '38' }]}
                            onPress={() => {
                                const nonPayer = members.find(m => m.user_id !== user?.id);
                                if (nonPayer) {
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
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.hubPillText, { color: colors.gold }, T.bold]}>⟶ Settle</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Expense bubbles */}
                {visibleExpenses.map((exp, i) => {
                    const pal    = BUBBLE_PALETTES[i % 6];
                    const bg     = isDark ? pal[0] : pal[1];
                    const border = isDark ? pal[2] : pal[3];
                    const tc     = isDark ? pal[4] : pal[5];
                    const assignedUids = assignments[exp.id] ?? [];
                    const pips = assignedUids
                        .map(uid => members.find(m => m.user_id === uid))
                        .filter(Boolean)
                        .slice(0, 3);
                    const lit = highlightBubbleIdx === i;

                    return (
                        <View
                            key={exp.id}
                            ref={el => { bubbleRefs.current[i] = el; }}
                            style={[
                                styles.bubble,
                                {
                                    backgroundColor: bg,
                                    borderColor: lit ? colors.accent : border,
                                    borderWidth: lit ? 2.5 : 1.5,
                                    shadowColor: lit ? colors.accent : 'transparent',
                                    shadowOpacity: lit ? 0.5 : 0,
                                    shadowRadius: lit ? 14 : 0,
                                },
                            ]}
                        >
                            <TouchableOpacity style={styles.bubbleTouchable} onPress={() => openSheet(exp.id)} activeOpacity={0.85}>
                                <Text style={[styles.bubbleTitle, { color: tc }, T.extrabold]} numberOfLines={2}>{exp.title}</Text>
                                <Text style={[styles.bubbleAmount, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }, T.bold]}>
                                    ${formatCurrency(exp.amount)}
                                </Text>
                                {pips.length > 0 && (
                                    <View style={styles.bubblePips}>
                                        {pips.map((m, pi) => (
                                            <View
                                                key={m.user_id}
                                                style={[styles.pipWrap, { marginLeft: pi > 0 ? -7 : 0 }]}
                                            >
                                                <CharacterShape
                                                    variant="cluster"
                                                    shape={m.character_shape ?? 'semi'}
                                                    color={m.character_color ?? m.avatar_color ?? '#6B7280'}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Drag ghost */}
                {ghost && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: ghost.x - scale(22),
                            top: ghost.y - vs(30),
                            zIndex: 200,
                            opacity: 0.92,
                        }}
                    >
                        <CharacterShape
                            variant="mini"
                            shape={ghost.shape as any}
                            color={ghost.color}
                        />
                    </View>
                )}

                {/* Backdrop inside canvas (sheet dimmer) */}
                {selectedExpenseId && (
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet}>
                        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
                    </TouchableOpacity>
                )}

                {/* Back button — floats over canvas, clears Dynamic Island */}
                <TouchableOpacity
                    style={[styles.backBtn, { paddingTop: insets.top + vs(8) }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={17} color={isDark ? colors.accent : colors.accentDark} />
                    <Text style={[styles.backText, { color: isDark ? colors.accent : colors.accentDark }, T.bold]}>Back</Text>
                </TouchableOpacity>
            </View>

            {/* ── Friend dock ── */}
            <View
                style={[
                    styles.dock,
                    {
                        backgroundColor: isDark ? 'rgba(8,12,9,0.96)' : 'rgba(245,249,246,0.97)',
                        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        paddingBottom: insets.bottom + vs(8),
                    },
                ]}
            >
                <Text style={[styles.dockLabel, T.bold]}>DRAG FRIENDS INTO EXPENSES</Text>
                <View style={styles.dockAvatarRow}>
                    {members.map((m, i) => {
                        const pr = panResponders[i];
                        if (!pr) return null;
                        return (
                            <View key={m.user_id} style={styles.dockAvatarWrap} {...pr.panHandlers}>
                                <View style={styles.dockCharacterWrap}>
                                    <CharacterShape
                                        variant="mini"
                                        shape={m.character_shape ?? 'semi'}
                                        color={m.character_color ?? m.avatar_color ?? '#6B7280'}
                                    />
                                </View>
                                <Text style={[styles.dockAvatarName, { color: colors.faintText }, T.regular]} numberOfLines={1}>
                                    {(m.name || '').split(' ')[0]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
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
                        {/* Title row */}
                        <View style={styles.sheetTitleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetTitle, { color: sheetTitleColor }, T.extrabold]} numberOfLines={1}>
                                    {selectedExpense.title}
                                </Text>
                                <Text style={[styles.sheetSubtitle, { color: colors.secondaryText }, T.regular]}>
                                    {selectedExpense.payer_name} paid · {selectedAssigned.length} splitting
                                </Text>
                            </View>
                            <Text style={[styles.sheetAmount, { color: colors.text }, T.extrabold]}>
                                ${formatCurrency(selectedExpense.amount)}
                            </Text>
                            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn} activeOpacity={0.8}>
                                <X size={18} color={colors.faintText} />
                            </TouchableOpacity>
                        </View>

                        {/* Assigned pills */}
                        {selectedAssignedMembers.length > 0 && (
                            <View style={styles.assignedRow}>
                                {selectedAssignedMembers.map(m => (
                                    <View
                                        key={m.user_id}
                                        style={[
                                            styles.assignedPill,
                                            {
                                                backgroundColor: (m.character_color || m.avatar_color || colors.accent) + '22',
                                                borderColor: (m.character_color || m.avatar_color || colors.accent) + '44',
                                            },
                                        ]}
                                    >
                                        <View style={[styles.assignedPip, { backgroundColor: m.character_color || m.avatar_color || colors.accent }]} />
                                        <Text style={[styles.assignedPillName, { color: colors.text }, T.semibold]}>
                                            {(m.name || '').split(' ')[0]}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Tab bar */}
                        <View style={[styles.sheetTabBar, { borderBottomColor: colors.border }]}>
                            {(['balance', 'settle'] as const).map(tab => {
                                const active = sheetTab === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        style={styles.sheetTabBtn}
                                        onPress={() => setSheetTab(tab)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.sheetTabText, { color: active ? colors.accent : colors.faintText }, active ? T.bold : T.semibold]}>
                                            {tab === 'balance' ? 'Balance' : 'Settle'}
                                        </Text>
                                        <View style={[styles.sheetTabUnderline, { backgroundColor: active ? colors.accent : 'transparent' }]} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Tab content */}
                        <View style={styles.sheetContent}>
                            {sheetTab === 'balance' && (
                                selectedAssigned.length === 0 ? (
                                    <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                        Drag friends from the dock below to assign them to this expense.
                                    </Text>
                                ) : (
                                    selectedAssignedMembers.map(m => {
                                        const isPayer = m.user_id === selectedExpense.paid_by;
                                        const net     = isPayer ? selectedExpense.amount - perPerson : -perPerson;
                                        const pos     = net > 0;
                                        return (
                                            <View key={m.user_id} style={styles.balanceRow}>
                                                <View style={[styles.balanceAvatar, { backgroundColor: m.character_color || m.avatar_color || colors.accent }]}>
                                                    <Text style={[styles.balanceAvatarText, T.bold]}>{(m.name || '?')[0].toUpperCase()}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.balanceName, { color: colors.text }, T.semibold]}>
                                                        {m.user_id === user?.id ? 'You' : (m.name || '').split(' ')[0]}
                                                    </Text>
                                                    <Text style={[styles.balanceRole, { color: colors.secondaryText }, T.regular]}>
                                                        {isPayer ? 'Paid' : 'Owes'}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.balanceNet, { color: pos ? colors.accent : colors.warningBright }, T.extrabold]}>
                                                    {pos ? '+' : ''}${formatCurrency(Math.abs(net))}
                                                </Text>
                                            </View>
                                        );
                                    })
                                )
                            )}

                            {sheetTab === 'settle' && (
                                iAmPayer ? (
                                    <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                        You paid — others owe you ${formatCurrency(perPerson)} each.
                                    </Text>
                                ) : iAmAssigned ? (
                                    <View style={[styles.payCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                                        <View style={styles.payCardAvatarRow}>
                                            <View style={[styles.payAvatar, { backgroundColor: user?.character_color || colors.accent }]}>
                                                <Text style={[styles.payAvatarText, T.bold]}>{(user?.name || '?')[0].toUpperCase()}</Text>
                                            </View>
                                            <Text style={[styles.payArrow, { color: colors.faintText }]}>→</Text>
                                            <View style={[styles.payAvatar, { backgroundColor: payerMember?.character_color || payerMember?.avatar_color || colors.accent }]}>
                                                <Text style={[styles.payAvatarText, T.bold]}>{(payerMember?.name || '?')[0].toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.payLabel, { color: colors.secondaryText }, T.regular]}>
                                            You owe {(payerMember?.name || 'payer').split(' ')[0]}
                                        </Text>
                                        <Text style={[styles.payAmount, { color: colors.warningBright }, T.extrabold]}>
                                            ${formatCurrency(perPerson)}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.payBtn, { backgroundColor: colors.gold, shadowColor: colors.gold }]}
                                            onPress={() => {
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
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.payBtnText, T.bold]}>Pay ${formatCurrency(perPerson)}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={[styles.emptyHint, { color: colors.faintText }, T.regular]}>
                                        Assign yourself from the dock to see your settlement.
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
        flexDirection: 'column',
    },

    // Canvas
    canvas: { flex: 1, overflow: 'hidden' },
    orbitRing: {
        position: 'absolute',
        borderStyle: 'dashed',
        borderWidth: 1,
        alignSelf: 'center',
    },

    hub: {
        position: 'absolute',
        width: 164,
        height: 164,
        borderRadius: 82,
        borderWidth: 2,
        alignSelf: 'center',
        top: HUB_Y_CENTER - 82,
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 30,
        elevation: 8,
        paddingHorizontal: scale(10),
    },
    hubName: {
        fontSize: ms(14),
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    hubPills: {
        flexDirection: 'row',
        gap: scale(6),
    },
    hubPill: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: scale(8),
        paddingVertical: vs(3),
    },
    hubPillText: { fontSize: ms(10) },

    bubble: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: BUBBLE_R * 2,
        height: BUBBLE_R * 2,
        borderRadius: BUBBLE_R,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    bubbleTouchable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(6),
        gap: vs(2),
    },
    bubbleTitle: {
        fontSize: ms(11),
        textAlign: 'center',
        lineHeight: 14,
    },
    bubbleAmount: {
        fontSize: ms(11),
        textAlign: 'center',
    },
    bubblePips: {
        flexDirection: 'row',
        marginTop: vs(2),
    },
    pipWrap: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },



    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },

    backBtn: {
        position: 'absolute',
        top: 0,
        left: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    backText: { fontSize: ms(14) },

    // Dock
    dock: {
        borderTopWidth: 1,
        paddingTop: vs(10),
        paddingHorizontal: scale(16),
        minHeight: 110,
    },
    dockLabel: {
        fontSize: ms(9),
        letterSpacing: 1.5,
        color: '#454D4A',
        marginBottom: vs(8),
    },
    dockAvatarRow: {
        flexDirection: 'row',
        gap: scale(16),
        flexWrap: 'nowrap',
    },
    dockAvatarWrap: {
        alignItems: 'center',
        gap: vs(4),
    },
    dockCharacterWrap: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    dockAvatarName: {
        fontSize: ms(10),
        maxWidth: 44,
    },

    // Sheet
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 420,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: vs(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: vs(10),
        marginBottom: vs(12),
    },
    sheetTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(18),
        gap: scale(10),
        marginBottom: vs(10),
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
        fontSize: ms(18),
        letterSpacing: -0.5,
        paddingTop: vs(1),
    },
    closeBtn: {
        padding: scale(4),
        marginTop: vs(2),
    },

    assignedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(6),
        paddingHorizontal: scale(18),
        marginBottom: vs(10),
    },
    assignedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        borderWidth: 1,
        borderRadius: 99,
        paddingHorizontal: scale(8),
        paddingVertical: vs(3),
    },
    assignedPip: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    assignedPillName: { fontSize: ms(12) },

    sheetTabBar: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: vs(12),
    },
    sheetTabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: vs(10),
    },
    sheetTabText: { fontSize: ms(14) },
    sheetTabUnderline: {
        position: 'absolute',
        bottom: 0,
        left: scale(12),
        right: scale(12),
        height: 2.5,
        borderRadius: 2,
    },

    sheetContent: {
        paddingHorizontal: scale(18),
        gap: vs(10),
    },
    emptyHint: {
        fontSize: ms(13),
        textAlign: 'center',
        paddingVertical: vs(12),
    },

    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    balanceAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceAvatarText: { color: '#fff', fontSize: ms(13) },
    balanceName: { fontSize: ms(14) },
    balanceRole: { fontSize: ms(11), marginTop: vs(1) },
    balanceNet: { fontSize: ms(16), letterSpacing: -0.3 },

    payCard: {
        borderWidth: 1,
        borderRadius: ms(16),
        padding: scale(16),
        alignItems: 'center',
        gap: vs(8),
    },
    payCardAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    payAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payAvatarText: { color: '#fff', fontSize: ms(15) },
    payArrow: { fontSize: ms(20) },
    payLabel: { fontSize: ms(13) },
    payAmount: { fontSize: ms(24), letterSpacing: -0.5 },
    payBtn: {
        borderRadius: ms(13),
        paddingHorizontal: scale(24),
        paddingVertical: vs(12),
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
        elevation: 6,
    },
    payBtnText: { color: '#fff', fontSize: ms(15) },
});
