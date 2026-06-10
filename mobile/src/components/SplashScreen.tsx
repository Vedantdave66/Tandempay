import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
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

    // Glow layers — 4 concentric rings fading from inner to outer
    const glowLayers = useRef([0.22, 0.13, 0.08, 0.04].map(
        () => new Animated.Value(0)
    )).current;

    // Heartbeat
    const heartbeatScale = useRef(new Animated.Value(1)).current;

    // Whole-splash fade-out
    const splashOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Divider spring at t=50ms
        const dividerAnim = Animated.spring(dividerScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
        });

        // 2. "Pay" slide+fade at t=560ms
        const payAnim = Animated.parallel([
            Animated.timing(payTranslate, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(payOpacity, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]);

        // 3. "Tandem" stagger at t=1050ms, 90ms between letters
        const letterAnimations = TANDEM_LETTERS.map((_, i) =>
            Animated.parallel([
                Animated.timing(letterAnims[i].translateY, {
                    toValue: 0,
                    duration: 240,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(letterAnims[i].opacity, {
                    toValue: 1,
                    duration: 240,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ])
        );
        const tandemAnim = Animated.stagger(90, letterAnimations);

        // 4. Glow fade-in at t=1800ms — 4 concentric layers
        const glowAnim = Animated.parallel(
            glowLayers.map((anim, i) =>
                Animated.timing(anim, {
                    toValue: [0.22, 0.13, 0.08, 0.04][i],
                    duration: 600,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                })
            )
        );

        // 5. Heartbeat at t=2350ms
        const heartbeatAnim = Animated.sequence([
            Animated.spring(heartbeatScale, {
                toValue: 1.08,
                useNativeDriver: true,
                damping: 10,
                stiffness: 240,
            }),
            Animated.spring(heartbeatScale, {
                toValue: 1,
                useNativeDriver: true,
                damping: 10,
                stiffness: 240,
            }),
        ]);

        // 6. Fade out at t=2900ms over 400ms then call onComplete
        const fadeOut = Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });

        Animated.sequence([
            Animated.delay(50),
            dividerAnim,
            Animated.delay(560 - 50 - 350),
            payAnim,
            Animated.delay(1050 - 560 - 300),
            tandemAnim,
            Animated.delay(1800 - 1050 - (90 * 5 + 240)),
            glowAnim,
            Animated.delay(50),
            heartbeatAnim,
            Animated.delay(2900 - 2350 - 200),
            fadeOut,
        ]).start(() => {
            onComplete();
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: splashOpacity }]}>
            {/* Radial glow — 4 concentric layers from inner to outer */}
            {[140, 260, 380, 500].map((size, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: LOGO_GREEN,
                        opacity: glowLayers[i],
                    }}
                />
            ))}

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
