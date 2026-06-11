import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';

const LOGO_GREEN = '#22C55E';
const BG = '#060A07';
const LINE_W = scale(120);

interface Props {
    onComplete: () => void;
}

/**
 * The tandem line.
 *
 * A single green point blooms in the dark, stretches into a line —
 * two ends, one line, the whole product in one gesture — then hands
 * off to the wordmark: "Tandem" and "Pay" converge from either side
 * and meet where the line was. One ripple (a payment, sent), one
 * heartbeat, and the app is already there underneath.
 */
export default function SplashScreen({ onComplete }: Props) {
    // Atmosphere — two vast, faint green discs giving the dark depth
    const atmosphere = useRef(new Animated.Value(0)).current;

    // The point → the line
    const dotScale  = useRef(new Animated.Value(0)).current;
    const lineScaleX = useRef(new Animated.Value(0)).current;
    const lineOpacity = useRef(new Animated.Value(1)).current;

    // Wordmark halves converging
    const tandemX = useRef(new Animated.Value(-scale(28))).current;
    const tandemOpacity = useRef(new Animated.Value(0)).current;
    const payX = useRef(new Animated.Value(scale(28))).current;
    const payOpacity = useRef(new Animated.Value(0)).current;

    // The ripple — a payment, sent
    const rippleScale = useRef(new Animated.Value(0.5)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    // Tagline
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const taglineY = useRef(new Animated.Value(vs(8))).current;

    // Heartbeat + exit
    const heartbeat = useRef(new Animated.Value(1)).current;
    const exitScale = useRef(new Animated.Value(1)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Atmosphere breathes in on its own clock — it never gates the sequence
        Animated.timing(atmosphere, {
            toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start();

        Animated.sequence([
            // 1 — a point of light arrives
            Animated.spring(dotScale, { toValue: 1, damping: 18, stiffness: 280, useNativeDriver: true }),

            // 2 — the point stretches into the tandem line
            Animated.spring(lineScaleX, { toValue: 1, damping: 22, stiffness: 200, useNativeDriver: true }),
            Animated.delay(140),

            // 3 — the line yields to the name: two halves converge and meet
            Animated.parallel([
                Animated.timing(lineOpacity, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.spring(tandemX, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
                Animated.timing(tandemOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.spring(payX, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
                Animated.timing(payOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.delay(120),

            // 4 — one ripple outward (a payment, sent), tagline settles beneath
            Animated.parallel([
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(rippleOpacity, { toValue: 0.4, duration: 80, useNativeDriver: true }),
                        Animated.timing(rippleScale, { toValue: 2.4, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                    ]),
                ]),
                Animated.timing(rippleOpacity, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(taglineOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(taglineY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.delay(180),

            // 5 — heartbeat
            Animated.spring(heartbeat, { toValue: 1.06, damping: 10, stiffness: 240, useNativeDriver: true }),
            Animated.spring(heartbeat, { toValue: 1, damping: 10, stiffness: 240, useNativeDriver: true }),
            Animated.delay(160),

            // 6 — exit: a quiet zoom-dissolve into the app
            Animated.parallel([
                Animated.timing(exitScale, { toValue: 1.045, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(exitOpacity, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
        ]).start(() => {
            onComplete();
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}>
            {/* Atmosphere — depth, not decoration */}
            <Animated.View pointerEvents="none" style={[styles.atmosphereDisc, {
                width: scale(480), height: scale(480), borderRadius: scale(240),
                opacity: atmosphere.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
            }]} />
            <Animated.View pointerEvents="none" style={[styles.atmosphereDisc, {
                width: scale(760), height: scale(760), borderRadius: scale(380),
                opacity: atmosphere.interpolate({ inputRange: [0, 1], outputRange: [0, 0.035] }),
            }]} />

            {/* The ripple */}
            <Animated.View pointerEvents="none" style={[styles.ripple, {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
            }]} />

            <Animated.View style={[styles.lockup, { transform: [{ scale: heartbeat }] }]}>
                <View style={styles.wordStage}>
                    {/* The point → the line, centered exactly where the name will land */}
                    <Animated.View pointerEvents="none" style={[styles.line, {
                        opacity: lineOpacity,
                        transform: [{ scaleX: lineScaleX }],
                    }]} />
                    <Animated.View pointerEvents="none" style={[styles.dot, {
                        opacity: lineOpacity,
                        transform: [{ scale: dotScale }],
                    }]} />

                    {/* Wordmark — two halves meeting at the slash */}
                    <View style={styles.wordRow}>
                        <Animated.Text style={[styles.word, {
                            color: '#FFFFFF',
                            opacity: tandemOpacity,
                            transform: [{ translateX: tandemX }],
                        }]}>
                            Tandem
                        </Animated.Text>
                        <Animated.View style={[styles.slash, { opacity: tandemOpacity }]} />
                        <Animated.Text style={[styles.word, {
                            color: LOGO_GREEN,
                            opacity: payOpacity,
                            transform: [{ translateX: payX }],
                        }]}>
                            Pay
                        </Animated.Text>
                    </View>
                </View>

                {/* Tagline */}
                <Animated.Text style={[styles.tagline, {
                    opacity: taglineOpacity,
                    transform: [{ translateY: taglineY }],
                }]}>
                    Split together.
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
    atmosphereDisc: {
        position: 'absolute',
        backgroundColor: LOGO_GREEN,
    },
    ripple: {
        position: 'absolute',
        width: scale(180),
        height: scale(180),
        borderRadius: scale(90),
        borderWidth: 1.5,
        borderColor: LOGO_GREEN,
    },
    lockup: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    wordStage: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        position: 'absolute',
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: LOGO_GREEN,
    },
    line: {
        position: 'absolute',
        width: LINE_W,
        height: 3,
        borderRadius: 2,
        backgroundColor: LOGO_GREEN,
    },
    wordRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    word: {
        ...T.extrabold,
        fontSize: ms(46),
        letterSpacing: -1.4,
    },
    // The brand slash — same construction as Logo.tsx, scaled to the splash
    slash: {
        width: 3,
        height: ms(46) * 1.15,
        backgroundColor: LOGO_GREEN,
        borderRadius: 2,
        transform: [{ rotate: '18deg' }],
        marginHorizontal: ms(8),
    },
    tagline: {
        ...T.regular,
        fontSize: ms(14),
        letterSpacing: 0.3,
        color: 'rgba(255,255,255,0.42)',
        marginTop: vs(14),
    },
});
