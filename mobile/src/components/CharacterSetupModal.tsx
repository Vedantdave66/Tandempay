import React, { useRef, useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, ScrollView,
    Animated, PanResponder,
} from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { T } from '../utils/typography';
import { ms } from '../utils/responsive';
import CharacterShape from './CharacterShape';
import PressableScale from './PressableScale';

interface CharacterSetupModalProps {
    visible: boolean;
    onClose?: () => void;
}

const SHAPES = ['rect', 'tall', 'semi', 'round'] as const;
type ShapeKey = typeof SHAPES[number];

const COLORS = [
    '#3ECF8E', '#6366F1', '#F59E0B', '#EF4444',
    '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

// Preview dimensions are MINI_CONFIGS.mini (CharacterShape.tsx) scaled by
// ~3.4× so the big preview keeps exactly the proportions of the selector tile
// you tapped. Eye positions scale by the same factor.
const SINGLE_SHAPE_CONFIG: Record<ShapeKey, {
    width: number; height: number; tl: number; tr: number;
    eyeLeft: number; eyeTop: number; eyeType: 'ball' | 'pupil';
    eyeSize: number; eyeGap: number;
    mouthLeft?: number; mouthTop?: number;
}> = {
    //  mini: { w:32, h:52, radius:'6px 6px 0 0', eyeTop:10, eyeLeft:8, eyeSize:5, eyeGap:6 }
    rect: {
        width: 108, height: 177, tl: 20, tr: 20,
        eyeLeft: 27, eyeTop: 34, eyeType: 'ball', eyeSize: 18, eyeGap: 20,
    },
    //  mini: { w:22, h:64, radius:'4px 4px 0 0', eyeTop:12, eyeLeft:4, eyeSize:5, eyeGap:4 }
    tall: {
        width: 75, height: 218, tl: 14, tr: 14,
        eyeLeft: 14, eyeTop: 41, eyeType: 'ball', eyeSize: 18, eyeGap: 14,
    },
    //  mini: { w:56, h:30, radius:'28px 28px 0 0', eyeTop:8, eyeLeft:19, eyeSize:5, eyeGap:8 }
    semi: {
        width: 190, height: 102, tl: 95, tr: 95,
        eyeLeft: 65, eyeTop: 27, eyeType: 'pupil', eyeSize: 14, eyeGap: 27,
    },
    //  mini: { w:40, h:52, radius:'20px 20px 0 0', eyeTop:12, eyeLeft:12, eyeSize:5, eyeGap:6, mouthLeft:11, mouthTop:36 }
    round: {
        width: 136, height: 177, tl: 68, tr: 68,
        eyeLeft: 41, eyeTop: 41, eyeType: 'pupil', eyeSize: 14, eyeGap: 20,
        mouthLeft: 37, mouthTop: 122,
    },
};

// ── Eye sub-components ────────────────────────────────────────────────────────

function EyeBall({ size, blinkAnim, eyeX, eyeY }: {
    size: number;
    blinkAnim: Animated.Value;
    eyeX: Animated.Value;
    eyeY: Animated.Value;
}) {
    const pupilSize = size * 0.4;
    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transform: [{ scaleY: blinkAnim }],
            }}
        >
            <Animated.View
                style={{
                    width: pupilSize,
                    height: pupilSize,
                    borderRadius: pupilSize / 2,
                    backgroundColor: '#1A1A1A',
                    transform: [{ translateX: eyeX }, { translateY: eyeY }],
                }}
            />
        </Animated.View>
    );
}

function PupilDot({ size, eyeX, eyeY }: {
    size: number;
    eyeX: Animated.Value;
    eyeY: Animated.Value;
}) {
    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#1A1A1A',
                transform: [{ translateX: eyeX }, { translateY: eyeY }],
            }}
        />
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CharacterSetupModal({ visible, onClose }: CharacterSetupModalProps) {
    const { colors } = useTheme();
    const { refreshUser } = useAuth();
    const [shape, setShape] = useState<ShapeKey>('rect');
    const [color, setColor] = useState('#3ECF8E');
    const [nickname, setNickname] = useState('');
    const [saving, setSaving] = useState(false);

    const eyeX = useRef(new Animated.Value(0)).current;
    const eyeY = useRef(new Animated.Value(0)).current;
    const blinkAnim = useRef(new Animated.Value(1)).current;

    // Blink loop: random interval 3–5 s
    useEffect(() => {
        let cancelled = false;
        const scheduleBlink = () => {
            const delay = Math.random() * 2000 + 3000;
            setTimeout(() => {
                if (cancelled) return;
                Animated.sequence([
                    Animated.timing(blinkAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
                    Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
                ]).start(() => { if (!cancelled) scheduleBlink(); });
            }, delay);
        };
        scheduleBlink();
        return () => { cancelled = true; };
    }, []);

    // PanResponder on the preview container drives eye tracking
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, { dx, dy }) => {
                const tx = Math.max(-5, Math.min(5, dx * 0.25));
                const ty = Math.max(-5, Math.min(5, dy * 0.25));
                Animated.spring(eyeX, { toValue: tx, useNativeDriver: false, friction: 8, tension: 120 }).start();
                Animated.spring(eyeY, { toValue: ty, useNativeDriver: false, friction: 8, tension: 120 }).start();
            },
            onPanResponderRelease: () => {
                Animated.spring(eyeX, { toValue: 0, useNativeDriver: false, friction: 5, tension: 60 }).start();
                Animated.spring(eyeY, { toValue: 0, useNativeDriver: false, friction: 5, tension: 60 }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(eyeX, { toValue: 0, useNativeDriver: false, friction: 5, tension: 60 }).start();
                Animated.spring(eyeY, { toValue: 0, useNativeDriver: false, friction: 5, tension: 60 }).start();
            },
        })
    ).current;

    // Body skew: ±5 px of eye offset → ±6 deg skew
    const skewX = eyeX.interpolate({
        inputRange: [-5, 0, 5],
        outputRange: ['-6deg', '0deg', '6deg'],
        extrapolate: 'clamp',
    });

    const canSave = nickname.trim().length > 0;

    const handleSave = async () => {
        if (!canSave || saving) return;
        setSaving(true);
        try {
            await authApi.updateProfile({
                character_shape: shape,
                character_color: color,
                character_nickname: nickname.trim(),
            });
            await refreshUser();
            onClose?.();
        } catch {
            setSaving(false);
        }
    };

    const cfg = SINGLE_SHAPE_CONFIG[shape];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose ?? (() => {})}
        >
            <ScrollView
                style={[styles.root, { backgroundColor: colors.background }]}
                contentContainerStyle={[styles.content, { paddingTop: (initialWindowMetrics?.insets.top ?? 44) + 60 }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Close button — only when dismissible */}
                {onClose && (
                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.closeBtn, { top: (initialWindowMetrics?.insets.top ?? 44) + 8 }]}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.closeBtnText, { color: colors.secondaryText }, T.semibold]}>✕</Text>
                    </TouchableOpacity>
                )}

                {/* Heading */}
                <Text style={[styles.heading, { color: colors.text }, T.extrabold]}>
                    Choose your character
                </Text>
                <Text style={[styles.subheading, { color: colors.secondaryText }, T.regular]}>
                    This is how your friends will see you in groups
                </Text>

                {/* ── Hero character preview ── */}
                <View
                    style={styles.previewContainer}
                    {...panResponder.panHandlers}
                >
                    <Animated.View
                        style={{
                            width: cfg.width,
                            height: cfg.height,
                            backgroundColor: color,
                            borderTopLeftRadius: cfg.tl,
                            borderTopRightRadius: cfg.tr,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                            transform: [{ skewX }],
                        }}
                    >
                        {/* Eye row — fixed position inside body, pupils track via eyeX/Y */}
                        <View
                            style={{
                                position: 'absolute',
                                left: cfg.eyeLeft,
                                top: cfg.eyeTop,
                                flexDirection: 'row',
                                gap: cfg.eyeGap,
                            }}
                        >
                            {cfg.eyeType === 'ball' ? (
                                <>
                                    <EyeBall size={cfg.eyeSize} blinkAnim={blinkAnim} eyeX={eyeX} eyeY={eyeY} />
                                    <EyeBall size={cfg.eyeSize} blinkAnim={blinkAnim} eyeX={eyeX} eyeY={eyeY} />
                                </>
                            ) : (
                                <>
                                    <PupilDot size={cfg.eyeSize} eyeX={eyeX} eyeY={eyeY} />
                                    <PupilDot size={cfg.eyeSize} eyeX={eyeX} eyeY={eyeY} />
                                </>
                            )}
                        </View>

                        {/* Mouth — round shape only */}
                        {cfg.mouthLeft !== undefined && cfg.mouthTop !== undefined && (
                            <Animated.View
                                style={{
                                    position: 'absolute',
                                    left: cfg.mouthLeft,
                                    top: cfg.mouthTop,
                                    width: cfg.width * 0.55,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: '#1A1A1A',
                                    transform: [{ translateX: eyeX }, { translateY: eyeY }],
                                }}
                            />
                        )}
                    </Animated.View>
                </View>

                {/* ── Shape selector ── */}
                <View style={styles.shapeRow}>
                    {SHAPES.map((s) => {
                        const selected = shape === s;
                        return (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setShape(s)}
                                style={[
                                    styles.shapeCol,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: selected ? color : 'transparent',
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <CharacterShape shape={s} color={color} variant="mini" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Color palette ── */}
                <View style={styles.colorRow}>
                    {COLORS.map((c) => {
                        const selected = color === c;
                        return (
                            <TouchableOpacity
                                key={c}
                                onPress={() => setColor(c)}
                                style={[
                                    styles.swatch,
                                    { backgroundColor: c },
                                    selected && styles.swatchSelected,
                                ]}
                                activeOpacity={0.8}
                            />
                        );
                    })}
                </View>

                {/* ── Nickname input ── */}
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                        },
                        T.regular,
                    ]}
                    placeholder="Give your character a name"
                    placeholderTextColor={colors.secondaryText}
                    value={nickname}
                    onChangeText={setNickname}
                    maxLength={30}
                    textAlign="center"
                    autoCorrect={false}
                />

                {/* ── CTA ── */}
                <PressableScale
                    scaleTo={0.97}
                    haptic="medium"
                    onPress={handleSave}
                    disabled={!canSave || saving}
                    style={[
                        styles.button,
                        { backgroundColor: colors.accent },
                        (!canSave || saving) && styles.buttonDisabled,
                    ]}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={[styles.buttonText, T.bold]}>Let's go</Text>
                    }
                </PressableScale>
            </ScrollView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    heading: {
        fontSize: ms(32),
        textAlign: 'center',
        marginBottom: 10,
    },
    subheading: {
        fontSize: ms(15),
        textAlign: 'center',
        marginBottom: 32,
    },
    previewContainer: {
        width: '100%',
        height: 260, // enough for tallest shape (tall = 218) with breathing room
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 28,
    },
    shapeRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        marginBottom: 24,
    },
    shapeCol: {
        padding: 10,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: 88, // enough for mini rect (52px) + padding
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 28,
    },
    swatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    swatchSelected: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: ms(16),
        marginBottom: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.4 },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    closeBtnText: {
        fontSize: ms(18),
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17, // fixed, not ms() — CTA size is spec'd as a constant (DESIGN_SPEC §2)
    },
});
