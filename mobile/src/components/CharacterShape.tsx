import React from 'react';
import { View } from 'react-native';

export const MINI_CONFIGS = {
    cluster: {
        rect:  { w: 20, h: 32, radius: '4px 4px 0 0',   eyeTop: 6,  eyeLeft: 5,  eyeSize: 3, eyeGap: 4 },
        tall:  { w: 14, h: 40, radius: '3px 3px 0 0',   eyeTop: 8,  eyeLeft: 3,  eyeSize: 3, eyeGap: 3 },
        semi:  { w: 36, h: 20, radius: '18px 18px 0 0', eyeTop: 5,  eyeLeft: 12, eyeSize: 3, eyeGap: 5 },
        round: { w: 26, h: 32, radius: '13px 13px 0 0', eyeTop: 8,  eyeLeft: 8,  eyeSize: 3, eyeGap: 4 },
    },
    mini: {
        rect:  { w: 32, h: 52,  radius: '6px 6px 0 0',   eyeTop: 10, eyeLeft: 8,  eyeSize: 5, eyeGap: 6 },
        tall:  { w: 22, h: 64,  radius: '4px 4px 0 0',   eyeTop: 12, eyeLeft: 4,  eyeSize: 5, eyeGap: 4 },
        semi:  { w: 56, h: 30,  radius: '28px 28px 0 0', eyeTop: 8,  eyeLeft: 19, eyeSize: 5, eyeGap: 8 },
        round: { w: 40, h: 52,  radius: '20px 20px 0 0', eyeTop: 12, eyeLeft: 12, eyeSize: 5, eyeGap: 6 },
    },
    hero: {
        rect:  { w: 56, h: 96,  radius: '8px 8px 0 0',   eyeTop: 18, eyeLeft: 14, eyeSize: 9, eyeGap: 10 },
        tall:  { w: 40, h: 116, radius: '6px 6px 0 0',   eyeTop: 22, eyeLeft: 7,  eyeSize: 9, eyeGap: 8  },
        semi:  { w: 100, h: 54, radius: '50px 50px 0 0', eyeTop: 14, eyeLeft: 34, eyeSize: 9, eyeGap: 14 },
        round: { w: 72, h: 96,  radius: '36px 36px 0 0', eyeTop: 22, eyeLeft: 22, eyeSize: 9, eyeGap: 10 },
    },
} as const;

export type ShapeVariant = keyof typeof MINI_CONFIGS;

function topRadius(radius: string): number {
    const m = radius.match(/^(\d+)px/);
    return m ? parseInt(m[1], 10) : 0;
}

export default function CharacterShape({
    shape,
    color,
    variant = 'mini',
}: {
    shape: string;
    color: string;
    variant?: ShapeVariant;
}) {
    const table = MINI_CONFIGS[variant];
    const cfg = (table as Record<string, (typeof table)[keyof typeof table]>)[shape] ?? table.rect;
    const r = topRadius(cfg.radius);
    return (
        <View
            style={{
                width: cfg.w,
                height: cfg.h,
                backgroundColor: color,
                borderTopLeftRadius: r,
                borderTopRightRadius: r,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                flexShrink: 0,
            }}
        >
            <View
                style={{
                    position: 'absolute',
                    top: cfg.eyeTop,
                    left: cfg.eyeLeft,
                    flexDirection: 'row',
                    gap: cfg.eyeGap,
                }}
            >
                <View style={{ width: cfg.eyeSize, height: cfg.eyeSize, backgroundColor: '#1A1A1A', borderRadius: cfg.eyeSize / 2, opacity: 0.7 }} />
                <View style={{ width: cfg.eyeSize, height: cfg.eyeSize, backgroundColor: '#1A1A1A', borderRadius: cfg.eyeSize / 2, opacity: 0.7 }} />
            </View>
        </View>
    );
}
