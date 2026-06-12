import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The press feel of the whole app lives here: things you touch compress
 * like physical objects and spring back when released. One primitive,
 * used everywhere, so every surface answers your finger the same way.
 */
export default function PressableScale({
    children,
    onPress,
    onLongPress,
    disabled = false,
    scaleTo = 0.97,
    rotateTo,
    haptic = 'none',
    style,
}: {
    children: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
    scaleTo?: number;
    /** e.g. '-0.5deg' — a tiny tilt makes cards feel playful, not mechanical */
    rotateTo?: string;
    haptic?: 'light' | 'medium' | 'none';
    style?: StyleProp<ViewStyle>;
}) {
    const press = useRef(new Animated.Value(0)).current;

    const springTo = (toValue: number) =>
        Animated.spring(press, {
            toValue,
            damping: 20,
            stiffness: 320,
            useNativeDriver: true,
        }).start();

    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] });
    const transform: any[] = [{ scale }];
    if (rotateTo) {
        transform.push({
            rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rotateTo] }),
        });
    }

    return (
        <AnimatedPressable
            onPressIn={() => {
                if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                springTo(1);
            }}
            onPressOut={() => springTo(0)}
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            style={[style, { transform }]}
        >
            {children}
        </AnimatedPressable>
    );
}
