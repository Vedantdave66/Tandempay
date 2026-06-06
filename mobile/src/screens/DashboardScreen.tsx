import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView,
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
import ThemeToggle from '../components/ThemeToggle';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import Logo from '../components/Logo';
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
                            style={[styles.bellButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
                            <Text style={[styles.statPillLabel, { color: colors.secondaryText }]}>YOU'RE OWED</Text>
                            <Text style={[styles.statPillValue, { color: colors.accent }]}>${formatCurrency(owedToMe)}</Text>
                        </View>
                        <View style={[styles.statPill, { backgroundColor: colors.accentBgFaint }]}>
                            <Text style={[styles.statPillLabel, { color: colors.secondaryText }]}>YOU OWE</Text>
                            <Text style={[styles.statPillValue, { color: colors.warningBright }]}>${formatCurrency(iOwe)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Your squads */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your squads</Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                            <Text style={[styles.countBadgeText, { color: isDark ? '#0D2B12' : '#0A5F30' }]}>{groups.length}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateGroup')}
                        style={[styles.ghostButton, { borderColor: colors.border }]}
                    >
                        <Text style={[styles.ghostButtonText, { color: colors.accentDark }]}>+ New</Text>
                    </TouchableOpacity>
                </View>

                {groups.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                            No squads yet — create one to get started.
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
                                <GroupCard
                                    key={item.id}
                                    group={item}
                                    members={members}
                                    myNetBalance={myBalance?.net_balance ?? 0}
                                    compact
                                    onPress={() => navigation.navigate('Group', { groupId: item.id })}
                                />
                            );
                        })}
                    </ScrollView>
                )}

                {/* Recent activity */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: scale(20), marginTop: vs(28), marginBottom: vs(14) }]}>
                    Recent activity
                </Text>
                <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {recentActivity.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.secondaryText, padding: scale(20), textAlign: 'center' }]}>
                            No activity yet
                        </Text>
                    ) : (
                        recentActivity.map((n, i) => {
                            const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: '#888' };
                            const IconComp = cfg.icon;
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
                                        <IconComp size={18} color={cfg.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                                            {n.title}
                                        </Text>
                                        <Text style={[styles.activityMessage, { color: colors.secondaryText }]} numberOfLines={1}>
                                            {n.message}
                                        </Text>
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
    screen: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
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
        width: scale(38),
        height: scale(38),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
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

    // Hero
    heroCard: {
        marginHorizontal: scale(16),
        borderRadius: ms(24),
        padding: scale(20),
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: scale(12),
        marginBottom: vs(16),
    },
    heroLeft: { flexShrink: 1 },
    heroGreeting: {
        fontSize: ms(13),
        fontWeight: '600',
        marginBottom: vs(2),
    },
    heroName: {
        fontSize: ms(26),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statsRow: {
        flexDirection: 'row',
        gap: scale(10),
    },
    statPill: {
        flex: 1,
        borderRadius: ms(16),
        padding: scale(14),
    },
    statPillLabel: {
        fontSize: ms(11),
        fontWeight: '700',
        letterSpacing: 0.7,
        marginBottom: vs(4),
    },
    statPillValue: {
        fontSize: ms(20),
        fontWeight: '800',
        letterSpacing: -0.4,
    },

    // Squads section
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(26),
        paddingBottom: vs(12),
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    sectionTitle: {
        fontSize: ms(18),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    countBadge: {
        minWidth: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        paddingHorizontal: scale(7),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    countBadgeText: {
        fontSize: ms(12),
        fontWeight: '700',
    },
    ghostButton: {
        borderWidth: 1,
        borderRadius: ms(11),
        paddingHorizontal: scale(13),
        paddingVertical: vs(8),
    },
    ghostButtonText: {
        fontSize: ms(13),
        fontWeight: '700',
    },
    squadsRow: {
        paddingHorizontal: scale(20),
        gap: scale(12),
    },
    emptyState: {
        marginHorizontal: scale(20),
        padding: scale(32),
        borderRadius: ms(20),
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: ms(13),
        textAlign: 'center',
        lineHeight: ms(20),
    },

    // Activity
    activityCard: {
        marginHorizontal: scale(16),
        borderRadius: ms(16),
        borderWidth: 1,
        overflow: 'hidden',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        padding: scale(14),
    },
    activityIcon: {
        width: scale(44),
        height: scale(44),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitle: {
        fontSize: ms(14),
        fontWeight: '600',
        marginBottom: vs(2),
    },
    activityMessage: {
        fontSize: ms(12),
    },
    activityTime: {
        fontSize: ms(11),
        marginLeft: scale(8),
    },
});
