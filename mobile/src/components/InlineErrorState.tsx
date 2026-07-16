import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { T } from '../utils/typography';
import { scale, vs, ms } from '../utils/responsive';
import PressableScale from './PressableScale';

/**
 * Shared "the fetch actually failed" state — distinct from a genuine empty
 * state so a failed load never masquerades as "you have zero of these."
 * Used wherever a screen's primary data load can fail (Dashboard, Payments,
 * GroupDetail) rather than each screen inventing its own error+retry layout.
 */
export default function InlineErrorState({
    message = "Something went wrong, try again",
    onRetry,
}: {
    message?: string;
    onRetry: () => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <AlertCircle size={40} color={colors.secondaryText} />
            <Text style={[styles.message, { color: colors.secondaryText }, T.regular]}>
                {message}
            </Text>
            <PressableScale onPress={onRetry} haptic="light" style={[styles.retryButton, { backgroundColor: colors.accent }]}>
                <Text style={[styles.retryText, T.semibold]}>Retry</Text>
            </PressableScale>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: vs(64),
        paddingHorizontal: scale(40),
    },
    message: {
        fontSize: ms(14),
        lineHeight: 20,
        textAlign: 'center',
        marginTop: vs(14),
        marginBottom: vs(20),
    },
    retryButton: {
        paddingHorizontal: scale(28),
        paddingVertical: vs(12),
        borderRadius: ms(16),
    },
    retryText: {
        fontSize: ms(15),
        color: '#FFFFFF',
    },
});
