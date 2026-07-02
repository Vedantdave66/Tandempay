import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Alert
} from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Mail } from 'lucide-react-native';
import Logo from '../components/Logo';
import { authApi } from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !trimmed.includes('@')) {
            Alert.alert('Invalid email', 'Enter a valid email address.');
            return;
        }
        setLoading(true);
        try {
            // Call the API — gracefully handles both success and non-2xx (email still "sent" for security)
            if (typeof (authApi as any).forgotPassword === 'function') {
                await (authApi as any).forgotPassword(trimmed);
            } else {
                // Fallback: hit the standard endpoint directly
                const { apiClient } = require('../services/api');
                await apiClient.post('/auth/forgot-password', { email: trimmed });
            }
        } catch (_) {
            // Always show success to prevent email enumeration
        } finally {
            setLoading(false);
            setSent(true);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <ArrowLeft size={20} color={colors.secondaryText} />
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={[styles.iconBox, { backgroundColor: `${colors.accent}20` }]}>
                        <Mail size={28} color={colors.accent} />
                    </View>
                    <View style={styles.logoWrap}>
                        <Logo size={20} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        Enter your email and we'll send you a reset link.
                    </Text>

                    {sent ? (
                        <View style={[styles.successBox, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}40` }]}>
                            <Text style={[styles.successText, { color: colors.accent }]}>
                                ✓ If that email exists, we sent a reset link. Check your inbox.
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="you@example.com"
                                placeholderTextColor={colors.secondaryText}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading
                                    ? <ActivityIndicator color="#1A1A1A" />
                                    : <Text style={styles.btnText}>Send reset link</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backToLogin}>
                        <Text style={[styles.backToLoginText, { color: colors.accent }]}>← Back to sign in</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:    { flex: 1 },
    kav:     { flex: 1 },
    back: {
        position: 'absolute', top: 20, left: 20,
        width: scale(44), height: scale(44), borderRadius: ms(14),
        alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, zIndex: 10,
    },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: scale(24) },
    iconBox: {
        width: 64, height: 64, borderRadius: ms(20),
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center', marginBottom: vs(20),
    },
    logoWrap: { alignItems: 'center', marginBottom: vs(8) },
    title:    { fontSize: ms(28), fontWeight: '700', textAlign: 'center', marginBottom: vs(10) },
    subtitle: { fontSize: ms(14), textAlign: 'center', lineHeight: 22, marginBottom: vs(32) },
    form:     { padding: scale(24), borderRadius: ms(20), borderWidth: StyleSheet.hairlineWidth, marginBottom: vs(20) },
    label:    { fontSize: ms(14), fontWeight: '600', marginBottom: vs(8) },
    input: {
        borderWidth: StyleSheet.hairlineWidth, borderRadius: ms(14),
        paddingHorizontal: scale(16), height: vs(52),
        fontSize: ms(16), marginBottom: vs(20),
    },
    btn: {
        paddingVertical: vs(17), borderRadius: ms(16),
        alignItems: 'center', justifyContent: 'center',
    },
    btnText:  { color: '#1A1A1A', fontSize: ms(16), fontWeight: '700' },
    successBox: {
        borderRadius: ms(16), borderWidth: 1, padding: scale(20), marginBottom: vs(20),
    },
    successText: { fontSize: ms(14), lineHeight: 22, textAlign: 'center', fontWeight: '500' },
    backToLogin: { alignItems: 'center', marginTop: vs(16) },
    backToLoginText: { fontSize: ms(14), fontWeight: '600' },
});
