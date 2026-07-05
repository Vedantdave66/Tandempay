import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { T } from '../utils/typography';
import { scale, vs, ms } from '../utils/responsive';

// ToastProvider mounts above NavigationContainer, outside any SafeAreaProvider,
// so useSafeAreaInsets() is unavailable here. initialWindowMetrics is the
// established workaround (same approach as CharacterSetupModal).
const TOP_INSET = initialWindowMetrics?.insets.top ?? vs(24);

interface ToastContextType {
    /** Show a transient confirmation toast at the top of the screen.
     *  One message at a time — a new call replaces the current message
     *  and resets the dismiss timer. */
    showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const SHOW_MS = 200;   // slide down + fade in
const HOLD_MS = 1800;  // fully visible
const HIDE_MS = 200;   // slide up + fade out

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { colors } = useTheme();
    const [message, setMessage] = useState<string | null>(null);
    const anim = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((msg: string) => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setMessage(msg);
        Animated.timing(anim, { toValue: 1, duration: SHOW_MS, useNativeDriver: true }).start();
        hideTimer.current = setTimeout(() => {
            Animated.timing(anim, { toValue: 0, duration: HIDE_MS, useNativeDriver: true }).start(({ finished }) => {
                if (finished) setMessage(null);
            });
        }, SHOW_MS + HOLD_MS);
    }, [anim]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {message !== null && (
                <Animated.View
                    pointerEvents="none"
                    style={[styles.host, {
                        opacity: anim,
                        transform: [{
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-vs(20), 0],
                            }),
                        }],
                    }]}
                >
                    <Animated.View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.text, { color: colors.text }, T.semibold]} numberOfLines={2}>
                            {message}
                        </Text>
                    </Animated.View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        top: TOP_INSET + vs(10),
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    toast: {
        maxWidth: '86%',
        paddingHorizontal: scale(20),
        paddingVertical: vs(10),
        borderRadius: ms(20),
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    text: {
        fontSize: ms(14),
    },
});
