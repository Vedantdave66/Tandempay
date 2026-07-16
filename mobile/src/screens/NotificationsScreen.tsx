import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import * as Haptics from 'expo-haptics';
import { Bell, Receipt, Send, CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import { notificationsApi, NotificationOut } from '../services/api';
import { T } from '../utils/typography';
import CharacterShape from '../components/CharacterShape';

function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export default function NotificationsScreen() {
    const { colors, isDark } = useTheme();
    const { clearUnread } = useNotifications();
    const { showToast } = useToast();

    const [notifications, setNotifications] = useState<NotificationOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const raw = await notificationsApi.list();
            const data: NotificationOut[] = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as any)?.items)
                    ? (raw as any).items
                    : [];
            setNotifications(data);
        } catch (err) {
            console.error('Failed to load notifications', err);
            showToast("Couldn't load notifications");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleMarkRead = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await notificationsApi.markRead(id);
        } catch {
            // optimistic update already applied — swallow
        }
    };

    const handleMarkAllRead = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        clearUnread();
        try {
            await notificationsApi.markAllRead();
            loadData();
        } catch {
            // optimistic update already applied — swallow
        }
    };

    // Colour discipline: green for confirmed money, danger for declined, greyscale otherwise.
    const getIconForType = (type: string) => {
        switch (type) {
            case 'expense_added':       return { Icon: Receipt,      color: colors.secondaryText };
            case 'settlement_requested':return { Icon: Send,         color: colors.secondaryText };
            case 'payment_sent':        return { Icon: Clock,        color: colors.secondaryText };
            case 'payment_confirmed':   return { Icon: CheckCircle2, color: colors.accent };
            case 'payment_declined':    return { Icon: XCircle,      color: colors.danger };
            default:                    return { Icon: Bell,         color: colors.secondaryText };
        }
    };

    const separatorColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const iconBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

    const renderNotification = ({ item, index }: { item: NotificationOut; index: number }) => {
        const { Icon, color } = getIconForType(item.type);
        const isFirst = index === 0;
        const isLast = index === notifications.length - 1;

        return (
            <TouchableOpacity
                style={[
                    styles.row,
                    { backgroundColor: colors.surface },
                    isFirst && { borderTopLeftRadius: ms(16), borderTopRightRadius: ms(16) },
                    isLast
                        ? { borderBottomLeftRadius: ms(16), borderBottomRightRadius: ms(16) }
                        : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
                ]}
                onPress={() => !item.read && handleMarkRead(item.id)}
                activeOpacity={item.read ? 1 : 0.85}
            >
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <Icon size={20} color={color} />
                </View>
                <View style={styles.contentBox}>
                    <View style={styles.titleRow}>
                        <Text
                            style={[styles.rowTitle, { color: colors.text }, item.read ? T.regular : T.semibold]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
                    </View>
                    <Text style={[styles.rowMessage, { color: colors.secondaryText }, T.regular]} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.faintText }, T.regular]}>
                        {timeAgo(item.created_at)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }, T.bold]}>Notifications</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }, T.regular]}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.75} style={styles.markAllBtn}>
                        <Text style={[styles.markAllText, { color: colors.accent }, T.semibold]}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                    <CharacterShape shape="semi" color={colors.accent} variant="mini" />
                    <Text style={[styles.emptyTitle, { color: colors.text }, T.semibold]}>Quiet in here</Text>
                    <Text style={[styles.emptyDesc, { color: colors.secondaryText }, T.regular]}>
                        When your squads get moving, you'll hear about it here first.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: scale(20),
        paddingTop: vs(16),
        paddingBottom: vs(16),
    },
    title: {
        fontSize: ms(28),
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: ms(13),
        marginTop: vs(2),
    },
    markAllBtn: {
        paddingVertical: vs(8),
        paddingLeft: scale(12),
    },
    markAllText: {
        fontSize: ms(15),
    },
    listContainer: {
        paddingHorizontal: scale(20),
        paddingBottom: vs(140),
    },
    row: {
        flexDirection: 'row',
        paddingVertical: vs(12),
        paddingHorizontal: scale(16),
        minHeight: vs(44),
    },
    iconBox: {
        width: scale(36),
        height: scale(36),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    contentBox: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(2),
    },
    rowTitle: {
        fontSize: ms(15),
        flex: 1,
        marginRight: scale(8),
    },
    unreadDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    rowMessage: {
        fontSize: ms(14),
        lineHeight: 20,
    },
    timeText: {
        fontSize: ms(12),
        marginTop: vs(4),
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: vs(64),
        paddingHorizontal: scale(40),
        gap: vs(8),
    },
    emptyTitle: {
        fontSize: ms(17),
        marginTop: vs(8),
    },
    emptyDesc: {
        fontSize: ms(15),
        textAlign: 'center',
        lineHeight: 21,
    },
});
