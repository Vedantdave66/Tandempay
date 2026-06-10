import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../services/api';
import { Wallet, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import Logo from '../components/Logo';

export default function RegisterScreen({ navigation }: any) {
    const { login } = useAuth();
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Password strength
    const getStrength = (pw: string): { label: string; color: string; score: number } => {
        if (!pw) return { label: '', color: 'transparent', score: 0 };
        let score = 0;
        if (pw.length >= 8)              score++;
        if (/[A-Z]/.test(pw))           score++;
        if (/[0-9]/.test(pw))           score++;
        if (/[^A-Za-z0-9]/.test(pw))   score++;
        if (score <= 1) return { label: 'Weak',   color: '#E05252', score: 1 };
        if (score === 2) return { label: 'Fair',  color: '#F59E0B', score: 2 };
        return { label: 'Strong', color: '#A8D5A2', score: 3 };
    };
    const strength = getStrength(password);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await authApi.register(name.trim(), email.trim(), password);
            await login(res.access_token);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
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
                        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                        <Logo size={20} />
                    </View>

                    {error ? (
                        <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.05)', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)' }]}>
                            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="John Doe"
                            placeholderTextColor={colors.secondaryText}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />

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
                        <View style={[styles.passwordRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.secondaryText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(p => !p)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.eyeBtn}
                            >
                                {showPassword
                                    ? <Eye size={18} color={colors.secondaryText} />
                                    : <EyeOff size={18} color={colors.secondaryText} />
                                }
                            </TouchableOpacity>
                        </View>

                        {/* Password strength indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBars}>
                                    {[1, 2, 3].map(i => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthBar,
                                                { backgroundColor: i <= strength.score ? strength.color : colors.border }
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.pwHint, { color: colors.secondaryText }]}>
                            Use 8+ characters with a mix of letters, numbers &amp; symbols
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? "#064E3B" : "white"} />
                            ) : (
                                <Text style={[styles.buttonText, { color: isDark ? "#064E3B" : "white" }]}>Sign Up</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.secondaryText }]}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[styles.footerLink, { color: colors.accent }]}>Sign in</Text>
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
        width: scale(44),
        height: scale(44),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
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
        borderWidth: StyleSheet.hairlineWidth,
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
        borderWidth: StyleSheet.hairlineWidth,
    },
    label: {
        fontSize: ms(14),
        fontWeight: '600',
        marginBottom: vs(8),
    },
    input: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: ms(14),
        paddingHorizontal: scale(16),
        height: vs(52),
        fontSize: ms(16),
        marginBottom: vs(20),
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: ms(14),
        paddingHorizontal: scale(16),
        height: vs(52),
        marginBottom: vs(20),
    },
    passwordInput: {
        flex: 1,
        height: vs(14) * 2 + ms(16) * 1.2,
        fontSize: ms(14),
    },
    eyeBtn: {
        paddingLeft: scale(8),
        paddingVertical: vs(4),
    },
    button: {
        borderRadius: ms(16),
        paddingVertical: vs(17),
        alignItems: 'center',
        marginTop: vs(8),
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { fontSize: ms(16), fontWeight: '700', letterSpacing: 0.2 },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: vs(8),
        marginTop: -14,
        marginBottom: vs(8),
    },
    strengthBars: {
        flexDirection: 'row',
        gap: vs(4),
        flex: 1,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: ms(8),
    },
    strengthLabel: {
        fontSize: ms(12),
        fontWeight: '700',
        width: 44,
        textAlign: 'right',
    },
    pwHint: {
        fontSize: ms(11),
        lineHeight: 16,
        marginBottom: vs(12),
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
