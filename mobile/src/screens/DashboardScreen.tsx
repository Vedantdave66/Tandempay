import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    groupsApi, balancesApi, notificationsApi,
    GroupListItem, UserBalance, NotificationOut,
} from '../services/api';
import {
    Bell, Plus, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake,
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import ThemeToggle from '../components/ThemeToggle';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import { formatCurrency } from '../utils/formatCurrency';

// ── Notification helpers (mirrored from ActivityScreen) ───────────────────────
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

    const loadGroups = async () => {
        try {
            const raw = await groupsApi.list();
            console.log('[Dashboard] Raw groups response:', JSON.stringify(raw));
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
                // balance fetch failure is silent
            }

            notificationsApi.list()
                .then(data => setRecentActivity((data || []).slice(0, 3)))
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

    const firstName = user?.name?.split(' ')[0] ?? '';

    if (loading && !refreshing) {
        return (
            <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
            >
                {/* Header */}
                <View style={styles.topBar}>
                    {/* TODO: swap for a shared <Logo size={18} /> once a mobile wordmark component exists */}
                    <Text style={[styles.wordmark, { color: colors.text }]}>TandemPay</Text>
                    <View style={styles.headerRightRow}>
                        <ThemeToggle />
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={[styles.bellBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <Bell color={colors.secondaryText} size={18} />
                            {unreadCount > 0 && (
                                <View style={[styles.bellDot, { borderColor: colors.background }]} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Hero card */}
                <LinearGradient
                    colors={isDark ? ['#1A1015', '#141019', '#0D1410'] : ['#FBEDE8', '#F4EFF7', '#E9F6EE']}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View>
                            <Text style={[styles.heroGreeting, { color: colors.secondaryText }]}>Good morning</Text>
                            <Text style={[styles.heroName, { color: colors.text }]}>{firstName} 👋</Text>
                        </View>
                        <CharacterShape
                            shape={user?.character_shape ?? 'rect'}
                            color={user?.character_color ?? '#34D399'}
                            variant="hero"
                        />
                    </View>
                    <View style={styles.statsRow}>
                        <View style={[styles.statPill, { backgroundColor: colors.accentBgFaint }]}>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>YOU'RE OWED</Text>
                            <Text style={[styles.statValue, { color: colors.accent }]}>${formatCurrency(owedToMe)}</Text>
                        </View>
                        <View style={[styles.statPill, { backgroundColor: colors.accentBgFaint }]}>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>YOU OWE</Text>
                            <Text style={[styles.statValue, { color: colors.warningBright }]}>${formatCurrency(iOwe)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Your squads */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your squads</Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.countBadgeText, { color: colors.secondaryText }]}>{groups.length}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        style={[styles.newBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        activeOpacity={0.8}
                    >
                        <Plus size={14} color={colors.accent} />
                        <Text style={[styles.newBtnText, { color: colors.accentDark }]}>New</Text>
                    </TouchableOpacity>
                </View>

                {groups.length === 0 ? (
                    <View style={[styles.emptySquads, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.emptySquadsText, { color: colors.secondaryText }]}>
                            No squads yet — create one to start splitting expenses.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.squadsRow}
                    >
                        {groups.map(item => {
                            const members = balanceMap[item.id] ?? [];
                            const myBalance = members.find(m => m.user_id === user?.id);
                            return (
                                <View key={item.id} style={styles.squadCardWrap}>
                                    {/* TODO: GroupCard has no `compact` size yet — reusing the standard card in a horizontal scroller */}
                                    <GroupCard
                                        group={item}
                                        members={members}
                                        myNetBalance={myBalance?.net_balance ?? 0}
                                        onPress={() => navigation.navigate('Group', { groupId: item.id })}
                                    />
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Recent activity */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 20, marginBottom: 12, marginTop: 8 }]}>
                    Recent activity
                </Text>
                <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {recentActivity.length === 0 ? (
                        <Text style={[styles.emptyActivityText, { color: colors.secondaryText }]}>No activity yet</Text>
                    ) : (
                        recentActivity.map((n, i) => {
                            const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: colors.secondaryText };
                            const Icon = cfg.icon;
                            return (
                                <TouchableOpacity
                                    key={n.id}
                                    style={[
                                        styles.activityRow,
                                        i < recentActivity.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                    ]}
                                    onPress={() => n.group_id && navigation.navigate('Group', { groupId: n.group_id })}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.activityIcon, { backgroundColor: colors.accentBg }]}>
                                        <Icon size={18} color={cfg.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{n.title}</Text>
                                        <Text style={[styles.activityMessage, { color: colors.secondaryText }]} numberOfLines={1}>{n.message}</Text>
                                    </View>
                                    <Text style={[styles.activityTime, { color: colors.faintText }]}>{timeAgo(n.created_at)}</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    wordmark: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bellBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    bellDot: {
        position: 'absolute',
        top: 7,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E05252',
        borderWidth: 1.5,
    },

    // Hero
    hero: {
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    heroGreeting: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    heroName: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statPill: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    // Squads
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    countBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 11,
        borderWidth: 1,
        paddingHorizontal: 13,
        paddingVertical: 8,
    },
    newBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    squadsRow: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 6,
    },
    squadCardWrap: {
        width: 280,
    },
    emptySquads: {
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    emptySquadsText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Activity
    activityCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    emptyActivityText: {
        fontSize: 14,
        textAlign: 'center',
        padding: 28,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitle: {
        fontSize: 13.5,
        fontWeight: '600',
        marginBottom: 2,
    },
    activityMessage: {
        fontSize: 12,
    },
    activityTime: {
        fontSize: 11,
    },
});
