import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 17 }: { size?: number }) {
    const { colors } = useTheme();
    const fontSize = size + 1;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize, color: colors.text, letterSpacing: -0.4 }}>Tandem</Text>
            <View style={{
                width: 2,
                height: fontSize * 1.15,
                backgroundColor: colors.accent,
                borderRadius: 1,
                transform: [{ rotate: '18deg' }],
                opacity: 0.85,
                marginHorizontal: Math.round(fontSize * 0.18),
            }} />
            <Text style={{ fontWeight: '800', fontSize, color: colors.accent, letterSpacing: -0.4 }}>Pay</Text>
        </View>
    );
}
