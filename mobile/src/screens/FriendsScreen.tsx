import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Bell, Users, Clock, MailPlus, UserCheck, UserX, Receipt, Send, CheckCheck, ShieldAlert, UserPlus, Check, Handshake } from 'lucide-react-native';
import { friendsApi, notificationsApi, Friend, PendingRequests, NotificationOut } from '../services/api';
import CharacterShape from '../components/CharacterShape';

// Mirrors DashboardScreen's notification → icon mapping; the friend "Activity"
// feed reuses the same notifications endpoint since there's no dedicated one.
const TYPE_CONFIG: Record<string, { icon: any; tint: 'green' | 'neutral' }> = {
    expense_added:        { icon: Receipt,     tint: 'green' },
    settlement_requested: { icon: Handshake,   tint: 'neutral' },
    payment_sent:         { icon: Send,        tint: 'neutral' },
    payment_confirmed:    { icon: CheckCheck,  tint: 'green' },
    payment_declined:     { icon: ShieldAlert, tint: 'neutral' },
    friend_request:       { icon: UserPlus,    tint: 'green' },
    friend_accepted:      { icon: Check,       tint: 'green' },
};

function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export default function FriendsScreen() {
    const { colors } = useTheme();

    const [activeTab, setActiveTab] = useState<'activity' | 'friends' | 'pending'>('activity');
    const [emailInput, setEmailInput] = useState('');

    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<PendingRequests>({ sent: [], received: [] });
    const [activity, setActivity] = useState<NotificationOut[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        try {
            const [friendsData, requestsData] = await Promise.all([
                friendsApi.getMyFriends(),
                friendsApi.getPendingRequests()
            ]);
            setFriends(friendsData);
            setRequests(requestsData);

            notificationsApi.list()
                .then(data => setActivity((data || []).slice(0, 8)))
                .catch(() => {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSendRequest = async () => {
        if (!emailInput.trim()) return;
        setSubmitting(true);
        try {
            await friendsApi.sendRequest(emailInput.trim());
            setEmailInput('');
            Alert.alert("Success", "Friend request sent!");
            await loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to send request.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await friendsApi.acceptRequest(id);
            await loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const handleDecline = async (id: string) => {
        try {
            await friendsApi.declineRequest(id);
            await loadData();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const segments: { id: 'activity' | 'friends' | 'pending'; label: string; icon: any }[] = [
        { id: 'activity', label: 'Activity', icon: Bell },
        { id: 'friends',  label: 'Friends',  icon: Users },
        { id: 'pending',  label: 'Pending',  icon: Clock },
    ];

    const noPending = requests.received.length === 0 && requests.sent.length === 0;

    return (
        <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Your people 👋</Text>

                {/* Segmented Control */}
                <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {segments.map(seg => {
                        const active = activeTab === seg.id;
                        const Icon = seg.icon;
                        return (
                            <TouchableOpacity
                                key={seg.id}
                                style={[styles.segment, active && { backgroundColor: colors.accent }]}
                                onPress={() => setActiveTab(seg.id)}
                                activeOpacity={0.8}
                            >
                                <Icon size={15} color={active ? '#fff' : colors.secondaryText} />
                                <Text style={[styles.segmentText, { color: active ? '#fff' : colors.secondaryText, fontWeight: active ? '700' : '600' }]}>
                                    {seg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
                ) : activeTab === 'activity' ? (
                    /* Activity Tab */
                    activity.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Bell size={40} color={colors.secondaryText} style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
                            <Text style={[styles.emptyDesc, { color: colors.secondaryText }]}>
                                Activity from your friends and squads will show up here.
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {activity.map((a, i) => {
                                const cfg = TYPE_CONFIG[a.type] || { icon: Bell, tint: 'neutral' as const };
                                const Icon = cfg.icon;
                                return (
                                    <View
                                        key={a.id}
                                        style={[
                                            styles.activityRow,
                                            i < activity.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                        ]}
                                    >
                                        <View style={[styles.activityIcon, { backgroundColor: colors.accentBg }]}>
                                            <Icon size={18} color={cfg.tint === 'green' ? colors.accent : colors.secondaryText} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
                                                {a.message || a.title}
                                            </Text>
                                            <Text style={[styles.activityTime, { color: colors.faintText }]}>{timeAgo(a.created_at)}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )
                ) : activeTab === 'friends' ? (
                    /* Friends Tab */
                    <>
                        <View style={styles.addFriendSection}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Friend by Email</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    placeholder="friend@example.com"
                                    placeholderTextColor={colors.secondaryText}
                                    value={emailInput}
                                    onChangeText={setEmailInput}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                                <TouchableOpacity
                                    style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: emailInput.length ? 1 : 0.5 }]}
                                    onPress={handleSendRequest}
                                    disabled={!emailInput.length || submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <MailPlus color="#fff" size={20} />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {friends.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
                                <Users size={40} color={colors.secondaryText} style={{ marginBottom: 16 }} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }]}>Add friends using their email to make splitting easier.</Text>
                            </View>
                        ) : (
                            friends.map(friend => (
                                <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.friendTop}>
                                        <CharacterShape shape="rect" color={friend.avatar_color} variant="mini" />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                                            <Text style={[styles.friendEmail, { color: colors.faintText }]}>{friend.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.friendBottom}>
                                        <View style={[styles.sharedChip, { backgroundColor: colors.accentBg }]}>
                                            <Text style={[styles.sharedChipText, { color: colors.accent }]}>
                                                {friend.shared_groups_count} shared squads
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={[styles.settleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} activeOpacity={0.8}>
                                            <Text style={[styles.settleBtnText, { color: colors.accent }]}>Settle up</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                ) : (
                    /* Pending Tab */
                    <>
                        {requests.received.length > 0 && (
                            <View style={{ marginBottom: 28 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Received</Text>
                                {requests.received.map(req => (
                                    <View key={req.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={styles.friendTop}>
                                            <CharacterShape shape="rect" color={req.sender_avatar} variant="mini" />
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={[styles.friendName, { color: colors.text }]}>{req.sender_name}</Text>
                                                <Text style={[styles.friendEmail, { color: colors.faintText }]}>{req.sender_email}</Text>
                                            </View>
                                            <View style={styles.actionBtns}>
                                                <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.iconBtn, { backgroundColor: colors.accentBg }]}>
                                                    <UserCheck size={18} color={colors.accent} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.iconBtn, { backgroundColor: colors.warningBg, marginLeft: 8 }]}>
                                                    <UserX size={18} color={colors.danger} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {requests.sent.length > 0 && (
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Sent</Text>
                                {requests.sent.map(req => (
                                    <View key={req.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={styles.friendTop}>
                                            <View style={[styles.clockAvatar, { backgroundColor: colors.accentBg }]}>
                                                <Clock size={20} color={colors.secondaryText} />
                                            </View>
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={[styles.friendName, { color: colors.text }]}>{req.receiver_email}</Text>
                                                <Text style={[styles.friendEmail, { color: colors.faintText }]}>Pending acceptance...</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {noPending && (
                            <View style={styles.pendingEmpty}>
                                <CharacterShape shape="semi" color={colors.indigo} variant="hero" />
                                <Text style={[styles.pendingEmptyTitle, { color: colors.faintText }]}>No pending requests</Text>
                                <Text style={[styles.pendingEmptyDesc, { color: colors.secondaryText }]}>
                                    When someone adds you, they'll show up here.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 16,
    },
    segmentContainer: {
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 8,
    },
    segmentText: {
        fontSize: 14,
    },
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 140,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },

    // Activity
    activityCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
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
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 19,
    },
    activityTime: {
        fontSize: 12,
        marginTop: 3,
    },

    // Friends
    addFriendSection: {
        marginBottom: 24,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 16,
    },
    sendBtn: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    friendTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    friendName: {
        fontSize: 15,
        fontWeight: '600',
    },
    friendEmail: {
        fontSize: 12,
        marginTop: 2,
    },
    friendBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sharedChip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    sharedChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    settleBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 13,
        paddingVertical: 7,
    },
    settleBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Pending
    actionBtns: {
        flexDirection: 'row',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockAvatar: {
        width: 32,
        height: 52,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    pendingEmptyTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 8,
    },
    pendingEmptyDesc: {
        fontSize: 14,
        textAlign: 'center',
    },

    // Shared empty state
    emptyState: {
        padding: 32,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
