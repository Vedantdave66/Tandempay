import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { notificationsApi, NotificationOut } from '../services/api';
import * as Haptics from 'expo-haptics';
import { Bell, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake } from 'lucide-react-native';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';

// Icon per type; colour stays disciplined — green for confirmed money,
// danger for declined, greyscale for everything else.
const TYPE_ICONS: Record<string, any> = {
    expense_added:        Receipt,
    settlement_requested: Handshake,
    payment_sent:         Send,
    payment_confirmed:    CheckCheck,
    payment_declined:     ShieldAlert,
    friend_request:       UserPlus,
    friend_accepted:      Check,
};

// ─── Date grouping ────────────────────────────────────────────────────────────
function getGroup(d: string): string {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return 'This Week';
    return 'Earlier';
}

function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1)   return 'Just now';
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

// Group and sort notifications
function groupNotifications(list: NotificationOut[]): Array<{ type: 'header'; label: string } | { type: 'item'; data: NotificationOut }> {
    const ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const grouped: Record<string, NotificationOut[]> = {};
    for (const n of list) {
        const g = getGroup(n.created_at);
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(n);
    }
    const result: Array<{ type: 'header'; label: string } | { type: 'item'; data: NotificationOut }> = [];
    for (const label of ORDER) {
        if (grouped[label]?.length) {
            result.push({ type: 'header', label });
            for (const item of grouped[label]) {
                result.push({ type: 'item', data: item });
            }
        }
    }
    return result;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ActivityScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { refreshNotifications, clearUnread } = useNotifications();

    const [notifications, setNotifications] = useState<NotificationOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await notificationsApi.list();
            setNotifications(data || []);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh on focus + every 30s
    useEffect(() => {
        const unsub = navigation.addListener('focus', load);
        return unsub;
    }, [navigation, load]);

    useEffect(() => {
        const interval = setInterval(load, 30_000);
        return () => clearInterval(interval);
    }, [load]);

    const handleMarkAllRead = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await notificationsApi.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        clearUnread();
    };

    const handleTap = async (n: NotificationOut) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!n.read) {
            await notificationsApi.markRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            refreshNotifications();
        }
        if (n.group_id) navigation.navigate('Group', { groupId: n.group_id });
    };

    const hasUnread = notifications.some(n => !n.read);
    const rows = groupNotifications(notifications);

    const iconTint = (type: string) => {
        if (type === 'payment_confirmed') return colors.accent;
        if (type === 'payment_declined')  return colors.danger;
        return colors.secondaryText;
    };

    const renderRow = ({ item }: { item: typeof rows[number] }) => {
        if (item.type === 'header') {
            return (
                <Text style={[styles.groupLabel, { color: colors.secondaryText }, T.semibold]}>
                    {item.label}
                </Text>
            );
        }

        const n = item.data;
        const IconComp = TYPE_ICONS[n.type] ?? Bell;

        return (
            <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.surface }]}
                onPress={() => handleTap(n)}
                activeOpacity={0.85}
            >
                {!n.read
                    ? <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                    : <View style={styles.dot} />
                }
                <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                        <Text style={[styles.rowTitle, { color: colors.text }, n.read ? T.regular : T.semibold]}>
                            {n.title}
                        </Text>
                        <Text style={[styles.rowTime, { color: colors.faintText }, T.regular]}>
                            {timeAgo(n.created_at)}
                        </Text>
                    </View>
                    <Text style={[styles.rowMsg, { color: colors.secondaryText }, T.regular]} numberOfLines={2}>
                        {n.message}
                    </Text>
                </View>
                <IconComp size={20} color={iconTint(n.type)} style={{ opacity: n.read ? 0.5 : 1 }} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }, T.bold]}>Activity</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }, T.regular]}>
                        {notifications.filter(n => !n.read).length > 0
                            ? `${notifications.filter(n => !n.read).length} unread`
                            : 'All caught up'}
                    </Text>
                </View>
                {hasUnread && (
                    <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.75} style={styles.markAllBtn}>
                        <Text style={[styles.markAllText, { color: colors.accent }, T.semibold]}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(item, idx) =>
                        item.type === 'header' ? `h-${item.label}` : `n-${item.data.id}`
                    }
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={colors.accent}
                        />
                    }
                    ItemSeparatorComponent={() => (
                        <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <CharacterShape shape="semi" color={colors.accent} variant="mini" />
                            <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>Quiet in here</Text>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }, T.regular]}>
                                When your squads add expenses or settle up, you'll see it here first.
                            </Text>
                        </View>
                    }
                    renderItem={renderRow}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingTop: vs(16),
        paddingBottom: vs(16),
    },
    title: { fontSize: ms(28), letterSpacing: -0.8 },
    subtitle: { fontSize: ms(13), marginTop: vs(2) },
    markAllBtn: {
        paddingVertical: vs(8),
        paddingLeft: scale(12),
    },
    markAllText: { fontSize: ms(15) },
    divider: { height: StyleSheet.hairlineWidth, marginBottom: vs(8) },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingBottom: vs(120) },
    groupLabel: {
        fontSize: ms(13),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
        paddingHorizontal: scale(20),
        paddingTop: vs(20),
        paddingBottom: vs(6),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(12),
        paddingHorizontal: scale(20),
        minHeight: vs(44),
        gap: scale(12),
    },
    dot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        flexShrink: 0,
    },
    rowBody: { flex: 1 },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(3),
    },
    rowTitle: { fontSize: ms(15), flex: 1, marginRight: scale(8) },
    rowTime:  { fontSize: ms(12) },
    rowMsg:   { fontSize: ms(14), lineHeight: 19 },
    separator: { height: StyleSheet.hairlineWidth, marginLeft: scale(40) },
    empty: {
        alignItems: 'center',
        paddingTop: vs(64),
        paddingHorizontal: scale(40),
        gap: vs(8),
    },
    emptyTitle: { fontSize: ms(17), marginTop: vs(8) },
    emptyText: { fontSize: ms(15), textAlign: 'center', lineHeight: 21 },
});
