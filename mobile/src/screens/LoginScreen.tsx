import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../services/api';
import { Wallet, ArrowLeft } from 'lucide-react-native';

export default function LoginScreen({ navigation }: any) {
    const { login } = useAuth();
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await authApi.login(email.trim(), password);
            await login(res.access_token);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <ArrowLeft size={20} color={colors.secondaryText} />
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Wallet size={32} color={colors.accent} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Tandem</Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Welcome back</Text>
                    </View>

                    {error ? (
                        <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.05)', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)' }]}>
                            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.secondaryText}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.secondaryText}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={styles.forgotRow}
                        >
                            <Text style={[styles.forgotText, { color: colors.accent }]}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#1A1A1A" />
                            ) : (
                                <Text style={[styles.buttonText, { color: '#1A1A1A' }]}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.secondaryText }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={[styles.footerLink, { color: colors.accent }]}>Create one</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        zIndex: 10,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(24),
    },
    header: {
        alignItems: 'center',
        marginBottom: vs(40),
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: ms(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(20),
        borderWidth: 1,
    },
    title: {
        fontSize: ms(32),
        fontWeight: '900',
        marginBottom: vs(8),
    },
    subtitle: {
        fontSize: ms(16),
    },
    form: {
        padding: scale(24),
        borderRadius: ms(24),
        borderWidth: 1,
    },
    label: {
        fontSize: ms(14),
        fontWeight: '600',
        marginBottom: vs(8),
    },
    input: {
        borderWidth: 1,
        borderRadius: ms(12),
        paddingHorizontal: scale(16),
        paddingVertical: vs(14),
        fontSize: ms(16),
        marginBottom: vs(20),
    },
    button: {
        borderRadius: ms(28),
        paddingVertical: vs(16),
        alignItems: 'center',
        marginTop: vs(8),
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
        fontSize: ms(16),
        fontWeight: '700',
    },
    forgotRow: {
        alignItems: 'flex-end',
        marginTop: -12,
        marginBottom: vs(16),
    },
    forgotText: {
        fontSize: ms(13),
        fontWeight: '600',
    },
    errorBox: {
        borderWidth: 1,
        borderRadius: ms(12),
        padding: scale(16),
        marginBottom: vs(20),
    },
    errorText: {
        fontSize: ms(14),
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: vs(32),
    },
    footerText: {
        fontSize: ms(14),
    },
    footerLink: {
        fontSize: ms(14),
        fontWeight: 'bold',
    },
});
