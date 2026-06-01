import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import CharacterShape from './CharacterShape';

interface CharacterSetupModalProps {
    visible: boolean;
}

const SHAPES = ['rect', 'tall', 'semi', 'round'] as const;
const COLORS = [
    '#3ECF8E', '#6366F1', '#F59E0B', '#EF4444',
    '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

export default function CharacterSetupModal({ visible }: CharacterSetupModalProps) {
    const { colors } = useTheme();
    const { refreshUser } = useAuth();

    const [shape, setShape] = useState<string>('rect');
    const [color, setColor] = useState<string>('#3ECF8E');
    const [nickname, setNickname] = useState('');
    const [saving, setSaving] = useState(false);

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
        } catch (e) {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => {}}
        >
            <ScrollView
                style={[styles.root, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Heading */}
                <Text style={[styles.heading, { color: colors.text }]}>
                    Choose your character
                </Text>
                <Text style={[styles.subheading, { color: colors.secondaryText }]}>
                    This is how your friends will see you in groups
                </Text>

                {/* Shape picker */}
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
                                        borderColor: selected ? color : 'transparent',
                                        backgroundColor: selected
                                            ? colors.surface
                                            : colors.surface,
                                        borderWidth: 2,
                                        borderRadius: 16,
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <CharacterShape shape={s} color={color} variant="hero" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Color palette */}
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

                {/* Nickname input */}
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

                {/* CTA */}
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
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Let's go</Text>
                    )}
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
        paddingTop: 72,
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
        marginBottom: 40,
    },
    shapeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 32,
    },
    shapeCol: {
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    colorRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    swatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
