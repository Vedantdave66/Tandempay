import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { groupsApi, GroupPreview } from '../services/api';
import { scale, vs, ms } from '../utils/responsive';
import { T } from '../utils/typography';
import SkeletonBlock from '../components/SkeletonBlock';
import PressableScale from '../components/PressableScale';

export default function JoinGroupScreen({ route, navigation }: any) {
    const { token } = route.params as { token: string };
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [preview, setPreview] = useState<GroupPreview | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        groupsApi.previewInvite(token)
            .then(setPreview)
            .catch(() => setError('This invite link is invalid or has expired.'))
            .finally(() => setPageLoading(false));
    }, [token]);

    const handleJoin = useCallback(async () => {
        setJoining(true);
        try {
            const result = await groupsApi.joinByToken(token);
            navigation.replace('Group', { groupId: result.group_id });
        } catch (err: any) {
            Alert.alert('Could not join', err.message || 'Something went wrong. Try again.');
            setJoining(false);
        }
    }, [token, navigation]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + vs(64) }]}>
            <View style={styles.content}>
                {pageLoading ? (
                    <>
                        <SkeletonBlock
                            width="70%"
                            height={vs(28)}
                            radius={ms(8)}
                            style={styles.skeletonCenter}
                        />
                        <SkeletonBlock
                            width="50%"
                            height={vs(18)}
                            radius={ms(6)}
                            delay={120}
                            style={styles.skeletonCenter}
                        />
                    </>
                ) : error ? (
                    <Text style={[styles.errorText, { color: colors.secondaryText }, T.regular]}>
                        {error}
                    </Text>
                ) : preview ? (
                    <>
                        <Text style={[styles.groupName, { color: colors.text }, T.extrabold]}>
                            {preview.group_name}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }, T.regular]}>
                            {'Created by '}
                            {preview.creator_name}
                            {' · '}
                            {preview.member_count}
                            {preview.member_count !== 1 ? ' members' : ' member'}
                        </Text>
                        <PressableScale
                            scaleTo={0.97}
                            haptic="medium"
                            onPress={handleJoin}
                            disabled={joining}
                            style={[styles.joinBtn, { backgroundColor: colors.accent, opacity: joining ? 0.7 : 1 }]}
                        >
                            <Text style={[styles.joinBtnText, T.bold]}>
                                {joining ? 'Joining...' : 'Join Group'}
                            </Text>
                        </PressableScale>
                    </>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    content: {
        width: '100%',
        paddingHorizontal: scale(32),
        alignItems: 'center',
        gap: vs(12),
    },
    skeletonCenter: {
        alignSelf: 'center',
    },
    groupName: {
        fontSize: ms(26),
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: ms(14),
        textAlign: 'center',
    },
    joinBtn: {
        width: '100%',
        height: vs(50),
        borderRadius: ms(14),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(16),
    },
    joinBtnText: {
        color: '#fff',
        fontSize: ms(15),
    },
    errorText: {
        fontSize: ms(14),
        textAlign: 'center',
    },
});
