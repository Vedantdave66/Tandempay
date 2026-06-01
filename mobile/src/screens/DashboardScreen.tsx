import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    groupsApi, balancesApi, notificationsApi,
    GroupListItem, UserBalance, NotificationOut,
} from '../services/api';
import {
    LogOut, Plus, Users, ArrowRight, Bell, ArrowDownLeft, ArrowUpRight, Palette,
    Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake,
} from 'lucide-react-native';
import ThemeToggle from '../components/ThemeToggle';
import { useNotifications } from '../context/NotificationContext';
import GroupCard from '../components/GroupCard';
import CharacterShape from '../components/CharacterShape';
import CharacterSetupModal from '../components/CharacterSetupModal';
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
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();
    const { unreadCount } = useNotifications();
    const insets = useSafeAreaInsets();

    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [balanceMap, setBalanceMap] = useState<Record<string, UserBalance[]>>({});
    const [owedToMe, setOwedToMe] = useState(0);
    const [iOwe, setIOwe] = useState(0);
    const [recentActivity, setRecentActivity] = useState<NotificationOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCharacterPicker, setShowCharacterPicker] = useState(false);

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

    const renderGroup = ({ item }: { item: GroupListItem }) => {
        const members = balanceMap[item.id] ?? [];
        const myBalance = members.find(m => m.user_id === user?.id);
        return (
            <GroupCard
                group={item}
                members={members}
                myNetBalance={myBalance?.net_balance ?? 0}
                onPress={() => navigation.navigate('Group', { groupId: item.id })}
            />
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>

            {/* ── Header ── */}
            <View style={styles.header}>
                {/* Character + greeting */}
                <View style={styles.headerLeft}>
                    <CharacterShape
                        shape={user?.character_shape ?? 'rect'}
                        color={user?.character_color ?? '#34D399'}
                        variant="hero"
                    />
                    <View style={styles.greetingBlock}>
                        <View style={styles.greetingRow}>
                            <Text style={[styles.greeting, { color: colors.text }]}>
                                Hey, {firstName} 👋
                            </Text>
                            {user?.subscription_tier === 'pro' && (
                                <View style={styles.proBadge}>
                                    <Text style={styles.proBadgeText}>PRO</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                            Here's where things stand with your squads.
                        </Text>
                    </View>
                </View>

                {/* Action buttons — aligned to top */}
                <View style={[styles.headerActions, { alignSelf: 'flex-start' }]}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Bell color={colors.secondaryText} size={20} />
                        {unreadCount > 0 && (
                            <View style={styles.bellBadge}>
                                <Text style={styles.bellBadgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <ThemeToggle />
                    <TouchableOpacity
                        onPress={logout}
                        style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <LogOut color={colors.danger} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Balance stat cards ── */}
            <View style={styles.statsRow}>
                {/* You're owed */}
                <View style={[styles.statCard, {
                    backgroundColor: 'rgba(34,197,94,0.08)',
                    borderColor: 'rgba(34,197,94,0.2)',
                }]}>
                    <View style={styles.statCardTop}>
                        <View style={[styles.statIcon, {
                            backgroundColor: 'rgba(34,197,94,0.15)',
                            borderColor: 'rgba(34,197,94,0.2)',
                        }]}>
                            <ArrowDownLeft color="#22C55E" size={18} />
                        </View>
                        <View style={[styles.badge, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }]}>
                            <Text style={[styles.badgeText, { color: '#22C55E' }]}>INCOMING</Text>
                        </View>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>You're owed</Text>
                    <Text style={[styles.statValue, { color: '#22C55E' }]}>${formatCurrency(owedToMe)}</Text>
                </View>

                {/* You owe */}
                <View style={[styles.statCard, {
                    backgroundColor: 'rgba(245,158,11,0.08)',
                    borderColor: 'rgba(245,158,11,0.2)',
                }]}>
                    <View style={styles.statCardTop}>
                        <View style={[styles.statIcon, {
                            backgroundColor: 'rgba(245,158,11,0.15)',
                            borderColor: 'rgba(245,158,11,0.2)',
                        }]}>
                            <ArrowUpRight color="#F59E0B" size={18} />
                        </View>
                        <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                            <Text style={[styles.badgeText, { color: '#F59E0B' }]}>OUTGOING</Text>
                        </View>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>You owe</Text>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>${formatCurrency(iOwe)}</Text>
                </View>
            </View>

            {/* ── Groups list ── */}
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={renderGroup}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 68 + 8 + 24 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
                ListHeaderComponent={
                    <View>
                        {/* Pro upsell banner */}
                        {user?.subscription_tier !== 'pro' && (
                            <TouchableOpacity
                                style={[styles.upsellBanner, {
                                    backgroundColor: isDark ? 'rgba(74,222,128,0.08)' : 'rgba(22,163,74,0.06)',
                                    borderColor: isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.2)',
                                }]}
                                onPress={() => navigation.navigate('ProUpgrade')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.upsellEmoji}>👑</Text>
                                <View style={styles.upsellTextBlock}>
                                    <Text style={[styles.upsellTitle, { color: colors.text }]}>Unlock Pro features</Text>
                                    <Text style={[styles.upsellSub, { color: colors.secondaryText }]}>
                                        Recurring splits, CSV export & more — from $4.99/mo
                                    </Text>
                                </View>
                                <ArrowRight color={colors.accent} size={18} />
                            </TouchableOpacity>
                        )}

                        {/* Character customise row */}
                        <TouchableOpacity
                            onPress={() => setShowCharacterPicker(true)}
                            style={[styles.customiseRow, {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            }]}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.customiseIcon, {
                                backgroundColor: `${colors.accent}1A`,
                                borderColor: `${colors.accent}33`,
                            }]}>
                                <Palette color={colors.accent} size={20} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.customiseTitle, { color: colors.text }]}>
                                    Customise your character
                                </Text>
                                <Text style={[styles.customiseSub, { color: colors.secondaryText }]}>
                                    Pick your colour, shape, and nickname
                                </Text>
                            </View>
                            <ArrowRight color={colors.secondaryText} size={16} />
                        </TouchableOpacity>

                        {/* Section header */}
                        <Text style={[styles.listTitle, { color: colors.text }]}>Your Groups</Text>
                    </View>
                }
                ListFooterComponent={() => (
                    <View style={{ marginTop: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.listTitle, { color: colors.text }]}>Recent Activity</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {recentActivity.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>No activity yet</Text>
                            </View>
                        ) : (
                            recentActivity.map(n => {
                                const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: '#888' };
                                const IconComp = cfg.icon;
                                return (
                                    <TouchableOpacity
                                        key={n.id}
                                        style={[styles.activityRow, {
                                            backgroundColor: n.read ? colors.surface : `${cfg.color}12`,
                                            borderLeftColor: n.read ? 'transparent' : cfg.color,
                                            borderColor: colors.border,
                                        }]}
                                        onPress={() => n.group_id && navigation.navigate('Group', { groupId: n.group_id })}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.activityDot, { backgroundColor: cfg.color, opacity: n.read ? 0.3 : 1 }]} />
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <Text style={[styles.activityTitle, { color: n.read ? colors.secondaryText : colors.text }]} numberOfLines={1}>
                                                    {n.title}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: colors.secondaryText }}>{timeAgo(n.created_at)}</Text>
                                            </View>
                                            <Text style={{ fontSize: 12, color: colors.secondaryText }} numberOfLines={1}>{n.message}</Text>
                                        </View>
                                        <IconComp size={15} color={cfg.color} style={{ opacity: n.read ? 0.4 : 1, marginLeft: 8 }} />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Users color={colors.secondaryText} size={48} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                            Create a group to start tracking expenses.
                        </Text>
                    </View>
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('CreateGroup')}
                activeOpacity={0.8}
            >
                <Plus color={isDark ? '#064E3B' : '#1A1A1A'} size={24} />
            </TouchableOpacity>

            {/* Character picker modal */}
            <CharacterSetupModal
                visible={showCharacterPicker}
                onClose={() => setShowCharacterPicker(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        flex: 1,
    },
    greetingBlock: {
        flex: 1,
        paddingBottom: 4,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    greeting: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    proBadge: {
        backgroundColor: '#16a34a',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    proBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        lineHeight: 17,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 4,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    bellBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#E05252',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    bellBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    statCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },

    // List
    listContent: {
        paddingHorizontal: 24,
    },
    upsellBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    upsellEmoji: { fontSize: 24, marginRight: 12 },
    upsellTextBlock: { flex: 1 },
    upsellTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    upsellSub: { fontSize: 12, lineHeight: 17 },
    customiseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    customiseIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customiseTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    customiseSub: { fontSize: 12 },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
        marginBottom: 14,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 12,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderWidth: 0.5,
        gap: 10,
    },
    activityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    activityTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 6 },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
});
