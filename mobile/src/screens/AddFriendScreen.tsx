import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, FlatList
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { friendsApi, Friend } from '../services/api';
import { Search, UserPlus, X, Check, Send } from 'lucide-react-native';

function Avatar({ name, color, size = 42 }: { name: string; color: string; size?: number }) {
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color || '#555', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.38 }}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
    );
}

export default function AddFriendScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const inputRef = useRef<TextInput>(null);

    // Pre-load friends list to check for duplicates
    useEffect(() => {
        friendsApi.getMyFriends().then(f => setFriends(f || [])).catch(() => {});
    }, []);

    const handleSend = async () => {
        const trimmed = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' });
            return;
        }
        const alreadyFriend = friends.some(f => f.email.toLowerCase() === trimmed);
        if (alreadyFriend) {
            setMessage({ type: 'error', text: 'This person is already your friend.' });
            return;
        }
        setSending(true);
        setMessage(null);
        try {
            await friendsApi.sendRequest(trimmed);
            setMessage({ type: 'success', text: 'Friend request sent!' });
            setEmail('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to send request.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <X color={colors.text} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Add Friend</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {/* Hero */}
                    <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <UserPlus color={colors.indigo} size={34} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Send a Friend Request</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        Enter your friend's email address to connect on Tandem.
                    </Text>

                    {/* Message */}
                    {message && (
                        <View style={[styles.msgBox, {
                            backgroundColor: message.type === 'success' ? `${colors.accent}15` : `${colors.danger}15`,
                            borderColor: message.type === 'success' ? `${colors.accent}40` : `${colors.danger}40`,
                        }]}>
                            {message.type === 'success'
                                ? <Check color={colors.accent} size={16} />
                                : <X color={colors.danger} size={16} />}
                            <Text style={[styles.msgText, { color: message.type === 'success' ? colors.accent : colors.danger }]}>
                                {message.text}
                            </Text>
                        </View>
                    )}

                    {/* Input row */}
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Search color={colors.secondaryText} size={18} />
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: colors.text }]}
                            placeholder="name@email.com"
                            placeholderTextColor={colors.secondaryText}
                            value={email}
                            onChangeText={t => { setEmail(t); setMessage(null); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                        />
                        {email.length > 0 && (
                            <TouchableOpacity onPress={() => setEmail('')}>
                                <X color={colors.secondaryText} size={16} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.indigo, opacity: sending || !email.trim() ? 0.6 : 1 }]}
                        onPress={handleSend}
                        disabled={sending || !email.trim()}
                        activeOpacity={0.8}
                    >
                        {sending
                            ? <ActivityIndicator color="white" size="small" />
                            : <><Send color="white" size={16} /><Text style={styles.btnText}> Send Request</Text></>
                        }
                    </TouchableOpacity>

                    {/* Current friends list for reference */}
                    {friends.length > 0 && (
                        <View style={{ marginTop: 32, width: '100%' }}>
                            <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>YOUR FRIENDS ({friends.length})</Text>
                            {friends.slice(0, 5).map(f => (
                                <View key={f.id} style={[styles.friendRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Avatar name={f.name} color={f.avatar_color} size={38} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.text }]}>{f.name}</Text>
                                        <Text style={[{ fontSize: 12, color: colors.secondaryText }]}>{f.email}</Text>
                                    </View>
                                    <Check color={colors.accent} size={16} />
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 36 },
    iconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, width: '100%', marginBottom: 16 },
    msgText: { fontSize: 13, fontWeight: '600', flex: 1 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 16, borderRadius: 16, borderWidth: 1, width: '100%', marginBottom: 14,
    },
    input: { flex: 1, fontSize: 15 },
    btn: { flexDirection: 'row', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnText: { color: 'white', fontWeight: '800', fontSize: 15 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, alignSelf: 'flex-start' },
    friendRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8, width: '100%' },
});
