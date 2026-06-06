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
import { scale, vs, ms } from '../utils/responsive';
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
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: vs(40) }} />
                ) : activeTab === 'activity' ? (
                    /* Activity Tab */
                    activity.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Bell size={40} color={colors.secondaryText} style={{ marginBottom: vs(16) }} />
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
                            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: vs(24) }]}>
                                <Users size={40} color={colors.secondaryText} style={{ marginBottom: vs(16) }} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                                <Text style={[styles.emptyDesc, { color: colors.secondaryText }]}>Add friends using their email to make splitting easier.</Text>
                            </View>
                        ) : (
                            friends.map(friend => (
                                <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.friendTop}>
                                        <CharacterShape shape="rect" color={friend.avatar_color} variant="mini" />
                                        <View style={{ marginLeft: scale(12) }}>
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
                            <View style={{ marginBottom: vs(28) }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Received</Text>
                                {requests.received.map(req => (
                                    <View key={req.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={styles.friendTop}>
                                            <CharacterShape shape="rect" color={req.sender_avatar} variant="mini" />
                                            <View style={{ marginLeft: scale(12), flex: 1 }}>
                                                <Text style={[styles.friendName, { color: colors.text }]}>{req.sender_name}</Text>
                                                <Text style={[styles.friendEmail, { color: colors.faintText }]}>{req.sender_email}</Text>
                                            </View>
                                            <View style={styles.actionBtns}>
                                                <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.iconBtn, { backgroundColor: colors.accentBg }]}>
                                                    <UserCheck size={18} color={colors.accent} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.iconBtn, { backgroundColor: colors.warningBg, marginLeft: scale(8) }]}>
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
                                            <View style={{ marginLeft: scale(12) }}>
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
        paddingHorizontal: scale(20),
        paddingTop: vs(8),
        paddingBottom: vs(16),
    },
    title: {
        fontSize: ms(26),
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: vs(16),
    },
    segmentContainer: {
        flexDirection: 'row',
        gap: vs(4),
        padding: scale(4),
        borderRadius: ms(12),
        borderWidth: 1,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(6),
        paddingVertical: vs(9),
        borderRadius: ms(8),
    },
    segmentText: {
        fontSize: ms(14),
    },
    container: {
        paddingHorizontal: scale(16),
        paddingTop: vs(8),
        paddingBottom: vs(140),
    },
    sectionTitle: {
        fontSize: ms(16),
        fontWeight: '700',
        marginBottom: vs(12),
    },

    // Activity
    activityCard: {
        borderRadius: ms(16),
        borderWidth: 1,
        overflow: 'hidden',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(12),
        padding: scale(14),
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityText: {
        fontSize: ms(14),
        fontWeight: '500',
        lineHeight: 19,
    },
    activityTime: {
        fontSize: ms(12),
        marginTop: vs(3),
    },

    // Friends
    addFriendSection: {
        marginBottom: vs(24),
    },
    inputRow: {
        flexDirection: 'row',
        gap: vs(12),
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: ms(12),
        paddingHorizontal: scale(16),
        height: 52,
        fontSize: ms(16),
    },
    sendBtn: {
        width: 52,
        height: 52,
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendCard: {
        padding: scale(16),
        borderRadius: ms(20),
        borderWidth: 1,
        marginBottom: vs(12),
    },
    friendTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(14),
    },
    friendName: {
        fontSize: ms(15),
        fontWeight: '600',
    },
    friendEmail: {
        fontSize: ms(12),
        marginTop: vs(2),
    },
    friendBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sharedChip: {
        borderRadius: 999,
        paddingHorizontal: scale(10),
        paddingVertical: vs(5),
    },
    sharedChipText: {
        fontSize: ms(12),
        fontWeight: '700',
    },
    settleBtn: {
        borderWidth: 1,
        borderRadius: ms(10),
        paddingHorizontal: scale(13),
        paddingVertical: vs(7),
    },
    settleBtnText: {
        fontSize: ms(13),
        fontWeight: '700',
    },

    // Pending
    actionBtns: {
        flexDirection: 'row',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: ms(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockAvatar: {
        width: 32,
        height: 52,
        borderRadius: ms(6),
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: vs(8),
        paddingTop: vs(40),
        paddingHorizontal: scale(20),
    },
    pendingEmptyTitle: {
        fontSize: ms(16),
        fontWeight: '500',
        marginTop: vs(8),
    },
    pendingEmptyDesc: {
        fontSize: ms(14),
        textAlign: 'center',
    },

    // Shared empty state
    emptyState: {
        padding: scale(32),
        borderRadius: ms(20),
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: ms(18),
        fontWeight: '700',
        marginBottom: vs(8),
    },
    emptyDesc: {
        fontSize: ms(14),
        textAlign: 'center',
        lineHeight: 20,
    },
});
