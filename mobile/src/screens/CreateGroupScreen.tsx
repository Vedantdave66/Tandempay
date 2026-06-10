import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { groupsApi } from '../services/api';
import { Users, X } from 'lucide-react-native';

export default function CreateGroupScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert('Error', 'Please enter a group name.');
            return;
        }
        setLoading(true);
        try {
            const group = await groupsApi.create(trimmed);
            navigation.goBack();
            navigation.navigate('Group', { groupId: group.id });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to create group.');
        } finally {
            setLoading(false);
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Group</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Users color={colors.accent} size={36} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Create a Group</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        Give your group a name — like "Miami Trip" or "Apartment".
                    </Text>

                    {/* Input */}
                    <View style={styles.fieldWrap}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>Group Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Miami Trip 🌴"
                            placeholderTextColor={colors.secondaryText}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            maxLength={60}
                            returnKeyType="done"
                            onSubmitEditing={handleCreate}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.accent, opacity: loading || !name.trim() ? 0.6 : 1 }]}
                        onPress={handleCreate}
                        disabled={loading || !name.trim()}
                        activeOpacity={0.8}
                    >
                        {loading
                            ? <ActivityIndicator color="#064E3B" />
                            : <Text style={styles.btnText}>Create Group</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: vs(14),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: ms(17), fontWeight: '700' },
    closeBtn: {
        width: scale(44), height: scale(44), borderRadius: ms(14),
        alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
    },
    content: { alignItems: 'center', paddingHorizontal: scale(24), paddingTop: vs(40), paddingBottom: vs(40) },
    iconWrap: {
        width: 80, height: 80, borderRadius: ms(24),
        alignItems: 'center', justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth, marginBottom: vs(24),
    },
    title: { fontSize: ms(26), fontWeight: '900', marginBottom: vs(8) },
    subtitle: { fontSize: ms(15), textAlign: 'center', marginBottom: vs(36), lineHeight: 22 },
    fieldWrap: { width: '100%', marginBottom: vs(24) },
    label: { fontSize: ms(13), fontWeight: '600', marginBottom: vs(8), textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', paddingHorizontal: scale(16), height: vs(52), borderRadius: ms(14),
        borderWidth: StyleSheet.hairlineWidth, fontSize: ms(16),
    },
    btn: {
        width: '100%', paddingVertical: vs(17), borderRadius: ms(16),
        alignItems: 'center',
    },
    btnText: { color: '#064E3B', fontWeight: '800', fontSize: ms(16) },
});
