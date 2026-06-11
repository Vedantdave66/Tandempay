import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Animated, Easing, Alert, Modal,
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    groupsApi, balancesApi, notificationsApi,
    GroupListItem, UserBalance, NotificationOut,
} from '../services/api';
import {
    Bell, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake, ChevronRight, X,
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { T } from '../utils/typography';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import Logo from '../components/Logo';
import { formatCurrency } from '../utils/formatCurrency';

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
    expense_added:        { icon: Receipt,     color: '#A8D5A2' },
    settlement_requested: { icon: Handshake,   color: '#818CF8' },
    payment_sent:         { icon: Send,        color: '#F59E0B' },
    payment_confirmed:    { icon: CheckCheck,  color: '#A8D5A2' },
    payment_declined:     { icon: ShieldAlert, color: '#E05252' },
    friend_request:       { icon: UserPlus,    color: '#A8D5A2' },
    friend_accepted:      { icon: Check,       color: '#A8D5A2' },
};

function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
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
                Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
        } else if (rendered) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 500, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropOpacity }]}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.modalSheet, {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    transform: [{ translateY: slideAnim }],
                }]}>
                    <View style={[styles.modalHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)' }]} />

                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, T.extrabold, { color: colors.text }]}>Balance breakdown</Text>
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
                                        <Text style={[styles.modalSectionLabel, T.bold, { color: colors.accent }]}>They owe you</Text>
                                        {owedRows.map((row, i) => (
                                            <View key={i} style={[styles.modalRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[styles.modalRowName, T.semibold, { color: colors.text }]}>{row.groupName}</Text>
                                                <Text style={[styles.modalRowAmount, T.extrabold, { color: colors.accent }]}>${formatCurrency(row.amount)}</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                                {owingRows.length > 0 && (
                                    <>
                                        <Text style={[styles.modalSectionLabel, T.bold, { color: colors.gold }]}>You owe them</Text>
                                        {owingRows.map((row, i) => (
                                            <View key={i} style={[styles.modalRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[styles.modalRowName, T.semibold, { color: colors.text }]}>{row.groupName}</Text>
                                                <Text style={[styles.modalRowAmount, T.extrabold, { color: colors.gold }]}>${formatCurrency(row.amount)}</Text>
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

    const activityAnims = useRef(
        Array.from({ length: 5 }, () => new Animated.Value(0))
    ).current;

    const loadGroups = async () => {
        try {
            const raw = await groupsApi.list();
            const data: GroupListItem[] = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as any)?.items)
                    ? (raw as any).items
                    : Array.isArray((raw as any)?.groups)
                        ? (raw as any).groups
                        : [];
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
                    const data: NotificationOut[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.items) ? (raw as any).items : [];
                    setRecentActivity(data.slice(0, 3));
                })
                .catch(() => {});
        } catch (err) {
            console.log('[Dashboard] Failed to load groups:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
        Animated.stagger(40,
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
    const netColor = netBalance > 0.005
        ? colors.accent
        : netBalance < -0.005
            ? colors.gold
            : colors.secondaryText;

    if (loading && !refreshing) {
        return (
            <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
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
                            <View style={[styles.bellDot, { borderColor: colors.background }]} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Hero card */}
                <LinearGradient
                    colors={isDark ? ['#1A1015', '#141019', '#0D1410'] : ['#FBEDE8', '#F4EFF7', '#E9F6EE']}
                    style={styles.heroCard}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroLeft}>
                            <Text style={[styles.heroGreeting, { color: colors.secondaryText }, T.semibold]}>{greeting()}</Text>
                            <Text style={[styles.heroName, { color: colors.text }, T.extrabold]}>{firstName} 👋</Text>
                        </View>
                        <CharacterShape
                            shape={user?.character_shape ?? 'rect'}
                            color={user?.character_color ?? '#34D399'}
                            variant="hero"
                        />
                    </View>

                    {/* Net Balance pill */}
                    <TouchableOpacity
                        style={[styles.netBalanceBtn, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
                        }]}
                        activeOpacity={0.70}
                        onPress={() => setShowNetModal(true)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.netBalanceLabel, { color: colors.secondaryText }, T.bold]}>NET BALANCE</Text>
                            <Text style={[styles.netBalanceValue, { color: netColor, fontVariant: ['tabular-nums'] }, T.extrabold]}>
                                {netBalance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netBalance))}
                            </Text>
                        </View>
                        <ChevronRight size={18} color={colors.secondaryText} strokeWidth={2} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Your squads */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }, T.extrabold]}>Your squads</Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.countBadgeText, { color: colors.secondaryText }, T.bold]}>{groups.length}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        style={[styles.newButton, {
                            backgroundColor: colors.accent,
                            shadowColor: colors.accent,
                            shadowOpacity: 0.22,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 8 },
                            elevation: 6,
                        }]}
                        activeOpacity={0.70}
                    >
                        <Text style={[styles.newButtonText, T.bold]}>+ New</Text>
                    </TouchableOpacity>
                </View>

                {groups.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.emptyText, { color: colors.secondaryText }, T.regular]}>
                            No squads yet — create one to get started.
                        </Text>
                    </View>
                ) : (
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
                )}

                {/* Recent activity — individual floating rows, no card wrapper */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: scale(20), marginTop: vs(36), marginBottom: vs(16) }, T.extrabold]}>
                    Recent activity
                </Text>

                {recentActivity.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.secondaryText, marginHorizontal: scale(20), textAlign: 'center' }, T.regular]}>
                        No activity yet
                    </Text>
                ) : (
                    recentActivity.map((n, i) => {
                        const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: '#888' };
                        const IconComp = cfg.icon;
                        return (
                            <Animated.View key={n.id} style={{
                                opacity: activityAnims[i] ?? 1,
                                marginHorizontal: scale(20),
                                marginBottom: vs(8),
                            }}>
                                <TouchableOpacity
                                    style={[styles.activityRow, { backgroundColor: colors.surface }]}
                                    onPress={() => n.group_id && navigation.navigate('Group', { groupId: n.group_id })}
                                    activeOpacity={0.70}
                                >
                                    <View style={[styles.activityIcon, { backgroundColor: colors.accentBg }]}>
                                        <IconComp size={scale(18)} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: ms(15), ...T.semibold, color: colors.secondaryText, lineHeight: 22 }}
                                            numberOfLines={2}>{n.message}</Text>
                                        <Text style={{ fontSize: ms(12), ...T.regular, color: colors.faintText, marginTop: vs(2) }}>
                                            {timeAgo(n.created_at)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>

            <NetBreakdownModal
                visible={showNetModal}
                onClose={() => setShowNetModal(false)}
                groups={groups}
                balanceMap={balanceMap}
                userId={user?.id ?? ''}
            />
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
        backgroundColor: '#E05252',
        borderWidth: 1.5,
    },

    heroCard: {
        marginHorizontal: scale(12),
        borderRadius: ms(32),
        padding: scale(26),
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: scale(12),
        marginBottom: vs(20),
    },
    heroLeft: { flexShrink: 1 },
    heroGreeting: {
        fontSize: ms(13),
        marginBottom: vs(2),
    },
    heroName: {
        fontSize: ms(34),
        letterSpacing: -1.2,
    },

    netBalanceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: ms(20),
        padding: scale(16),
        marginTop: vs(24),
    },
    netBalanceLabel: {
        fontSize: ms(11),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: vs(3),
    },
    netBalanceValue: {
        fontSize: ms(26),
        letterSpacing: -0.8,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(32),
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
        borderRadius: ms(12),
        paddingHorizontal: scale(14),
        paddingVertical: vs(9),
    },
    newButtonText: {
        fontSize: ms(13),
        color: '#fff',
    },
    squadsRow: {
        paddingHorizontal: scale(20),
        gap: scale(12),
    },
    emptyState: {
        marginHorizontal: scale(20),
        padding: scale(32),
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: ms(20),
    },

    // Activity — individual floating rows
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        padding: scale(14),
        paddingHorizontal: scale(16),
        borderRadius: ms(16),
    },
    activityIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Net breakdown modal
    modalSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        paddingTop: vs(12),
        maxHeight: '75%',
    },
    modalHandle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(4),
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
        fontSize: ms(20),
        letterSpacing: -0.4,
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
        letterSpacing: 0.4,
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
        paddingVertical: vs(14),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalRowName: {
        fontSize: ms(15),
        flex: 1,
    },
    modalRowAmount: {
        fontSize: ms(16),
        letterSpacing: -0.4,
    },
});
