import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';
import CanvasModeView from '../components/CanvasModeView';
import CharacterShape from '../components/CharacterShape';

interface OnboardingCharacter {
    character_shape: string;
    character_color: string;
}

export default function LandingScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [onboardingChar, setOnboardingChar] = useState<OnboardingCharacter | null>(null);

    // Sequential entry: logo → hero → sub → CTAs
    const logoAnim = useRef(new Animated.Value(0)).current;
    const heroAnim = useRef(new Animated.Value(0)).current;
    const subAnim  = useRef(new Animated.Value(0)).current;
    const ctaAnim  = useRef(new Animated.Value(0)).current;

    // The picked character breathes while it waits for you
    const breathAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        AsyncStorage.getItem('@onboarding_character')
            .then(raw => {
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed?.character_shape && parsed?.character_color) {
                    setOnboardingChar(parsed);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.sequence([
                Animated.delay(400),
                Animated.timing(heroAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.delay(740),
                Animated.timing(subAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.delay(1020),
                Animated.timing(ctaAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
        ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!onboardingChar) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(breathAnim, { toValue: 1.04, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(breathAnim, { toValue: 1.0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onboardingChar]);

    const handleGetStarted = () => {
        navigation.navigate('Register', onboardingChar ?? {});
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Live canvas — the app's heartbeat, running before you even sign up */}
            <CanvasModeView demo colors={colors} isDark={isDark} style={StyleSheet.absoluteFillObject as any} />

            {/* Legibility overlay */}
            <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]}
            />

            <View style={[styles.content, { paddingTop: insets.top + vs(72), paddingBottom: insets.bottom + vs(36) }]}>
                {/* Logo wordmark */}
                <Animated.View
                    style={{
                        opacity: logoAnim,
                        transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                    }}
                >
                    <Logo size={26} />
                </Animated.View>

                <View style={styles.heroBlock}>
                    {/* Your character, waiting for you */}
                    {onboardingChar && (
                        <Animated.View
                            style={{
                                opacity: heroAnim,
                                transform: [{ scale: breathAnim }],
                                marginBottom: vs(20),
                                alignItems: 'center',
                            }}
                        >
                            <CharacterShape
                                variant="card"
                                shape={onboardingChar.character_shape}
                                color={onboardingChar.character_color}
                                eyeStyle="ball"
                            />
                        </Animated.View>
                    )}

                    <Animated.Text
                        style={[styles.hero, T.extrabold, {
                            opacity: heroAnim,
                            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                        }]}
                    >
                        Split bills.{'\n'}Settle free.
                    </Animated.Text>

                    <Animated.Text style={[styles.subtext, T.regular, { opacity: subAnim }]}>
                        Free Interac settlement for{'\n'}Canadian roommates 🇨🇦
                    </Animated.Text>
                </View>

                <Animated.View
                    style={{
                        width: '100%',
                        alignItems: 'center',
                        gap: vs(18),
                        opacity: ctaAnim,
                        transform: [{ translateY: ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                    }}
                >
                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                        onPress={handleGetStarted}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaText, T.semibold]}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                        <Text style={[styles.loginLink, T.semibold]}>Log In</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(28),
    },
    heroBlock: {
        alignItems: 'center',
    },
    hero: {
        fontSize: ms(40),
        letterSpacing: -1.6,
        lineHeight: ms(46),
        textAlign: 'center',
        color: '#FFFFFF',
        marginBottom: vs(14),
    },
    subtext: {
        fontSize: ms(15),
        lineHeight: ms(22),
        textAlign: 'center',
        color: 'rgba(255,255,255,0.75)',
    },
    ctaBtn: {
        width: '100%',
        borderRadius: 99,
        paddingVertical: vs(16),
        alignItems: 'center',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: ms(16),
    },
    loginLink: {
        fontSize: ms(15),
        color: 'rgba(255,255,255,0.65)',
    },
});
