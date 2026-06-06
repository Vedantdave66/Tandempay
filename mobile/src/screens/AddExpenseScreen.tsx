import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, ScrollView
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { expensesApi, GroupMember } from '../services/api';
import { X, Check, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import CharacterShape from '../components/CharacterShape';

interface Props {
    navigation: any;
    // groupName isn't passed by any current navigate('AddExpense', ...) call —
    // TODO: thread it through from GroupDetailScreen once available.
    route: { params: { groupId: string; members: GroupMember[]; groupName?: string } };
}

export default function AddExpenseScreen({ navigation, route }: Props) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { groupId, members, groupName } = route.params;

    const [step, setStep] = useState<1 | 2>(1);
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

    const parsedAmount = parseFloat(amount);
    const each = selectedIds.length > 0 && parsedAmount > 0 ? parsedAmount / selectedIds.length : 0;
    const canAdvance = title.trim().length > 0 && parsedAmount > 0;
    const payer = members.find(m => m.user_id === paidBy);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        {payer && (
                            <CharacterShape shape="rect" color={payer.avatar_color} variant="mini" />
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>
                                {step === 1 ? 'New expense' : "Who's splitting?"}
                            </Text>
                            {groupName && (
                                <Text style={[styles.headerSubtitle, { color: colors.faintText }]}>
                                    in <Text style={{ color: colors.accentDark, fontWeight: '700' }}>{groupName}</Text>
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <X color={colors.secondaryText} size={16} />
                        </TouchableOpacity>
                    </View>

                    {step === 1 ? (
                        <>
                            {/* What was it for */}
                            <Text style={[styles.label, { color: colors.faintText }]}>What was it for?</Text>
                            <TextInput
                                style={[styles.textInput, { color: colors.text, borderBottomColor: colors.border }]}
                                placeholder="e.g. Dinner, Uber, Groceries"
                                placeholderTextColor={colors.secondaryText}
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />

                            {/* How much */}
                            <Text style={[styles.label, { color: colors.faintText, marginTop: 22 }]}>How much?</Text>
                            <View style={styles.amountRow}>
                                <Text style={[styles.amountSign, { color: colors.accent }]}>$</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.secondaryText}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            {/* Who paid */}
                            <Text style={[styles.label, { color: colors.faintText, marginTop: 22 }]}>Who paid?</Text>
                            <View style={styles.chipRow}>
                                {members.map(m => {
                                    const selected = paidBy === m.user_id;
                                    return (
                                        <TouchableOpacity
                                            key={m.user_id}
                                            onPress={() => setPaidBy(m.user_id)}
                                            style={[styles.payerChip, {
                                                borderColor: selected ? colors.accent : colors.border,
                                                borderWidth: selected ? 2 : 1,
                                                backgroundColor: selected ? colors.accentBgFaint : 'transparent',
                                            }]}
                                            activeOpacity={0.8}
                                        >
                                            <CharacterShape shape="rect" color={m.avatar_color} variant="mini" />
                                            <Text style={[styles.payerChipText, { color: colors.text }]}>
                                                {m.user_id === user?.id ? 'You' : m.name.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                onPress={() => setStep(2)}
                                disabled={!canAdvance}
                                style={[styles.cta, { backgroundColor: colors.accent, opacity: canAdvance ? 1 : 0.4 }]}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.ctaText}>Next: who's splitting? →</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setStep(1)} style={styles.backRow} activeOpacity={0.7}>
                                <ArrowLeft size={16} color={colors.accentDark} />
                                <Text style={[styles.backText, { color: colors.accentDark }]}>Back</Text>
                            </TouchableOpacity>

                            <Text style={[styles.splittingText, { color: colors.secondaryText }]}>
                                Splitting <Text style={{ color: colors.text, fontWeight: '700' }}>{title}</Text>
                            </Text>

                            {members.map(m => {
                                const selected = selectedIds.includes(m.user_id);
                                return (
                                    <TouchableOpacity
                                        key={m.user_id}
                                        onPress={() => toggleMember(m.user_id)}
                                        style={[styles.memberRow, {
                                            backgroundColor: selected ? colors.accentBgFaint : colors.surface,
                                            borderColor: selected ? colors.accent : colors.border,
                                        }]}
                                        activeOpacity={0.7}
                                    >
                                        <CharacterShape shape="rect" color={m.avatar_color} variant="mini" />
                                        <Text style={[styles.memberName, { color: colors.text }]}>
                                            {m.user_id === user?.id ? 'You' : m.name}
                                        </Text>
                                        {selected && each > 0 && (
                                            <Text style={[styles.memberAmount, { color: colors.accent }]}>${each.toFixed(2)}</Text>
                                        )}
                                        <View style={[styles.checkbox, {
                                            backgroundColor: selected ? colors.accent : 'transparent',
                                            borderColor: selected ? colors.accent : colors.border,
                                        }]}>
                                            {selected && <Check color="#fff" size={14} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {parsedAmount > 0 && (
                                <View style={[styles.summaryBar, { backgroundColor: colors.accentBgFaint }]}>
                                    <Text style={[styles.summaryText, { color: colors.secondaryText }]}>Total: ${parsedAmount.toFixed(2)}</Text>
                                    {selectedIds.length > 0 && (
                                        <Text style={[styles.summaryEach, { color: colors.accent }]}>· ${each.toFixed(2)} each</Text>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={loading || selectedIds.length === 0}
                                style={[styles.cta, { backgroundColor: colors.accent, opacity: selectedIds.length === 0 ? 0.4 : 1 }]}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator color="#0A5F30" /> : <Text style={styles.ctaText}>Add expense ✓</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        alignSelf: 'center', marginBottom: 16,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 18,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    closeBtn: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
    textInput: {
        fontSize: 15, borderBottomWidth: 1, paddingVertical: 10,
    },
    amountRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    amountSign: { fontSize: 17, fontWeight: '700' },
    amountInput: { flex: 1, fontSize: 17, fontWeight: '700', paddingVertical: 10 },
    chipRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18,
    },
    payerChip: {
        flexDirection: 'row', alignItems: 'center', gap: 9,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
    },
    payerChipText: { fontSize: 13, fontWeight: '600' },
    cta: {
        height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8,
    },
    ctaText: { color: '#0A5F30', fontWeight: '700', fontSize: 15 },

    backRow: {
        flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12,
    },
    backText: { fontSize: 14, fontWeight: '600' },
    splittingText: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 13, borderWidth: 1.5, marginBottom: 8,
    },
    memberName: { flex: 1, fontSize: 15, fontWeight: '500' },
    memberAmount: { fontSize: 15, fontWeight: '700', marginRight: 8 },
    checkbox: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    summaryBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 13, paddingHorizontal: 15, paddingVertical: 11, marginTop: 4, marginBottom: 12,
    },
    summaryText: { fontSize: 14 },
    summaryEach: { fontSize: 14, fontWeight: '700' },
});
