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

const HUB_R      = 82;
const BUBBLE_R   = 54;
const WALL_INSET = 56;

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

    // Hidden bubble ids (dismiss ×)
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const visibleExpenses = expenses.filter(e => !hiddenIds.has(e.id)).slice(0, 6);

    // Dynamic hub Y center — computed from canvas height
    const [canvasH, setCanvasH] = useState(0);
    const hubYCenter = canvasH > 0 ? Math.round(canvasH * 0.42) : 314;
    const hubYCenterRef = useRef(314);
    useEffect(() => { hubYCenterRef.current = hubYCenter; }, [hubYCenter]);

    const STARS = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
        key: i,
        left: `${((i * 137.508) % 100).toFixed(1)}%` as any,
        top:  `${((i * 241.313) % 100).toFixed(1)}%` as any,
        size: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.4 : 0.7,
    })), []);

    // Physics refs — updated every frame, no setState
    const posRef          = useRef<{ x: number; y: number }[]>([]);
    const velRef          = useRef<{ vx: number; vy: number }[]>([]);
    const bubbleRefs      = useRef<(View | null)[]>([]);
    const rafRef          = useRef<number>(0);
    const canvasDimRef    = useRef({ w: 0, h: 0 });
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

    const sheetAnim    = useRef(new Animated.Value(500)).current;
    const hubScaleAnim = useRef(new Animated.Value(1)).current;

    // Hub breathing animation
    useEffect(() => {
        const breath = Animated.loop(Animated.sequence([
            Animated.timing(hubScaleAnim, { toValue: 1.018, duration: 3000, useNativeDriver: true }),
            Animated.timing(hubScaleAnim, { toValue: 1,     duration: 3000, useNativeDriver: true }),
        ]));
        breath.start();
        return () => breath.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Physics ────────────────────────────────────────────────────────────────

    const initPositions = useCallback((w: number, h: number, count: number, hubY: number) => {
        if (count === 0) return;
        const hubX = w / 2;
        const r = Math.min(175, h * 0.36, w * 0.42);
        const positions: { x: number; y: number }[] = [];
        const velocities: { vx: number; vy: number }[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            positions.push({
                x: Math.max(WALL_INSET + BUBBLE_R, Math.min(w - WALL_INSET - BUBBLE_R, hubX + Math.cos(angle) * r)),
                y: Math.max(WALL_INSET + BUBBLE_R, Math.min(h - WALL_INSET - BUBBLE_R, hubY + Math.sin(angle) * r)),
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
            const hubY = hubYCenterRef.current;
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
                const dy = y - hubY;
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
        canvasDimRef.current = { w: width, h: height };
        canvasViewRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
            canvasOriginRef.current = { x: px, y: py };
        });
        setCanvasH(height);
    }, []);

    // Re-init whenever canvas size or visible expense count changes
    useEffect(() => {
        if (!canvasH) return;
        const { w, h } = canvasDimRef.current;
        const hubY = Math.round(h * 0.42);
        initPositions(w, h, visibleExpenses.length, hubY);
        startLoop(w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasH, visibleExpenses.length, initPositions, startLoop]);

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
        ? (() => { const h = EXPENSE_HUES[selectedBubbleIdx % 6]; return isDark ? `hsla(${h},88%,90%,1)` : `hsla(${h},65%,26%,1)`; })()
        : colors.text;

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <View style={[styles.root, style]}>
            {/* ── Canvas (fills entire screen) ── */}
            <View ref={canvasViewRef} style={styles.canvas} onLayout={handleCanvasLayout}>
                <LinearGradient
                    colors={colors.heroGradient as [string, string, string]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Star field */}
                {STARS.map(s => (
                    <View key={s.key} style={{
                        position: 'absolute', left: s.left, top: s.top,
                        width: s.size, height: s.size, borderRadius: s.size / 2,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(80,100,200,0.25)',
                        pointerEvents: 'none',
                    }} />
                ))}

                {/* Nebula glow */}
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: 320, height: 320,
                        borderRadius: 160,
                        alignSelf: 'center',
                        top: hubYCenter - 160,
                        backgroundColor: 'transparent',
                        shadowColor: colors.accent,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isDark ? 0.18 : 0.12,
                        shadowRadius: 80,
                        elevation: 0,
                    }}
                />

                {/* Orbit rings */}
                {[296, 428, 560].map(size => (
                    <View
                        key={size}
                        style={[
                            styles.orbitRing,
                            {
                                width: size, height: size, borderRadius: size / 2,
                                top: hubYCenter - size / 2,
                                borderColor: isDark ? colors.accent + '0E' : colors.accent + '16',
                            },
                        ]}
                    />
                ))}

                {/* Hub */}
                <Animated.View
                    style={[
                        styles.hub,
                        {
                            top: hubYCenter - HUB_R,
                            backgroundColor: isDark ? 'rgba(8,14,26,0.92)' : 'rgba(255,255,255,0.97)',
                            borderColor: colors.accent + '60',
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.22,
                            shadowRadius: 40,
                            transform: [{ scale: hubScaleAnim }],
                        },
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
                </Animated.View>

                {/* Expense bubbles */}
                {visibleExpenses.map((exp, i) => {
                    const h         = EXPENSE_HUES[i % 6];
                    const bg        = isDark ? `hsla(${h},58%,60%,0.20)` : `hsla(${h},55%,48%,0.14)`;
                    const border    = isDark ? `hsla(${h},78%,68%,0.56)` : `hsla(${h},70%,44%,0.48)`;
                    const tc        = isDark ? `hsla(${h},88%,90%,1)`    : `hsla(${h},65%,26%,1)`;
                    const shadowCol = isDark ? `hsla(${h},70%,55%,1)`    : `hsla(${h},70%,50%,1)`;
                    const hovered   = highlightBubbleIdx === i;
                    const assignedUids = assignments[exp.id] ?? [];
                    const pips = assignedUids
                        .map(uid => members.find(m => m.user_id === uid))
                        .filter(Boolean)
                        .slice(0, 3);
                    const payer = members.find(m => m.user_id === exp.paid_by);

                    return (
                        <View
                            key={exp.id}
                            ref={el => { bubbleRefs.current[i] = el; }}
                            style={[
                                styles.bubble,
                                {
                                    backgroundColor: bg,
                                    borderColor: hovered ? colors.accent : border,
                                    borderWidth: hovered ? 2.5 : 1.5,
                                    shadowColor: shadowCol,
                                    shadowOpacity: hovered ? 0.55 : 0.32,
                                    shadowRadius: hovered ? 22 : 10,
                                    elevation: hovered ? 10 : 5,
                                },
                            ]}
                        >
                            {/* Dismiss */}
                            <TouchableOpacity
                                style={styles.bubbleX}
                                onPress={() => setHiddenIds(prev => new Set([...prev, exp.id]))}
                                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                                <X size={10} color={tc} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.bubbleTouchable} onPress={() => openSheet(exp.id)} activeOpacity={0.85}>
                                {/* Payer character */}
                                {payer && (
                                    <View style={styles.bubblePayerWrap}>
                                        <CharacterShape
                                            variant="cluster"
                                            shape={payer.character_shape ?? 'rect'}
                                            color={payer.character_color ?? payer.avatar_color ?? '#6B7280'}
                                        />
                                    </View>
                                )}
                                <Text
                                    style={[styles.bubbleTitle, { color: tc, textShadowColor: isDark ? shadowCol : 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: isDark ? 12 : 0 }, T.extrabold]}
                                    numberOfLines={2}
                                >
                                    {expenseEmoji(exp.title)} {exp.title}
                                </Text>
                                <Text style={[styles.bubbleAmount, { color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(26,31,46,0.62)' }, T.bold]}>
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
                                                    shape={m.character_shape ?? 'rect'}
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

                {/* Drag ghost — member's CharacterShape */}
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

                {/* Backdrop (sheet dimmer) */}
                {selectedExpenseId && (
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet}>
                        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
                    </TouchableOpacity>
                )}

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.backBtn, { paddingTop: insets.top + vs(8) }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={17} color={isDark ? colors.accent : colors.accentDark} />
                    <Text style={[styles.backText, { color: isDark ? colors.accent : colors.accentDark }, T.bold]}>Back</Text>
                </TouchableOpacity>

                {/* ── Friend dock (absolute overlay at canvas bottom) ── */}
                <LinearGradient
                    colors={[
                        'transparent',
                        isDark ? 'rgba(4,6,14,0.92)' : 'rgba(236,240,250,0.95)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.dock, {
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        paddingBottom: insets.bottom + vs(12),
                    }]}
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
                                            shape={m.character_shape ?? 'rect'}
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
                </LinearGradient>
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
        width: HUB_R * 2,
        height: HUB_R * 2,
        borderRadius: HUB_R,
        borderWidth: 2,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
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
    },
    bubbleTouchable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(6),
        gap: vs(2),
    },
    bubblePayerWrap: {
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: vs(2),
    },
    bubbleTitle: {
        fontSize: ms(12),
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
    bubbleX: {
        position: 'absolute',
        top: scale(6),
        right: scale(6),
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingTop: vs(24),
        paddingHorizontal: scale(16),
        alignItems: 'center',
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
        justifyContent: 'center',
        width: '100%',
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
