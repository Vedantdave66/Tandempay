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
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_PRESETS } from '../constants/Colors';
import Logo from '../components/Logo';
import CharacterShape from '../components/CharacterShape';

interface OnboardingCharacter {
    character_shape: string;
    character_color: string;
}

// Background texture, not content: five characters at whisper opacity,
// barely breathing. Colors come from the accent presets so they always
// belong to the brand palette in both modes.
const FLOATERS = [
    { key: 'forest', shape: 'round', size: 1.25, duration: 1800, pos: { top: '14%', left: '8%' } },
    { key: 'ocean',  shape: 'rect',  size: 1.0,  duration: 2400, pos: { top: '17%', right: '10%' } },
    { key: 'sunset', shape: 'semi',  size: 1.0,  duration: 2000, pos: { top: '46%', left: '6%' } },
    { key: 'candy',  shape: 'tall',  size: 1.0,  duration: 2200, pos: { top: '44%', right: '9%' } },
    { key: 'grape',  shape: 'round', size: 1.25, duration: 1900, pos: { bottom: '26%', alignSelf: 'center' } },
] as const;

function FloatingCharacter({ shape, color, size, duration, opacity, pos }: {
    shape: string; color: string; size: number; duration: number; opacity: number; pos: object;
}) {
    const breath = useRef(new Animated.Value(1)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(breath, { toValue: 1.03, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(breath, { toValue: 1.0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', opacity: Animated.multiply(fade, opacity), transform: [{ scale: breath }] }, pos]}
        >
            <View style={{ transform: [{ scale: size }] }}>
                <CharacterShape variant="card" shape={shape} color={color} eyeStyle="ball" />
            </View>
        </Animated.View>
    );
}

export default function LandingScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [onboardingChar, setOnboardingChar] = useState<OnboardingCharacter | null>(null);

    // One spring per element, staggered 80ms apart: logo, hero, sub, CTAs
    const logoAnim = useRef(new Animated.Value(0)).current;
    const heroAnim = useRef(new Animated.Value(0)).current;
    const subAnim  = useRef(new Animated.Value(0)).current;
    const ctaAnim  = useRef(new Animated.Value(0)).current;

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
        const spring = (v: Animated.Value) =>
            Animated.spring(v, { toValue: 1, damping: 26, stiffness: 200, useNativeDriver: true });
        Animated.parallel([
            spring(logoAnim),
            Animated.sequence([Animated.delay(80), spring(heroAnim)]),
            Animated.sequence([Animated.delay(160), spring(subAnim)]),
            Animated.sequence([Animated.delay(240), spring(ctaAnim)]),
        ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const rise = (v: Animated.Value) => ({
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    });

    const handleGetStarted = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Register', onboardingChar ?? {});
    };

    const handleLogin = () => {
        Haptics.selectionAsync();
        navigation.navigate('Login');
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {FLOATERS.map(f => (
                <FloatingCharacter
                    key={f.key}
                    shape={f.shape}
                    color={ACCENT_PRESETS[f.key][isDark ? 'dark' : 'light']}
                    size={f.size}
                    duration={f.duration}
                    opacity={isDark ? 0.18 : 0.12}
                    pos={f.pos}
                />
            ))}

            <View style={styles.content}>
                <Animated.View style={[{ marginTop: insets.top + vs(24), alignItems: 'center' }, { opacity: logoAnim }]}>
                    <Logo size={ms(24)} />
                </Animated.View>

                <View style={styles.heroBlock}>
                    <Animated.Text style={[styles.hero, T.extrabold, { color: colors.text }, rise(heroAnim)]}>
                        Split bills.{'\n'}Settle free.
                    </Animated.Text>
                    <Animated.Text style={[styles.subtext, T.regular, { color: colors.faintText }, rise(subAnim)]}>
                        Free Interac settlement for Canadian roommates.
                    </Animated.Text>
                </View>

                <Animated.View
                    style={[styles.ctaBlock, { marginBottom: insets.bottom + vs(32) }, rise(ctaAnim)]}
                >
                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: colors.accent }]}
                        onPress={handleGetStarted}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaText, T.semibold]}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
                        <Text style={[styles.loginLink, T.semibold, { color: colors.accent }]}>
                            I already have an account
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: scale(28),
    },
    heroBlock: {
        alignItems: 'center',
    },
    hero: {
        fontSize: ms(44),
        letterSpacing: -2.0,
        lineHeight: ms(50),
        textAlign: 'center',
        marginHorizontal: scale(32),
        marginBottom: vs(12),
    },
    subtext: {
        fontSize: ms(16),
        letterSpacing: -0.3,
        lineHeight: ms(16) * 1.5,
        textAlign: 'center',
        marginHorizontal: scale(40),
    },
    ctaBlock: {
        width: '100%',
        alignItems: 'center',
        gap: vs(12),
    },
    ctaBtn: {
        width: '100%',
        height: scale(56),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: ms(17),
    },
    loginLink: {
        fontSize: ms(16),
        paddingVertical: vs(8),
    },
});
