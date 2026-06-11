import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    PanResponder,
    LayoutChangeEvent,
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

const SCREEN_W   = Dimensions.get('window').width;
const CARD_W     = scale(68);
const CARD_MX    = scale(14);
const ITEM_W     = CARD_W + CARD_MX * 2;
const SNAP_INSET = (SCREEN_W - CARD_W) / 2 - CARD_MX;

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

// A star that twinkles on its own clock — duration and phase keyed off its
// index so the field never pulses in unison
function TwinkleStar({ left, top, size, index, isDark }: {
    left: any; top: any; size: number; index: number; isDark: boolean;
}) {
    const tw = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const dur = 2000 + ((index * 727) % 3000);
        const loop = Animated.loop(Animated.sequence([
            Animated.delay((index * 211) % 1400),
            Animated.timing(tw, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(tw, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute', left, top,
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: isDark ? '#FFFFFF' : '#6478C8',
                opacity: tw.interpolate({ inputRange: [0, 1], outputRange: isDark ? [0.2, 0.6] : [0.12, 0.38] }),
            }}
        />
    );
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

    // Star field — three size classes, golden-angle scatter
    const STARS = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
        key: i,
        left: `${((i * 137.508) % 100).toFixed(1)}%` as any,
        top:  `${((i * 241.313) % 100).toFixed(1)}%` as any,
        size: i % 7 === 0 ? 2.0 : i % 3 === 0 ? 1.2 : 0.6,
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
    const lastHoverRef  = useRef(-1);

    // Up-to-date copies accessible inside stable callbacks
    const membersRef           = useRef(members);
    membersRef.current         = members;
    const visibleExpensesRef   = useRef(visibleExpenses);
    visibleExpensesRef.current = visibleExpenses;

    const [assignments, setAssignments]               = useState<Record<string, string[]>>({});
    const [selectedExpenseId, setSelectedExpenseId]   = useState<string | null>(null);
    const [sheetTab, setSheetTab]                     = useState<'balance' | 'settle'>('balance');
    const [highlightBubbleIdx, setHighlightBubbleIdx] = useState(-1);
    const [focusedMemberIdx, setFocusedMemberIdx]     = useState(0);
    const carouselScrollX = useRef(new Animated.Value(0)).current;

    // Hover index mirrored into a ref so the physics loop can spring the
    // bubble scale off the React render path (setNativeProps only)
    const highlightIdxRef = useRef(-1);
    useEffect(() => { highlightIdxRef.current = highlightBubbleIdx; }, [highlightBubbleIdx]);
    const hoverScalesRef = useRef<number[]>([]);
    const hoverVelsRef   = useRef<number[]>([]);

    const sheetAnim    = useRef(new Animated.Value(500)).current;
    const hubScaleAnim = useRef(new Animated.Value(1)).current;
    const hubGlowAnim  = useRef(new Animated.Value(0)).current;
    const ringSpinAnim = useRef(new Animated.Value(0)).current;
    const dockPulse    = useRef(new Animated.Value(1)).current;

    // Hub heartbeat — a soft systolic rise, a settle, then rest. The glow
    // swells on the same beat so the light feels like it comes from inside.
    useEffect(() => {
        const beat = Animated.loop(Animated.parallel([
            Animated.sequence([
                Animated.spring(hubScaleAnim, { toValue: 1.022, damping: 18, stiffness: 120, useNativeDriver: true }),
                Animated.spring(hubScaleAnim, { toValue: 1, damping: 18, stiffness: 120, useNativeDriver: true }),
                Animated.delay(1300),
            ]),
            Animated.sequence([
                Animated.timing(hubGlowAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(hubGlowAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.delay(1300),
            ]),
        ]));
        beat.start();
        return () => beat.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The outermost orbit creeps through a full revolution every 90 seconds —
    // imperceptible until you notice the satellite, and then the room is alive
    useEffect(() => {
        const spin = Animated.loop(
            Animated.timing(ringSpinAnim, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: true }),
        );
        spin.start();
        return () => spin.stop();
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

                // Hover scale — a real spring (damping 20, stiffness 320)
                // integrated inside the physics frame, zero re-renders
                const target = highlightIdxRef.current === i ? 1.06 : 1;
                const cur = hoverScalesRef.current[i] ?? 1;
                let hv = hoverVelsRef.current[i] ?? 0;
                hv = (hv + (target - cur) * 0.18) * 0.78;
                let next = cur + hv;
                if (Math.abs(target - next) < 0.0006 && Math.abs(hv) < 0.0006) { next = target; hv = 0; }
                hoverScalesRef.current[i] = next;
                hoverVelsRef.current[i] = hv;

                bubbleRefs.current[i]?.setNativeProps({
                    style: { transform: [{ translateX: x - BUBBLE_R }, { translateY: y - BUBBLE_R }, { scale: next }] },
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
        Animated.timing(sheetAnim, { toValue: 500, useNativeDriver: true, duration: 220, easing: Easing.out(Easing.cubic) }).start(() => {
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

    // After a drop lands, the dock handle takes a little bow
    const pulseDockHandle = useCallback(() => {
        Animated.sequence([
            Animated.spring(dockPulse, { toValue: 1.15, damping: 12, stiffness: 300, useNativeDriver: true }),
            Animated.spring(dockPulse, { toValue: 1, damping: 12, stiffness: 300, useNativeDriver: true }),
        ]).start();
    }, [dockPulse]);

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
                    const idx = nearestBubble(pageX, pageY);
                    setHighlightBubbleIdx(idx);
                    // The bubble greets the carried character — once per entry
                    if (idx >= 0 && idx !== lastHoverRef.current) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    lastHoverRef.current = idx;
                },
                onPanResponderRelease: (evt) => {
                    setGhost(null);
                    setHighlightBubbleIdx(-1);
                    lastHoverRef.current = -1;
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
                        pulseDockHandle();
                    }
                    dragMemberRef.current = null;
                },
                onPanResponderTerminate: () => {
                    setGhost(null);
                    setHighlightBubbleIdx(-1);
                    lastHoverRef.current = -1;
                    dragMemberRef.current = null;
                },
            })
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members.length, nearestBubble, pulseDockHandle]);

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
                    colors={isDark
                        ? ['#050810', '#080C12', '#060A10']
                        : ['#F0F4FF', '#EEF2FC', '#F2F6FF']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Star field — each star on its own twinkle */}
                {STARS.map(s => (
                    <TwinkleStar key={s.key} left={s.left} top={s.top} size={s.size} index={s.key} isDark={isDark} />
                ))}

                {/* Nebula — three stacked breaths of accent light behind the hub */}
                {[
                    { r: 40, o: 0.18 },
                    { r: 70, o: 0.10 },
                    { r: 110, o: 0.06 },
                ].map(({ r, o }) => (
                    <View
                        key={r}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            width: 300, height: 300,
                            borderRadius: 150,
                            alignSelf: 'center',
                            top: hubYCenter - 150,
                            backgroundColor: 'transparent',
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: o,
                            shadowRadius: r,
                            elevation: 0,
                        }}
                    />
                ))}

                {/* Orbit paths — solid hairlines fading with distance */}
                {[
                    { size: 296, op: isDark ? 0.03 : 0.05 },
                    { size: 428, op: isDark ? 0.04 : 0.07 },
                ].map(({ size, op }) => (
                    <View
                        key={size}
                        pointerEvents="none"
                        style={[
                            styles.orbitRing,
                            {
                                width: size, height: size, borderRadius: size / 2,
                                top: hubYCenter - size / 2,
                                borderColor: colors.accent,
                                opacity: op,
                            },
                        ]}
                    />
                ))}

                {/* Outermost orbit rotates once every 90s, carrying a satellite */}
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        alignSelf: 'center',
                        top: hubYCenter - 280,
                        width: 560, height: 560,
                        transform: [{ rotate: ringSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                    }}
                >
                    <View style={[styles.orbitRing, {
                        width: 560, height: 560, borderRadius: 280,
                        top: 0,
                        borderColor: colors.accent,
                        opacity: isDark ? 0.06 : 0.10,
                    }]} />
                    <View style={{
                        position: 'absolute',
                        top: -2, left: 278,
                        width: 4, height: 4, borderRadius: 2,
                        backgroundColor: colors.accent,
                        opacity: isDark ? 0.38 : 0.45,
                    }} />
                </Animated.View>

                {/* Ambient halo — a ring of light that breathes with the hub */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.hubHalo,
                        {
                            top: hubYCenter - (HUB_R + 16),
                            borderColor: colors.accent,
                            opacity: hubGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
                            transform: [{ scale: hubScaleAnim }],
                        },
                    ]}
                />

                {/* Diffuse bloom — the glow pulse (effective shadowOpacity 0.22 → 0.35) */}
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: HUB_R * 2, height: HUB_R * 2,
                        borderRadius: HUB_R,
                        alignSelf: 'center',
                        top: hubYCenter - HUB_R,
                        backgroundColor: 'transparent',
                        shadowColor: colors.accent,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.35,
                        shadowRadius: 46,
                        elevation: 0,
                        opacity: hubGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.63, 1] }),
                        transform: [{ scale: hubScaleAnim }],
                    }}
                />

                {/* Hub — the gravitational heart */}
                <Animated.View
                    style={[
                        styles.hub,
                        {
                            top: hubYCenter - HUB_R,
                            backgroundColor: isDark ? 'rgba(9,15,27,0.94)' : 'rgba(255,255,255,0.97)',
                            borderColor: colors.accent + '80',
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.22,
                            shadowRadius: 40,
                            transform: [{ scale: hubScaleAnim }],
                        },
                    ]}
                >
                    {/* Inner ring — depth, like a lens element */}
                    <View
                        pointerEvents="none"
                        style={[styles.hubInnerRing, { borderColor: colors.accent + (isDark ? '2E' : '24') }]}
                    />
                    {/* Top curvature highlight */}
                    <View
                        pointerEvents="none"
                        style={[styles.hubHighlight, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)' }]}
                    />

                    <Text style={[styles.hubName, { color: colors.text }, T.extrabold]} numberOfLines={2}>{groupName}</Text>
                    <View style={styles.hubPills}>
                        <TouchableOpacity
                            style={[styles.hubPill, { backgroundColor: colors.accent + '24', borderColor: colors.accent + '59' }]}
                            onPress={onAddExpense}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.hubPillText, { color: colors.accent }, T.bold]}>＋ Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.hubPill, { backgroundColor: colors.gold + '24', borderColor: colors.gold + '4D' }]}
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
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.hubPillText, { color: colors.gold }, T.bold]}>⟶ Settle</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Expense bubbles */}
                {visibleExpenses.map((exp, i) => {
                    const h         = EXPENSE_HUES[i % 6];
                    const bg        = isDark ? `hsla(${h},40%,8%,0.72)`   : `hsla(${h},30%,98%,0.90)`;
                    const border    = isDark ? `hsla(${h},80%,65%,0.60)`  : `hsla(${h},65%,45%,0.45)`;
                    const tc        = isDark ? `hsla(${h},88%,90%,1)`     : `hsla(${h},65%,26%,1)`;
                    const shadowCol = isDark ? `hsla(${h},70%,55%,1)`     : `hsla(${h},70%,50%,1)`;
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
                                    shadowColor: hovered ? colors.accent : shadowCol,
                                    shadowOpacity: hovered ? 0.55 : isDark ? 0.28 : 0.14,
                                    shadowRadius: hovered ? 32 : 16,
                                    elevation: hovered ? 12 : 6,
                                },
                            ]}
                        >
                            {/* Inner top highlight — glass curvature */}
                            <View pointerEvents="none" style={styles.bubbleHighlight} />

                            {/* Payer stamp */}
                            {payer && (
                                <View style={styles.bubblePayerWrap} pointerEvents="none">
                                    <CharacterShape
                                        variant="cluster"
                                        shape={payer.character_shape ?? 'rect'}
                                        color={payer.character_color ?? payer.avatar_color ?? '#6B7280'}
                                    />
                                </View>
                            )}

                            {/* Dismiss */}
                            <TouchableOpacity
                                style={styles.bubbleX}
                                onPress={() => setHiddenIds(prev => new Set([...prev, exp.id]))}
                                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                                <X size={10} color={tc} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.bubbleTouchable} onPress={() => openSheet(exp.id)} activeOpacity={0.7}>
                                <Text style={styles.bubbleEmoji}>{expenseEmoji(exp.title)}</Text>
                                <Text style={[styles.bubbleTitle, { color: tc }, T.bold]} numberOfLines={2}>
                                    {exp.title}
                                </Text>
                                <Text style={[styles.bubbleAmount, { color: isDark ? 'rgba(255,255,255,0.86)' : 'rgba(26,31,46,0.72)', fontVariant: ['tabular-nums'] }, T.extrabold]}>
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

                {/* Drag ghost — the carried character travels with its own light */}
                {ghost && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: ghost.x - scale(22),
                            top: ghost.y - vs(30),
                            zIndex: 200,
                            opacity: 0.94,
                            shadowColor: ghost.color,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.55,
                            shadowRadius: 16,
                            elevation: 12,
                            transform: [{ scale: 1.08 }],
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

                {/* Back button — frosted pill */}
                <View style={[styles.backBtnWrap, { top: insets.top + vs(8) }]}>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }]}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={16} color={isDark ? colors.accent : colors.accentDark} />
                        <Text style={[styles.backText, { color: isDark ? colors.accent : colors.accentDark }, T.bold]}>Back</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Character carousel dock ── */}
                <LinearGradient
                    colors={[
                        'transparent',
                        isDark ? 'rgba(4,6,14,0.96)' : 'rgba(236,240,250,0.97)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        paddingBottom: insets.bottom + vs(14),
                        paddingTop: vs(48),
                    }}
                    pointerEvents="box-none"
                >
                    {/* ── Drag handle: focused member's character ── */}
                    {(() => {
                        const fm = members[focusedMemberIdx];
                        const pr = panResponders[focusedMemberIdx];
                        if (!fm || !pr) return null;
                        const fmColor = fm.character_color ?? fm.avatar_color ?? colors.accent;
                        return (
                            <View style={{ alignItems: 'center', marginBottom: vs(10) }} pointerEvents="box-none">
                                <Text style={[{
                                    fontSize: ms(9),
                                    color: colors.accent + '60',
                                    letterSpacing: 2,
                                    marginBottom: vs(5),
                                }, T.semibold]}>
                                    ↑ DRAG TO ASSIGN ↑
                                </Text>
                                <Animated.View
                                    style={{
                                        padding: scale(10),
                                        borderRadius: ms(20),
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.07)'
                                            : 'rgba(255,255,255,0.90)',
                                        shadowColor: fmColor,
                                        shadowOffset: { width: 0, height: 6 },
                                        shadowOpacity: 0.55,
                                        shadowRadius: 20,
                                        elevation: 10,
                                        transform: [{ scale: dockPulse }],
                                    }}
                                    {...pr.panHandlers}
                                >
                                    <CharacterShape
                                        variant="mini"
                                        shape={fm.character_shape ?? 'rect'}
                                        color={fm.character_color ?? fm.avatar_color ?? '#6B7280'}
                                    />
                                </Animated.View>
                                <Text style={[{
                                    fontSize: ms(12),
                                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
                                    marginTop: vs(6),
                                    letterSpacing: 0.2,
                                }, T.semibold]}>
                                    {(fm.name || '').split(' ')[0]}
                                </Text>
                            </View>
                        );
                    })()}

                    {/* ── Carousel ── */}
                    {members.length > 1 && (
                        <Animated.ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={ITEM_W}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingHorizontal: SNAP_INSET }}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: carouselScrollX } } }],
                                { useNativeDriver: true }
                            )}
                            scrollEventThrottle={16}
                            onMomentumScrollEnd={e => {
                                const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
                                setFocusedMemberIdx(Math.max(0, Math.min(idx, members.length - 1)));
                                Haptics.selectionAsync();
                            }}
                        >
                            {members.map((m, i) => {
                                const inputRange = [(i - 1) * ITEM_W, i * ITEM_W, (i + 1) * ITEM_W];
                                const cardScale = carouselScrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.78, 1, 0.78],
                                    extrapolate: 'clamp',
                                });
                                const cardOpacity = carouselScrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.35, 1, 0.35],
                                    extrapolate: 'clamp',
                                });
                                const cardTranslateY = carouselScrollX.interpolate({
                                    inputRange,
                                    outputRange: [vs(7), 0, vs(7)],
                                    extrapolate: 'clamp',
                                });

                                const isFocused = focusedMemberIdx === i;
                                const charColor = m.character_color ?? m.avatar_color ?? '#6B7280';

                                return (
                                    <Animated.View
                                        key={m.user_id}
                                        style={{
                                            width: CARD_W,
                                            marginHorizontal: CARD_MX,
                                            alignItems: 'center',
                                            opacity: cardOpacity,
                                            transform: [
                                                { scale: cardScale },
                                                { translateY: cardTranslateY },
                                            ],
                                        }}
                                    >
                                        <View style={{
                                            padding: scale(10),
                                            borderRadius: ms(18),
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(255,255,255,0.80)',
                                            borderWidth: isFocused ? 1.5 : 0,
                                            borderColor: isFocused ? charColor + 'AA' : 'transparent',
                                            shadowColor: charColor,
                                            shadowOffset: { width: 0, height: isFocused ? 8 : 0 },
                                            shadowOpacity: isFocused ? 0.55 : 0,
                                            shadowRadius: isFocused ? 20 : 0,
                                            elevation: isFocused ? 8 : 0,
                                        }}>
                                            <CharacterShape
                                                variant="mini"
                                                shape={m.character_shape ?? 'rect'}
                                                color={charColor}
                                            />
                                        </View>
                                        <Text style={[{
                                            fontSize: ms(10),
                                            color: isFocused
                                                ? (isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)')
                                                : (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'),
                                            marginTop: vs(5),
                                            letterSpacing: 0.2,
                                        }, isFocused ? T.semibold : T.regular]} numberOfLines={1}>
                                            {(m.name || '').split(' ')[0]}
                                        </Text>
                                    </Animated.View>
                                );
                            })}
                        </Animated.ScrollView>
                    )}

                    {/* Single member — no carousel needed */}
                    {members.length === 1 && (
                        <View style={{ height: vs(24) }} />
                    )}
                </LinearGradient>
            </View>

            {/* ── Detail sheet ── */}
            <Animated.View
                style={[
                    styles.sheet,
                    { backgroundColor: isDark ? '#0E1614' : '#F7FBF8', transform: [{ translateY: sheetAnim }] },
                ]}
                pointerEvents={selectedExpenseId ? 'box-none' : 'none'}
            >
                <View style={[styles.sheetHandle, { backgroundColor: colors.accent + '30' }]} />

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
                            <Text style={[styles.sheetAmount, { color: colors.text, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                ${formatCurrency(selectedExpense.amount)}
                            </Text>
                            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn} activeOpacity={0.7}>
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
                                        onPress={() => { Haptics.selectionAsync(); setSheetTab(tab); }}
                                        activeOpacity={0.7}
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
                                                <View style={styles.balanceCharWrap}>
                                                    <CharacterShape
                                                        variant="cluster"
                                                        shape={m.character_shape ?? 'rect'}
                                                        color={m.character_color ?? m.avatar_color ?? colors.accent}
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
                                                <Text style={[styles.balanceNet, { color: pos ? colors.accent : colors.warningBright, fontVariant: ['tabular-nums'] }, T.extrabold]}>
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
                                        <Text style={[styles.payAmount, { color: colors.warningBright, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                            ${formatCurrency(perPerson)}
                                        </Text>
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
                                            activeOpacity={0.7}
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
        borderStyle: 'solid',
        borderWidth: StyleSheet.hairlineWidth,
        alignSelf: 'center',
    },

    hubHalo: {
        position: 'absolute',
        width: (HUB_R + 16) * 2,
        height: (HUB_R + 16) * 2,
        borderRadius: HUB_R + 16,
        borderWidth: 1,
        alignSelf: 'center',
    },
    hub: {
        position: 'absolute',
        width: HUB_R * 2,
        height: HUB_R * 2,
        borderRadius: HUB_R,
        borderWidth: 1.5,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        elevation: 8,
        paddingHorizontal: scale(10),
        overflow: 'hidden',
    },
    hubInnerRing: {
        position: 'absolute',
        top: 5, left: 5, right: 5, bottom: 5,
        borderRadius: HUB_R - 5,
        borderWidth: 1,
    },
    hubHighlight: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: HUB_R,
        borderTopLeftRadius: HUB_R,
        borderTopRightRadius: HUB_R,
    },
    hubName: {
        fontSize: ms(15),
        letterSpacing: -0.6,
        textAlign: 'center',
    },
    hubPills: {
        flexDirection: 'row',
        gap: scale(6),
    },
    hubPill: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: scale(9),
        paddingVertical: vs(4),
    },
    hubPillText: { fontSize: ms(10) },

    bubble: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: BUBBLE_R * 2,
        height: BUBBLE_R * 2,
        borderRadius: BUBBLE_R,
        borderWidth: 1.5,
        shadowOffset: { width: 0, height: 6 },
        overflow: 'visible',
    },
    bubbleHighlight: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: BUBBLE_R,
        borderTopLeftRadius: BUBBLE_R,
        borderTopRightRadius: BUBBLE_R,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    bubbleTouchable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(6),
        gap: vs(1),
    },
    bubblePayerWrap: {
        position: 'absolute',
        top: scale(8),
        left: scale(12),
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bubbleEmoji: {
        fontSize: ms(18),
        textAlign: 'center',
    },
    bubbleTitle: {
        fontSize: ms(11),
        letterSpacing: -0.2,
        textAlign: 'center',
        lineHeight: 13,
    },
    bubbleAmount: {
        fontSize: ms(12),
        letterSpacing: -0.4,
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
        zIndex: 2,
    },

    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },

    backBtnWrap: {
        position: 'absolute',
        left: scale(20),
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        borderRadius: ms(20),
        paddingHorizontal: scale(12),
        paddingVertical: vs(6),
    },
    backText: { fontSize: ms(14) },

    // Sheet
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 420,
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        paddingBottom: vs(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
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
        fontSize: ms(18),
        letterSpacing: -0.5,
    },
    sheetSubtitle: {
        fontSize: ms(12),
        marginTop: vs(2),
    },
    sheetAmount: {
        fontSize: ms(22),
        letterSpacing: -0.8,
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
        height: 3,
        borderRadius: 1.5,
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
        borderRadius: ms(16),
        paddingHorizontal: scale(24),
        paddingVertical: vs(15),
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.42,
        shadowRadius: 12,
        elevation: 6,
    },
    payBtnText: { color: '#fff', fontSize: ms(15) },
});
