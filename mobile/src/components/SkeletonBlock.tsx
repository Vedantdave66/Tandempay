import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ms } from '../utils/responsive';

/**
 * A single breathing silhouette. Loading screens are built from these —
 * no spinners, no "Loading…" text, just the shape of what's coming,
 * pulsing softly. Stagger `delay` per row for a wave effect.
 */
export default function SkeletonBlock({
    width,
    height,
    radius = ms(12),
    delay = 0,
    style,
}: {
    width: DimensionValue;
    height: number;
    radius?: number;
    delay?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const { isDark } = useTheme();
    const lo = isDark ? 0.08 : 0.06;
    const hi = isDark ? 0.18 : 0.14;
    const opacity = useRef(new Animated.Value(lo)).current;

    useEffect(() => {
        const anim = Animated.sequence([
            Animated.delay(delay),
            Animated.loop(Animated.sequence([
                Animated.timing(opacity, { toValue: hi, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: lo, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])),
        ]);
        anim.start();
        return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    opacity,
                },
                style,
            ]}
        />
    );
}
