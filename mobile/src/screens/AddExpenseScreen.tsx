import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, FlatList, ScrollView
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { expensesApi, GroupMember } from '../services/api';
import { X, Receipt, DollarSign, Check } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
    navigation: any;
    route: { params: { groupId: string; members: GroupMember[] } };
}

export default function AddExpenseScreen({ navigation, route }: Props) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { groupId, members } = route.params;

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(user?.id || members[0]?.user_id || '');
    const [selectedIds, setSelectedIds] = useState<string[]>(members.map(m => m.user_id));
    const [loading, setLoading] = useState(false);

    const toggleMember = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        const trimTitle = title.trim();
        const parsedAmount = parseFloat(amount);
        if (!trimTitle) { Alert.alert('Error', 'Please enter a title.'); return; }
        if (isNaN(parsedAmount) || parsedAmount <= 0) { Alert.alert('Error', 'Please enter a valid amount.'); return; }
        if (selectedIds.length === 0) { Alert.alert('Error', 'Select at least one participant.'); return; }

        setLoading(true);
        try {
            await expensesApi.create(groupId, {
                title: trimTitle,
                amount: parsedAmount,
                paid_by: paidBy,
                participant_ids: selectedIds,
            });
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to add expense.');
        } finally {
            setLoading(false);
        }
    };

    const perPerson = selectedIds.length > 0 && !isNaN(parseFloat(amount))
        ? (parseFloat(amount) / selectedIds.length).toFixed(2)
        : '0.00';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <X color={colors.text} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Add Expense</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: loading ? 0.6 : 1 }]}
                    >
                        {loading ? <ActivityIndicator color="#064E3B" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Title */}
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Description</Text>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Receipt color={colors.secondaryText} size={18} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="e.g. Dinner at Carbone"
                            placeholderTextColor={colors.secondaryText}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                        />
                    </View>

                    {/* Amount */}
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Amount</Text>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <DollarSign color={colors.secondaryText} size={18} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.secondaryText}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Split preview */}
                    {parseFloat(amount) > 0 && selectedIds.length > 0 && (
                        <View style={[styles.splitPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.splitPreviewText, { color: colors.secondaryText }]}>
                                Split equally: <Text style={{ color: colors.accent, fontWeight: '700' }}>${perPerson}</Text> per person
                            </Text>
                        </View>
                    )}

                    {/* Paid by */}
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Paid By</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ gap: 8 }}>
                        {members.map(m => (
                            <TouchableOpacity
                                key={m.user_id}
                                onPress={() => setPaidBy(m.user_id)}
                                style={[styles.chip, {
                                    backgroundColor: paidBy === m.user_id ? colors.accent : colors.surface,
                                    borderColor: paidBy === m.user_id ? colors.accent : colors.border,
                                }]}
                            >
                                <Text style={[styles.chipText, { color: paidBy === m.user_id ? '#064E3B' : colors.text }]}>
                                    {m.name.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Split between */}
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Split Between</Text>
                    {members.map(m => {
                        const selected = selectedIds.includes(m.user_id);
                        return (
                            <TouchableOpacity
                                key={m.user_id}
                                onPress={() => toggleMember(m.user_id)}
                                style={[styles.memberRow, {
                                    backgroundColor: selected ? `${colors.accent}12` : colors.surface,
                                    borderColor: selected ? colors.accent : colors.border,
                                }]}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.avatar, { backgroundColor: m.avatar_color || colors.border }]}>
                                    <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                                <View style={[styles.checkbox, {
                                    backgroundColor: selected ? colors.accent : 'transparent',
                                    borderColor: selected ? colors.accent : colors.border,
                                }]}>
                                    {selected && <Check color="#064E3B" size={14} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20,
        paddingVertical: 14, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    saveBtnText: { color: '#064E3B', fontWeight: '800', fontSize: 14 },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
    label: {
        fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
        letterSpacing: 0.5, marginBottom: 8, marginTop: 20,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 16, borderWidth: 1,
    },
    input: { flex: 1, fontSize: 16 },
    splitPreview: {
        padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12, alignItems: 'center',
    },
    splitPreviewText: { fontSize: 14 },
    chipScroll: { marginBottom: 4 },
    chip: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontSize: 14, fontWeight: '600' },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8,
    },
    avatar: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: 'white', fontWeight: '700', fontSize: 14 },
    memberName: { flex: 1, fontSize: 15, fontWeight: '600' },
    checkbox: {
        width: 24, height: 24, borderRadius: 8, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
});
