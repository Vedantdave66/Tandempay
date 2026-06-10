import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Animated, Easing, Alert,
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
    Bell, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake,
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { T } from '../utils/typography';
import ThemeToggle from '../components/ThemeToggle';
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
                contentContainerStyle={{ paddingBottom: vs(120) }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
            >
                {/* Header row */}
                <View style={styles.headerRow}>
                    <Logo size={18} />
                    <View style={styles.headerRightRow}>
                        <ThemeToggle />
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
                </View>

                {/* Hero card */}
                <LinearGradient
                    colors={isDark ? ['#1A1015', '#141019', '#0D1410'] : ['#FBEDE8', '#F4EFF7', '#E9F6EE']}
                    style={styles.heroCard}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroLeft}>
                            <Text style={[styles.heroGreeting, { color: colors.secondaryText }, T.semibold]}>Good morning</Text>
                            <Text style={[styles.heroName, { color: colors.text }, T.extrabold]}>{firstName} 👋</Text>
                        </View>
                        <CharacterShape
                            shape={user?.character_shape ?? 'rect'}
                            color={user?.character_color ?? '#34D399'}
                            variant="hero"
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statPill, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
                            borderRadius: 16,
                        }]}>
                            <Text style={[styles.statPillLabel, { color: isDark ? colors.accent : colors.accentDark }, T.extrabold]}>YOU'RE OWED</Text>
                            <Text style={[styles.statPillValue, { color: isDark ? colors.accent : colors.accentDark, fontVariant: ['tabular-nums'] }, T.extrabold]}>${formatCurrency(owedToMe)}</Text>
                        </View>
                        <View style={[styles.statPill, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
                            borderRadius: 16,
                        }]}>
                            <Text style={[styles.statPillLabel, { color: colors.gold }, T.extrabold]}>YOU OWE</Text>
                            <Text style={[styles.statPillValue, { color: colors.gold, fontVariant: ['tabular-nums'] }, T.extrabold]}>${formatCurrency(iOwe)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Your squads */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }, T.extrabold]}>Your squads</Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

                {/* Recent activity */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: scale(20), marginTop: vs(32), marginBottom: vs(14) }, T.extrabold]}>
                    Recent activity
                </Text>
                <View style={{
                    backgroundColor: colors.surface, borderRadius: ms(26),
                    marginHorizontal: scale(20), overflow: 'hidden',
                    borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                    shadowColor: isDark ? '#000' : '#0A3020',
                    shadowOpacity: isDark ? 0.28 : 0.10,
                    shadowRadius: isDark ? 14 : 10,
                    shadowOffset: { width: 0, height: isDark ? 10 : 4 },
                    elevation: isDark ? 6 : 4,
                }}>
                    {recentActivity.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.secondaryText, padding: scale(20), textAlign: 'center' }, T.regular]}>
                            No activity yet
                        </Text>
                    ) : (
                        recentActivity.map((n, i) => {
                            const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: '#888' };
                            const IconComp = cfg.icon;
                            const isLast = i === recentActivity.length - 1;
                            return (
                                <Animated.View key={n.id} style={{ opacity: activityAnims[i] ?? 1 }}>
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: scale(12),
                                            padding: scale(14), paddingHorizontal: scale(16),
                                            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                            borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                        }}
                                        onPress={() => n.group_id && navigation.navigate('Group', { groupId: n.group_id })}
                                        activeOpacity={0.70}
                                    >
                                        <View style={{
                                            width: scale(40), height: scale(40), borderRadius: ms(16),
                                            backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center',
                                        }}>
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
                </View>
            </ScrollView>
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
        paddingBottom: vs(16),
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
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
        marginHorizontal: scale(16),
        borderRadius: ms(28),
        padding: scale(24),
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
        fontSize: ms(32),
        letterSpacing: -1.0,
    },
    statsRow: {
        flexDirection: 'row',
        gap: scale(10),
    },
    statPill: {
        flex: 1,
        padding: scale(14),
    },
    statPillLabel: {
        fontSize: ms(11),
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: vs(4),
    },
    statPillValue: {
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
});
