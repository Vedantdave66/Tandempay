import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { notificationsApi, NotificationOut } from '../services/api';
import { Bell, Receipt, Handshake, Send, CheckCheck, ShieldAlert, UserPlus, Check } from 'lucide-react-native';

function getIcon(type: string, colors: any) {
    const props = { size: 18 };
    switch (type) {
        case 'expense_added': return <Receipt color={colors.accent} {...props} />;
        case 'settlement_requested': return <Handshake color={colors.indigo} {...props} />;
        case 'payment_sent': return <Send color={colors.warning} {...props} />;
        case 'payment_confirmed': return <CheckCheck color={colors.accent} {...props} />;
        case 'payment_declined': return <ShieldAlert color={colors.danger} {...props} />;
        case 'friend_request': return <UserPlus color={colors.accent} {...props} />;
        case 'friend_accepted': return <Check color={colors.accent} {...props} />;
        default: return <Bell color={colors.secondaryText} {...props} />;
    }
}

function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export default function ActivityScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [notifications, setNotifications] = useState<NotificationOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const data = await notificationsApi.list();
            setNotifications(data || []);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsub = navigation.addListener('focus', load);
        return unsub;
    }, [navigation]);

    const handleMarkAllRead = async () => {
        await notificationsApi.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleTap = async (n: NotificationOut) => {
        if (!n.read) {
            await notificationsApi.markRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        }
        if (n.group_id) navigation.navigate('Group', { groupId: n.group_id });
    };

    const hasUnread = notifications.some(n => !n.read);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Your recent notifications</Text>
                </View>
                {hasUnread && (
                    <TouchableOpacity
                        onPress={handleMarkAllRead}
                        style={[styles.markAllBtn, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30` }]}
                    >
                        <Text style={[styles.markAllText, { color: colors.accent }]}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Bell color={colors.secondaryText} size={40} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>You're all caught up</Text>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No recent activity to show.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.row, {
                                backgroundColor: item.read ? colors.surface : `${colors.accent}08`,
                                borderColor: item.read ? colors.border : `${colors.accent}20`,
                            }]}
                            onPress={() => handleTap(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconWrap, {
                                backgroundColor: item.read ? colors.background : `${colors.accent}15`,
                                borderColor: item.read ? colors.border : `${colors.accent}30`,
                            }]}>
                                {getIcon(item.type, colors)}
                            </View>
                            <View style={styles.rowInfo}>
                                <Text style={[styles.rowTitle, { color: item.read ? `${colors.text}90` : colors.text }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.rowMsg, { color: colors.secondaryText }]} numberOfLines={2}>
                                    {item.message}
                                </Text>
                                <Text style={[styles.rowTime, { color: `${colors.secondaryText}80` }]}>{timeAgo(item.created_at)}</Text>
                            </View>
                            {!item.read && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
    },
    title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4 },
    markAllBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    markAllText: { fontSize: 12, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    row: {
        flexDirection: 'row', alignItems: 'flex-start', padding: 14,
        borderRadius: 20, marginBottom: 10, borderWidth: 1, gap: 12,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
    rowInfo: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    rowMsg: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
    rowTime: { fontSize: 11, fontWeight: '500' },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    empty: { padding: 40, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 10, marginTop: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptyText: { fontSize: 14, textAlign: 'center' },
});
