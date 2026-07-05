import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { expensesApi, Expense } from '../services/api';
import { T } from '../utils/typography';
import { scale, vs, ms } from '../utils/responsive';
import PressableScale from './PressableScale';

interface EditExpenseSheetProps {
    /** The expense being edited; null hides the sheet. */
    expense: Expense | null;
    onClose: () => void;
    /** Called with the server's updated expense after a successful save. */
    onSaved: (updated: Expense) => void;
}

/**
 * Bottom-sheet editor for an expense's title and amount. Shared between
 * GroupDetailScreen (swipe-to-edit) and ExpenseDetailScreen (pencil icon).
 */
export default function EditExpenseSheet({ expense, onClose, onSaved }: EditExpenseSheetProps) {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (expense) {
            setTitle(expense.title);
            setAmount(String(expense.amount));
        }
    }, [expense]);

    const handleSave = async () => {
        if (!expense) return;
        const trimTitle = title.trim();
        const parsedAmount = parseFloat(amount);
        if (!trimTitle) return void Alert.alert('Title required', 'Enter a title.');
        if (isNaN(parsedAmount) || parsedAmount <= 0) return void Alert.alert('Invalid amount', 'Enter a value greater than 0.');
        setSaving(true);
        Keyboard.dismiss();
        try {
            const updated = await expensesApi.patch(expense.id, { title: trimTitle, amount: parsedAmount });
            onSaved(updated);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update expense.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={expense !== null}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Tapping anywhere on the sheet outside an input dismisses the
                    keyboard without closing the sheet or discarding edits.
                    Nested touchables (inputs, Save, Cancel) claim their own
                    taps first, so this only catches dead space. */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.sheetTitle, { color: colors.text }, T.bold]}>Edit expense</Text>
                    <Text style={[styles.label, { color: colors.secondaryText }, T.semibold]}>Title</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, T.regular]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Expense title"
                        placeholderTextColor={colors.faintText}
                        autoCapitalize="sentences"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    <Text style={[styles.label, { color: colors.secondaryText }, T.semibold]}>Amount</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, T.regular]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        placeholderTextColor={colors.faintText}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    <PressableScale
                        scaleTo={0.97}
                        haptic="medium"
                        onPress={handleSave}
                        disabled={saving}
                        style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={[styles.saveBtnText, T.bold]}>Save changes</Text>
                        }
                    </PressableScale>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.cancelLink}>
                        <Text style={[styles.cancelText, { color: colors.secondaryText }, T.regular]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: ms(28),
        borderTopRightRadius: ms(28),
        padding: scale(20),
        paddingBottom: vs(36),
        gap: vs(10),
    },
    handle: {
        width: scale(36),
        height: vs(4),
        borderRadius: ms(2),
        alignSelf: 'center',
        marginBottom: vs(6),
    },
    sheetTitle: {
        fontSize: ms(20),
        marginBottom: vs(4),
    },
    label: {
        fontSize: ms(12),
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    input: {
        borderWidth: 1,
        borderRadius: ms(14),
        paddingHorizontal: scale(14),
        paddingVertical: vs(12),
        fontSize: ms(15),
    },
    saveBtn: {
        borderRadius: ms(16),
        paddingVertical: vs(15),
        alignItems: 'center',
        marginTop: vs(6),
    },
    saveBtnText: {
        color: '#fff',
        fontSize: ms(15),
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: vs(8),
    },
    cancelText: {
        fontSize: ms(14),
    },
});
