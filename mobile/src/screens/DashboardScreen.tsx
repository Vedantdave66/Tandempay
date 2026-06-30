import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    RefreshControl, ScrollView, Animated, Easing, Alert, Modal, Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    groupsApi, balancesApi, notificationsApi,
    GroupListItem, UserBalance, NotificationOut,
} from '../services/api';
import {
    Bell, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake, ChevronRight, X,
    Users, Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '../context/NotificationContext';
import { T } from '../utils/typography';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import PressableScale from '../components/PressableScale';
import SkeletonBlock from '../components/SkeletonBlock';
import Logo from '../components/Logo';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo, toArray } from '../utils/helpers';

const TYPE_CONFIG: Record<string, { icon: any; colorKey: string }> = {
    expense_added:        { icon: Receipt,     colorKey: 'accent' },
    settlement_requested: { icon: Handshake,   colorKey: 'indigo' },
    payment_sent:         { icon: Send,        colorKey: 'gold' },
    payment_confirmed:    { icon: CheckCheck,  colorKey: 'accent' },
    payment_declined:     { icon: ShieldAlert, colorKey: 'danger' },
    friend_request:       { icon: UserPlus,    colorKey: 'accent' },
    friend_accepted:      { icon: Check,       colorKey: 'accent' },
};

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function balanceVoice(owed: number, owing: number): string {
    const isOwed = owed > 0.005;
    const isOwing = owing > 0.005;
    if (isOwed && isOwing) return 'Some owed, some owing';
    if (isOwed)            return 'People owe you';
    if (isOwing)           return 'A tab or two to close';
    return 'Nothing hanging over anyone';
}

interface BreakdownRow { groupName: string; amount: number; }

interface NetBreakdownModalProps {
    visible: boolean;
    onClose: () => void;
    groups: GroupListItem[];
    balanceMap: Record<string, UserBalance[]>;
    userId: string;
}

function NetBreakdownModal({ visible, onClose, groups, balanceMap, userId }: NetBreakdownModalProps) {
    const { colors, isDark } = useTheme();
    const slideAnim = useRef(new Animated.Value(500)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        if (visible) {
            setRendered(true);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
        } else if (rendered) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 500, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start(() => setRendered(false));
        }
    }, [visible]);

    const owedRows: BreakdownRow[] = [];
    const owingRows: BreakdownRow[] = [];

    for (const group of groups) {
        const members = balanceMap[group.id] ?? [];
        const me = members.find(m => m.user_id === userId);
        if (!me) continue;
        const net = Number(me.net_balance);
        if (net > 0.005) owedRows.push({ groupName: group.name, amount: net });
        else if (net < -0.005) owingRows.push({ groupName: group.name, amount: Math.abs(net) });
    }

    const allSettled = owedRows.length === 0 && owingRows.length === 0;

    return (
        <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <Animated.View
                    style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)', opacity: backdropOpacity }]}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.modalSheet, {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    transform: [{ translateY: slideAnim }],
                }]}>
                    <View style={[styles.modalHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />

                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, T.semibold, { color: colors.text }]}>Balance Breakdown</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.70}>
                            <X size={18} color={colors.secondaryText} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: vs(40) }}>
                        {allSettled ? (
                            <Text style={[styles.modalSettled, T.semibold, { color: colors.secondaryText }]}>
                                You're all settled up 🎉
                            </Text>
                        ) : (
                            <>
                                {owedRows.length > 0 && (
                                    <>
                                        <Text style={[styles.modalSectionLabel, T.semibold, { color: colors.secondaryText }]}>They owe you</Text>
                                        {owedRows.map((row, i) => (
                                            <View key={i} style={[styles.modalRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                                                <Text style={[styles.modalRowName, T.regular, { color: colors.text }]}>{row.groupName}</Text>
                                                <Text style={[styles.modalRowAmount, T.semibold, { color: colors.accent, fontVariant: ['tabular-nums'] }]}>${formatCurrency(row.amount)}</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                                {owingRows.length > 0 && (
                                    <>
                                        <Text style={[styles.modalSectionLabel, T.semibold, { color: colors.secondaryText }]}>You owe them</Text>
                                        {owingRows.map((row, i) => (
                                            <View key={i} style={[styles.modalRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                                                <Text style={[styles.modalRowName, T.regular, { color: colors.text }]}>{row.groupName}</Text>
                                                <Text style={[styles.modalRowAmount, T.semibold, { color: colors.gold, fontVariant: ['tabular-nums'] }]}>${formatCurrency(row.amount)}</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

export default function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { unreadCount } = useNotifications();

    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [balanceMap, setBalanceMap] = useState<Record<string, UserBalance[]>>({});
    const [owedToMe, setOwedToMe] = useState(0);
    const [iOwe, setIOwe] = useState(0);
    const [recentActivity, setRecentActivity] = useState<NotificationOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNetModal, setShowNetModal] = useState(false);
    const [interacSheetVisible, setInteracSheetVisible] = useState(false);
    const interacToastAnim = useRef(new Animated.Value(0)).current;
    const [interacToastMsg, setInteracToastMsg] = useState<string | null>(null);
    const interacToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activityAnims = useRef(
        Array.from({ length: 5 }, () => new Animated.Value(0))
    ).current;

    // Your character rises into frame on arrival — it's you showing up, not an icon loading.
    const characterRise = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!loading) {
            Animated.spring(characterRise, {
                toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    const loadGroups = async () => {
        try {
            const raw = await groupsApi.list();
            const data: GroupListItem[] = toArray<GroupListItem>(raw);
            setGroups(data);

            try {
                const entries = await Promise.all(
                    data.map(g =>
                        balancesApi.getBalances(g.id)
                            .then(b => [g.id, b] as const)
                            .catch(() => [g.id, [] as UserBalance[]] as const)
                    )
                );
                const map = Object.fromEntries(entries);
                setBalanceMap(map);

                let owed = 0, owing = 0;
                for (const [, members] of Object.entries(map)) {
                    const me = (members as UserBalance[]).find(m => m.user_id === user?.id);
                    if (!me) continue;
                    if (Number(me.net_balance) > 0) owed += Number(me.net_balance);
                    else if (Number(me.net_balance) < 0) owing += Math.abs(Number(me.net_balance));
                }
                setOwedToMe(owed);
                setIOwe(owing);
            } catch {
                // silent
            }

            notificationsApi.list()
                .then(raw => {
                    const data: NotificationOut[] = toArray<NotificationOut>(raw);
                    setRecentActivity(data.slice(0, 3));
                })
                .catch(() => {});
        } catch (err) {
            console.error('[Dashboard] Failed to load groups:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            if (user?.interac_token) {
                AsyncStorage.getItem('@interac_setup_seen').then(seen => {
                    if (!seen) setInteracSheetVisible(true);
                });
            }
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadGroups);
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        loadGroups();
    };

    const handleCopyInteracAddress = () => {
        const address = `${user?.interac_token}@inbound.tandempay.ca`;
        Clipboard.setString(address);
        Haptics.selectionAsync();
        if (interacToastTimer.current) clearTimeout(interacToastTimer.current);
        setInteracToastMsg('Copied!');
        interacToastAnim.setValue(0);
        Animated.timing(interacToastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
        interacToastTimer.current = setTimeout(() => {
            Animated.timing(interacToastAnim, { toValue: 0, duration: 280, useNativeDriver: true })
                .start(() => setInteracToastMsg(null));
        }, 2000);
    };

    const dismissInteracSheet = async () => {
        await AsyncStorage.setItem('@interac_setup_seen', 'true');
        setInteracSheetVisible(false);
    };

    const handleGroupMore = (item: GroupListItem) => {
        const isCreator = item.created_by === user?.id;
        if (isCreator) {
            Alert.alert(
                'Delete Group',
                `"${item.name}" will be permanently deleted for all members.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        try { await groupsApi.deleteGroup(item.id); loadGroups(); }
                        catch (e: any) { Alert.alert('Error', e.message || 'Could not delete group.'); }
                    }},
                ]
            );
        } else {
            Alert.alert(
                'Leave Group',
                `You'll be removed from "${item.name}".`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: async () => {
                        try { await groupsApi.removeMember(item.id, user!.id); loadGroups(); }
                        catch (e: any) { Alert.alert('Error', e.message || 'Could not leave group.'); }
                    }},
                ]
            );
        }
    };

    useEffect(() => {
        if (recentActivity.length === 0) return;
        const count = Math.min(recentActivity.length, 5);
        activityAnims.forEach(a => a.setValue(0));
        Animated.stagger(30,
            activityAnims.slice(0, count).map(anim =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                })
            )
        ).start();
    }, [recentActivity.length]);

    const firstName = user?.name?.split(' ')[0] ?? '';
    const netBalance = owedToMe - iOwe;
    const allSquare = owedToMe < 0.005 && iOwe < 0.005;
    const netColor = netBalance > 0.005
        ? colors.accent
        : netBalance < -0.005
            ? colors.gold
            : colors.accent;

    if (loading && !refreshing) {
        // Skeleton — the dashboard's silhouette breathing while data arrives.
        // Mirrors the real layout rhythm so content lands without a jump.
        return (
            <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
                {/* Header: logo + bell */}
                <View style={styles.headerRow}>
                    <SkeletonBlock width={scale(96)} height={vs(18)} radius={ms(6)} />
                    <SkeletonBlock width={scale(44)} height={scale(44)} radius={ms(12)} delay={120} />
                </View>

                {/* Greeting */}
                <View style={styles.greetingRow}>
                    <View style={{ gap: vs(8) }}>
                        <SkeletonBlock width={scale(90)} height={vs(12)} radius={ms(6)} delay={240} />
                        <SkeletonBlock width={scale(150)} height={vs(22)} radius={ms(8)} delay={240} />
                    </View>
                    <SkeletonBlock width={scale(52)} height={vs(64)} radius={ms(12)} delay={360} />
                </View>

                {/* Net balance widget */}
                <View style={{ paddingHorizontal: scale(20) }}>
                    <SkeletonBlock width={'100%'} height={vs(84)} radius={ms(20)} delay={480} />
                </View>

                {/* Section header */}
                <View style={{ paddingHorizontal: scale(20), paddingTop: vs(28), paddingBottom: vs(12) }}>
                    <SkeletonBlock width={'42%'} height={vs(18)} radius={ms(8)} delay={600} />
                </View>

                {/* Activity rows */}
                <View style={{ paddingHorizontal: scale(20), gap: vs(8) }}>
                    <SkeletonBlock width={'100%'} height={vs(64)} radius={ms(16)} delay={720} />
                    <SkeletonBlock width={'100%'} height={vs(64)} radius={ms(16)} delay={840} />
                    <SkeletonBlock width={'100%'} height={vs(64)} radius={ms(16)} delay={960} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: vs(140) }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
            >
                {/* Header row */}
                <View style={styles.headerRow}>
                    <Logo size={18} />
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        style={[styles.bellButton, { backgroundColor: colors.surface }]}
                        activeOpacity={0.70}
                    >
                        <Bell color={colors.secondaryText} size={20} />
                        {unreadCount > 0 && (
                            <View style={[styles.bellDot, { borderColor: colors.background, backgroundColor: colors.danger }]} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Greeting row — inline, no card */}
                <View style={styles.greetingRow}>
                    <View>
                        <Text style={[styles.greetingLabel, { color: colors.secondaryText }, T.regular]}>{greeting()}</Text>
                        <Text style={[styles.greetingName, { color: colors.text }, T.bold]}>{firstName}</Text>
                    </View>
                    <Animated.View style={{
                        opacity: characterRise,
                        transform: [
                            { scale: 0.72 },
                            { translateY: characterRise.interpolate({ inputRange: [0, 1], outputRange: [vs(16), 0] }) },
                        ],
                    }}>
                        <CharacterShape
                            shape={user?.character_shape ?? 'rect'}
                            color={user?.character_color ?? '#34D399'}
                            variant="hero"
                        />
                    </Animated.View>
                </View>

                {/* Net balance — the widget speaks, the number answers */}
                <PressableScale
                    haptic="light"
                    scaleTo={0.98}
                    style={[styles.netBalanceBtn, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface,
                    }]}
                    onPress={() => setShowNetModal(true)}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.netBalanceLabel, { color: colors.secondaryText }, T.regular]}>
                            {balanceVoice(owedToMe, iOwe)}
                        </Text>
                        {allSquare ? (
                            <Text style={[styles.netBalanceValue, { color: netColor }, T.extrabold]}>
                                All square
                            </Text>
                        ) : (
                            <Text style={[styles.netBalanceValue, { color: netColor, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                {netBalance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netBalance))}
                            </Text>
                        )}
                    </View>
                    <ChevronRight size={16} color={colors.faintText} strokeWidth={2} />
                </PressableScale>

                {/* Your squads */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }, T.bold]}>Your squads</Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.countBadgeText, { color: colors.secondaryText }, T.semibold]}>{groups.length}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        style={[styles.newButton, { backgroundColor: colors.accentBg }]}
                        activeOpacity={0.70}
                    >
                        <Text style={[styles.newButtonText, { color: colors.accent }, T.semibold]}>+ New</Text>
                    </TouchableOpacity>
                </View>

                {groups.length === 0 && !loading ? (
                    <View style={styles.emptyWrap}>
                        <CharacterShape
                            shape={user?.character_shape ?? 'round'}
                            color={user?.character_color ?? '#3ECF8E'}
                            variant="hero"
                        />

                        <Text style={[styles.emptyHeadline, T.extrabold, { color: colors.text }]}>
                            Welcome to TandemPay 👋
                        </Text>
                        <Text style={[styles.emptySub, T.regular, { color: colors.secondaryText }]}>
                            The easiest way to split bills and settle up with friends — all via Interac, totally free.
                        </Text>

                        {[
                            {
                                icon: Users,
                                color: '#6366F1',
                                title: 'Create a group',
                                body: 'Roommates, a trip, a dinner — any shared expense works.',
                            },
                            {
                                icon: Receipt,
                                color: colors.gold,
                                title: 'Log expenses together',
                                body: 'Add what you paid. TandemPay tracks who owes what automatically.',
                            },
                            {
                                icon: CheckCheck,
                                color: colors.accent,
                                title: 'Settle up — automatically',
                                body: 'Set your unique Interac address once. Payments confirm the moment they land.',
                            },
                        ].map((step, i) => (
                            <View
                                key={i}
                                style={[styles.emptyStep, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <View style={[styles.emptyStepIcon, { backgroundColor: step.color + '18' }]}>
                                    <step.icon size={ms(20)} color={step.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.emptyStepTitle, T.semibold, { color: colors.text }]}>
                                        {step.title}
                                    </Text>
                                    <Text style={[styles.emptyStepBody, T.regular, { color: colors.secondaryText }]}>
                                        {step.body}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                            onPress={() => navigation.navigate('CreateGroup' as never)}
                        >
                            <Plus size={ms(18)} color="#fff" />
                            <Text style={[T.bold, { color: '#fff', fontSize: ms(15) }]}>Create your first group</Text>
                        </PressableScale>
                    </View>
                ) : groups.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={scale(234)}
                        decelerationRate="fast"
                        contentContainerStyle={styles.squadsRow}
                    >
                        {groups.map(item => {
                            const members = balanceMap[item.id] ?? [];
                            const myBalance = members.find(m => m.user_id === user?.id);
                            return (
                                <GroupCard
                                    key={item.id}
                                    group={item}
                                    members={members}
                                    myNetBalance={myBalance?.net_balance ?? 0}
                                    compact
                                    onPress={() => navigation.navigate('Group', { groupId: item.id })}
                                    onMorePress={() => handleGroupMore(item)}
                                />
                            );
                        })}
                    </ScrollView>
                ) : null}

                {/* Recent activity — inset grouped list */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: scale(20), marginTop: vs(36), marginBottom: vs(16) }, T.bold]}>
                    Recent activity
                </Text>

                <View style={[styles.activityGroup, { backgroundColor: colors.surface }]}>
                    {recentActivity.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.secondaryText, padding: scale(20), textAlign: 'center' }, T.regular]}>
                            Nothing yet — expenses and payments from your squads will land here.
                        </Text>
                    ) : (
                        recentActivity.map((n, i) => {
                            const cfg = TYPE_CONFIG[n.type] || { icon: Bell, colorKey: 'secondaryText' };
                            const IconComp = cfg.icon;
                            const isLast = i === recentActivity.length - 1;
                            return (
                                <Animated.View key={n.id} style={{ opacity: activityAnims[i] ?? 1 }}>
                                    <TouchableOpacity
                                        style={[styles.activityRow, !isLast && {
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                        }]}
                                        onPress={() => {
                                            if (!n.group_id) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            navigation.navigate('Group', { groupId: n.group_id });
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <View style={[styles.activityIcon, { backgroundColor: colors.accentBg }]}>
                                            <IconComp size={20} color={colors.accent} />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={{ fontSize: ms(15), ...T.regular, color: colors.text, lineHeight: 21 }}
                                                numberOfLines={2}>{n.message}</Text>
                                            <Text style={{ fontSize: ms(12), ...T.regular, color: colors.faintText, marginTop: vs(2) }}>
                                                {timeAgo(n.created_at)}
                                            </Text>
                                        </View>
                                        {n.group_id && <ChevronRight size={16} color={colors.faintText} />}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <NetBreakdownModal
                visible={showNetModal}
                onClose={() => setShowNetModal(false)}
                groups={groups}
                balanceMap={balanceMap}
                userId={user?.id ?? ''}
            />

            {/* ── Interac Auto-Confirm one-time setup sheet ─────────────────────── */}
            <Modal
                visible={interacSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={dismissInteracSheet}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
                    activeOpacity={1}
                    onPress={dismissInteracSheet}
                />
                <View style={[styles.interacSheet, { backgroundColor: colors.surface }]}>
                    <View style={styles.interacHandle}>
                        <View style={[styles.interacHandlePill, { backgroundColor: colors.border }]} />
                    </View>

                    <View style={[styles.interacIconWrap, { backgroundColor: colors.accentBg }]}>
                        <CheckCheck size={ms(22)} color={colors.accent} />
                    </View>
                    <Text style={[styles.interacTitle, T.extrabold, { color: colors.text }]}>
                        Auto-Confirm Payments
                    </Text>
                    <Text style={[styles.interacSub, T.regular, { color: colors.secondaryText }]}>
                        Set this as your Interac notification email in your bank's settings — TandemPay will confirm payments the moment they land. No tapping required.
                    </Text>

                    <PressableScale
                        scaleTo={0.97}
                        haptic="light"
                        onPress={handleCopyInteracAddress}
                        style={[styles.interacAddressChip, { backgroundColor: colors.accentBg, borderColor: colors.accent + '40' }]}
                    >
                        <Text
                            style={[styles.interacAddressText, T.semibold, { color: colors.accent }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {user?.interac_token}@inbound.tandempay.ca
                        </Text>
                    </PressableScale>

                    {interacToastMsg && (
                        <Animated.View style={[styles.interacToast, { backgroundColor: colors.surface, borderColor: colors.border, opacity: interacToastAnim }]}>
                            <Text style={[T.semibold, { color: colors.accent, fontSize: ms(13) }]}>✓ Copied!</Text>
                        </Animated.View>
                    )}

                    <PressableScale
                        scaleTo={0.97}
                        haptic="medium"
                        style={[styles.interacCopyBtn, { backgroundColor: colors.accent }]}
                        onPress={handleCopyInteracAddress}
                    >
                        <Text style={[T.semibold, { color: '#fff', fontSize: ms(15) }]}>Copy address</Text>
                    </PressableScale>

                    <TouchableOpacity onPress={dismissInteracSheet} activeOpacity={0.7} style={{ paddingVertical: vs(10) }}>
                        <Text style={[T.regular, { color: colors.secondaryText, fontSize: ms(14), textAlign: 'center' }]}>
                            I'll do this later
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(8),
        paddingBottom: vs(8),
    },
    bellButton: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellDot: {
        position: 'absolute',
        top: 7,
        right: 8,
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        borderWidth: 1.5,
    },

    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(4),
        paddingBottom: vs(20),
    },
    greetingLabel: {
        fontSize: ms(13),
        marginBottom: vs(2),
    },
    greetingName: {
        fontSize: ms(22),
        letterSpacing: -0.6,
    },

    netBalanceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(20),
        borderRadius: ms(20),
        paddingHorizontal: scale(20),
        paddingVertical: vs(16),
    },
    netBalanceLabel: {
        fontSize: ms(13),
        marginBottom: vs(3),
    },
    netBalanceValue: {
        fontSize: ms(32),
        letterSpacing: -1.2,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(28),
        paddingBottom: vs(12),
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    sectionTitle: {
        fontSize: ms(20),
        letterSpacing: -0.5,
    },
    countBadge: {
        minWidth: scale(24),
        height: scale(24),
        borderRadius: 99,
        paddingHorizontal: scale(7),
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeText: {
        fontSize: ms(12),
    },
    newButton: {
        borderRadius: 999,
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
    },
    newButtonText: {
        fontSize: ms(14),
    },
    squadsRow: {
        paddingHorizontal: scale(20),
        gap: scale(12),
    },
    emptyText: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: ms(20),
    },
    emptyWrap: {
        paddingHorizontal: scale(4),
        paddingTop: vs(8),
        gap: vs(14),
        alignItems: 'center',
    },
    emptyHeadline: {
        fontSize: ms(24),
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: ms(14),
        lineHeight: 21,
        textAlign: 'center',
        opacity: 0.8,
        paddingHorizontal: scale(8),
    },
    emptyStep: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(12),
        borderRadius: ms(16),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(14),
    },
    emptyStepIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStepTitle: {
        fontSize: ms(14),
        marginBottom: vs(2),
    },
    emptyStepBody: {
        fontSize: ms(12),
        lineHeight: 18,
        opacity: 0.85,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        height: vs(50),
        borderRadius: ms(14),
        width: '100%',
        marginTop: vs(4),
    },

    // Activity — inset grouped list
    activityGroup: {
        marginHorizontal: scale(20),
        borderRadius: ms(16),
        overflow: 'hidden',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingVertical: vs(12),
        paddingHorizontal: scale(16),
        minHeight: vs(44),
    },
    activityIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Net breakdown modal
    modalSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: ms(20),
        borderTopRightRadius: ms(20),
        paddingTop: vs(12),
        maxHeight: '75%',
    },
    modalHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(2),
        alignSelf: 'center',
        marginBottom: vs(12),
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        marginBottom: vs(16),
    },
    modalTitle: {
        fontSize: ms(17),
        letterSpacing: -0.3,
    },
    modalCloseBtn: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSettled: {
        fontSize: ms(15),
        textAlign: 'center',
        paddingVertical: vs(32),
        paddingHorizontal: scale(20),
    },
    modalSectionLabel: {
        fontSize: ms(13),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
        paddingHorizontal: scale(20),
        marginTop: vs(16),
        marginBottom: vs(8),
    },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: vs(12),
        minHeight: vs(44),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalRowName: {
        fontSize: ms(17),
        flex: 1,
    },
    modalRowAmount: {
        fontSize: ms(17),
        letterSpacing: -0.4,
    },

    // Interac Auto-Confirm setup sheet
    interacSheet: {
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        paddingHorizontal: scale(24),
        paddingBottom: vs(36),
        alignItems: 'center',
        gap: vs(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    interacHandle: {
        width: '100%',
        alignItems: 'center',
        paddingTop: vs(12),
        paddingBottom: vs(4),
    },
    interacHandlePill: {
        width: scale(36),
        height: vs(4),
        borderRadius: 2,
    },
    interacIconWrap: {
        width: ms(52),
        height: ms(52),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(4),
    },
    interacTitle: {
        fontSize: ms(20),
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    interacSub: {
        fontSize: ms(14),
        lineHeight: 21,
        textAlign: 'center',
        opacity: 0.75,
    },
    interacAddressChip: {
        borderWidth: 1,
        borderRadius: ms(12),
        paddingHorizontal: scale(14),
        paddingVertical: vs(10),
        width: '100%',
        alignItems: 'center',
    },
    interacAddressText: {
        fontSize: ms(13),
    },
    interacToast: {
        position: 'absolute',
        top: vs(12),
        alignSelf: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: vs(8),
        borderRadius: ms(12),
        borderWidth: StyleSheet.hairlineWidth,
    },
    interacCopyBtn: {
        width: '100%',
        height: vs(50),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
});
