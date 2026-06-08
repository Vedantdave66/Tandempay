import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { T } from '../utils/typography';

const LOGO_GREEN = '#22C55E';
const BG = '#080C09';

const TANDEM_LETTERS = ['T', 'a', 'n', 'd', 'e', 'm'];

interface Props {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: Props) {
    // Divider
    const dividerScale = useRef(new Animated.Value(0)).current;

    // "Pay"
    const payTranslate = useRef(new Animated.Value(40)).current;
    const payOpacity = useRef(new Animated.Value(0)).current;

    // "Tandem" letters — each has translateY + opacity
    const letterAnims = useRef(
        TANDEM_LETTERS.map(() => ({
            translateY: new Animated.Value(12),
            opacity: new Animated.Value(0),
        }))
    ).current;

    // Glow
    const glowOpacity = useRef(new Animated.Value(0)).current;

    // Heartbeat
    const heartbeatScale = useRef(new Animated.Value(1)).current;

    // Whole-splash fade-out
    const splashOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Divider spring at t=50ms
        const dividerAnim = Animated.spring(dividerScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 14,
            stiffness: 180,
        });

        // 2. "Pay" slide+fade at t=560ms
        const payAnim = Animated.parallel([
            Animated.timing(payTranslate, {
                toValue: 0,
                duration: 380,
                useNativeDriver: true,
            }),
            Animated.timing(payOpacity, {
                toValue: 1,
                duration: 380,
                useNativeDriver: true,
            }),
        ]);

        // 3. "Tandem" stagger at t=1050ms, 90ms between letters
        const letterAnimations = TANDEM_LETTERS.map((_, i) =>
            Animated.parallel([
                Animated.timing(letterAnims[i].translateY, {
                    toValue: 0,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.timing(letterAnims[i].opacity, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ])
        );
        const tandemAnim = Animated.stagger(90, letterAnimations);

        // 4. Glow fade-in at t=1800ms
        const glowAnim = Animated.timing(glowOpacity, {
            toValue: 0.12,
            duration: 500,
            useNativeDriver: true,
        });

        // 5. Heartbeat at t=2350ms
        const heartbeatAnim = Animated.sequence([
            Animated.spring(heartbeatScale, {
                toValue: 1.08,
                useNativeDriver: true,
                damping: 8,
                stiffness: 220,
            }),
            Animated.spring(heartbeatScale, {
                toValue: 1,
                useNativeDriver: true,
                damping: 8,
                stiffness: 220,
            }),
        ]);

        // 6. Fade out at t=2900ms over 400ms then call onComplete
        const fadeOut = Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        });

        // Compose the full sequence with delays
        Animated.sequence([
            Animated.delay(50),
            dividerAnim,
            Animated.delay(560 - 50 - 350), // ~160ms gap after divider spring settles
            payAnim,
            Animated.delay(1050 - 560 - 380), // ~110ms gap
            tandemAnim,
            Animated.delay(1800 - 1050 - (90 * 5 + 280)), // gap before glow
            glowAnim,
            Animated.delay(2350 - 1800 - 500), // gap before heartbeat
            heartbeatAnim,
            Animated.delay(2900 - 2350 - 200), // gap before fade
            fadeOut,
        ]).start(() => {
            onComplete();
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: splashOpacity }]}>
            {/* Green radial glow */}
            <Animated.View
                style={[
                    styles.glow,
                    {
                        opacity: glowOpacity,
                        shadowColor: LOGO_GREEN,
                        shadowRadius: 120,
                        shadowOpacity: 1,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ]}
            />

            <Animated.View style={[styles.logoRow, { transform: [{ scale: heartbeatScale }] }]}>
                {/* Tandem letters */}
                <View style={styles.tandemRow}>
                    {TANDEM_LETTERS.map((letter, i) => (
                        <Animated.Text
                            key={i}
                            style={[
                                styles.logoText,
                                {
                                    color: '#FFFFFF',
                                    opacity: letterAnims[i].opacity,
                                    transform: [{ translateY: letterAnims[i].translateY }],
                                },
                            ]}
                        >
                            {letter}
                        </Animated.Text>
                    ))}
                </View>

                {/* Divider */}
                <Animated.View
                    style={[
                        styles.divider,
                        { transform: [{ scaleY: dividerScale }, { rotate: '18deg' }] },
                    ]}
                />

                {/* Pay */}
                <Animated.Text
                    style={[
                        styles.logoText,
                        {
                            color: LOGO_GREEN,
                            opacity: payOpacity,
                            transform: [{ translateX: payTranslate }],
                        },
                    ]}
                >
                    Pay
                </Animated.Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: LOGO_GREEN,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tandemRow: {
        flexDirection: 'row',
    },
    logoText: {
        ...T.extrabold,
        fontSize: 52,
        letterSpacing: -1.5,
    },
    divider: {
        width: 2,
        height: 48,
        backgroundColor: LOGO_GREEN,
        borderRadius: 1,
        marginHorizontal: 4,
    },
});
