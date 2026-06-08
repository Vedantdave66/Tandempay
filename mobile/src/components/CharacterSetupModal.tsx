import React, { useRef, useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, ScrollView,
    Animated, PanResponder,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import CharacterShape from './CharacterShape';

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

const SINGLE_SHAPE_CONFIG: Record<ShapeKey, {
    width: number; height: number; tl: number; tr: number;
    eyeLeft: number; eyeTop: number; eyeType: 'ball' | 'pupil';
    eyeSize: number; eyeGap: number;
    mouthLeft?: number; mouthTop?: number;
}> = {
    rect:  { width: 110, height: 250, tl: 8,   tr: 8,   eyeLeft: 30, eyeTop: 40, eyeType: 'ball',  eyeSize: 16, eyeGap: 18 },
    tall:  { width: 140, height: 330, tl: 8,   tr: 8,   eyeLeft: 43, eyeTop: 55, eyeType: 'ball',  eyeSize: 18, eyeGap: 18 },
    semi:  { width: 230, height: 160, tl: 115, tr: 115, eyeLeft: 93, eyeTop: 60, eyeType: 'pupil', eyeSize: 12, eyeGap: 20 },
    round: { width: 130, height: 230, tl: 65,  tr: 65,  eyeLeft: 45, eyeTop: 45, eyeType: 'pupil', eyeSize: 12, eyeGap: 16, mouthLeft: 25, mouthTop: 90 },
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
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Close button — only when dismissible */}
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                        <Text style={[styles.closeBtnText, { color: colors.secondaryText }]}>✕</Text>
                    </TouchableOpacity>
                )}

                {/* Heading */}
                <Text style={[styles.heading, { color: colors.text }]}>
                    Choose your character
                </Text>
                <Text style={[styles.subheading, { color: colors.secondaryText }]}>
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
                                    width: 80,
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
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={!canSave || saving}
                    style={[
                        styles.button,
                        { backgroundColor: colors.accent },
                        (!canSave || saving) && styles.buttonDisabled,
                    ]}
                    activeOpacity={0.85}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Let's go</Text>
                    }
                </TouchableOpacity>
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
        paddingTop: 64,
        paddingBottom: 48,
    },
    heading: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
    },
    subheading: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
    },
    previewContainer: {
        width: '100%',
        height: 340,
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
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
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
        fontSize: 16,
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
        fontSize: 18,
        fontWeight: '600',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
