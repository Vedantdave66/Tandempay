import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { notificationsApi, NotificationOut } from '../services/api';
import { Bell, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake } from 'lucide-react-native';

// ─── Icon colour map ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
    expense_added:        { icon: Receipt,    color: '#A8D5A2' },
    settlement_requested: { icon: Handshake,  color: '#818CF8' },
    payment_sent:         { icon: Send,       color: '#F59E0B' },
    payment_confirmed:    { icon: CheckCheck, color: '#A8D5A2' },
    payment_declined:     { icon: ShieldAlert, color: '#E05252' },
    friend_request:       { icon: UserPlus,   color: '#A8D5A2' },
    friend_accepted:      { icon: Check,      color: '#A8D5A2' },
};

function getConfig(type: string) {
    return TYPE_CONFIG[type] || { icon: Bell, color: '#888' };
}

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
        await notificationsApi.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        clearUnread();
    };

    const handleTap = async (n: NotificationOut) => {
        if (!n.read) {
            await notificationsApi.markRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            refreshNotifications();
        }
        if (n.group_id) navigation.navigate('Group', { groupId: n.group_id });
    };

    const hasUnread = notifications.some(n => !n.read);
    const rows = groupNotifications(notifications);

    const renderRow = ({ item }: { item: typeof rows[number] }) => {
        if (item.type === 'header') {
            return (
                <Text style={[styles.groupLabel, { color: colors.secondaryText }]}>
                    {item.label}
                </Text>
            );
        }

        const n = item.data;
        const cfg = getConfig(n.type);
        const IconComp = cfg.icon;

        return (
            <TouchableOpacity
                style={[
                    styles.row,
                    {
                        backgroundColor: n.read
                            ? colors.surface
                            : (isDark ? `${cfg.color}12` : `${cfg.color}10`),
                        borderLeftColor: n.read ? 'transparent' : cfg.color,
                    },
                ]}
                onPress={() => handleTap(n)}
                activeOpacity={0.7}
            >
                <View style={[styles.dot, { backgroundColor: cfg.color, opacity: n.read ? 0.3 : 1 }]} />
                <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                        <Text style={[styles.rowTitle, { color: n.read ? colors.secondaryText : colors.text }]}>
                            {n.title}
                        </Text>
                        <Text style={[styles.rowTime, { color: colors.secondaryText }]}>
                            {timeAgo(n.created_at)}
                        </Text>
                    </View>
                    <Text style={[styles.rowMsg, { color: colors.secondaryText }]} numberOfLines={2}>
                        {n.message}
                    </Text>
                </View>
                <IconComp size={16} color={cfg.color} style={{ opacity: n.read ? 0.4 : 1 }} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        {notifications.filter(n => !n.read).length > 0
                            ? `${notifications.filter(n => !n.read).length} unread`
                            : 'All caught up'}
                    </Text>
                </View>
                {hasUnread && (
                    <TouchableOpacity
                        onPress={handleMarkAllRead}
                        style={[styles.markAllBtn, { backgroundColor: `${colors.accent}18` }]}
                    >
                        <Text style={[styles.markAllText, { color: colors.accent }]}>Mark all read</Text>
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
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    )}
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
                            <Bell color={colors.secondaryText} size={36} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                                Notifications will appear here.
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(24),
        paddingTop: vs(28),
        paddingBottom: vs(16),
    },
    title: { fontSize: ms(26), fontWeight: '700', letterSpacing: -0.3 },
    subtitle: { fontSize: ms(13), marginTop: vs(3) },
    markAllBtn: {
        paddingHorizontal: scale(14),
        paddingVertical: vs(8),
        borderRadius: ms(20),
    },
    markAllText: { fontSize: ms(13), fontWeight: '600' },
    divider: { height: 1, marginBottom: vs(8) },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingBottom: vs(120) },
    groupLabel: {
        fontSize: ms(11),
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingHorizontal: scale(20),
        paddingTop: vs(20),
        paddingBottom: vs(6),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(14),
        paddingHorizontal: scale(20),
        borderLeftWidth: 3,
        gap: vs(12),
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: ms(4),
        flexShrink: 0,
    },
    rowBody: { flex: 1 },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(3),
    },
    rowTitle: { fontSize: ms(14), fontWeight: '600', flex: 1, marginRight: scale(8) },
    rowTime:  { fontSize: ms(11), fontWeight: '500' },
    rowMsg:   { fontSize: ms(13), lineHeight: 18 },
    separator: { height: StyleSheet.hairlineWidth, marginLeft: scale(44) },
    empty: {
        margin: scale(24),
        padding: scale(40),
        borderRadius: ms(20),
        alignItems: 'center',
        gap: vs(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyTitle: { fontSize: ms(16), fontWeight: '700' },
    emptyText: { fontSize: ms(13), textAlign: 'center' },
});
