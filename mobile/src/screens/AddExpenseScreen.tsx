import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
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
                        <View style={{ flex: 1, marginLeft: scale(12) }}>
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
                            <Text style={[styles.label, { color: colors.faintText, marginTop: vs(22) }]}>How much?</Text>
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
                            <Text style={[styles.label, { color: colors.faintText, marginTop: vs(22) }]}>Who paid?</Text>
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
    content: { paddingHorizontal: scale(20), paddingTop: vs(12), paddingBottom: vs(40) },
    handle: {
        width: scale(40), height: vs(4), borderRadius: ms(2),
        alignSelf: 'center', marginBottom: vs(16),
    },
    header: {
        flexDirection: 'row', alignItems: 'center', marginBottom: vs(18),
    },
    headerTitle: { fontSize: ms(17), fontWeight: '700', letterSpacing: -0.2 },
    headerSubtitle: { fontSize: ms(13), marginTop: vs(2) },
    closeBtn: {
        width: scale(44), height: scale(44), borderRadius: ms(14),
        alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
    },
    label: { fontSize: ms(13), fontWeight: '700', marginBottom: vs(7) },
    textInput: {
        fontSize: ms(15), borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: vs(10),
    },
    amountRow: {
        flexDirection: 'row', alignItems: 'center', gap: scale(6),
    },
    amountSign: { fontSize: ms(28), fontWeight: '800' },
    amountInput: { flex: 1, fontSize: ms(28), fontWeight: '800', letterSpacing: -1.0, paddingVertical: vs(10) },
    chipRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: vs(18),
    },
    payerChip: {
        flexDirection: 'row', alignItems: 'center', gap: scale(9),
        borderRadius: ms(12), paddingHorizontal: scale(14), paddingVertical: vs(9),
    },
    payerChipText: { fontSize: ms(13), fontWeight: '600' },
    cta: {
        paddingVertical: vs(17), borderRadius: ms(16), alignItems: 'center', justifyContent: 'center', marginTop: vs(8),
    },
    ctaText: { color: '#0A5F30', fontWeight: '700', fontSize: ms(15) },

    backRow: {
        flexDirection: 'row', alignItems: 'center', gap: scale(5), marginBottom: vs(12),
    },
    backText: { fontSize: ms(14), fontWeight: '600' },
    splittingText: { fontSize: ms(15), fontWeight: '600', marginBottom: vs(16) },
    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: scale(12),
        padding: scale(14), borderRadius: ms(16), borderWidth: StyleSheet.hairlineWidth, marginBottom: vs(8),
    },
    memberName: { flex: 1, fontSize: ms(15), fontWeight: '500' },
    memberAmount: { fontSize: ms(15), fontWeight: '700', marginRight: scale(8) },
    checkbox: {
        width: scale(24), height: scale(24), borderRadius: scale(12), borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    summaryBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: ms(13), paddingHorizontal: scale(15), paddingVertical: vs(11), marginTop: vs(4), marginBottom: vs(12),
    },
    summaryText: { fontSize: ms(14) },
    summaryEach: { fontSize: ms(14), fontWeight: '700' },
});
