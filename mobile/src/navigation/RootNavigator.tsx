import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, StyleSheet, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CharacterSetupModal from '../components/CharacterSetupModal';
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

import MainTabNavigator from './MainTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import LandingScreen from '../screens/LandingScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TutorialScreen from '../screens/TutorialScreen';
import ProUpgradeScreen from '../screens/ProUpgradeScreen';
import RecurringScreen from '../screens/RecurringScreen';
import ExportScreen from '../screens/ExportScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import ReceiptScanScreen from '../screens/ReceiptScanScreen';
import SmartSplitScreen from '../screens/SmartSplitScreen';
import FriendsScreen from '../screens/FriendsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';

const Stack = createNativeStackNavigator();

/**
 * Shown for the blink while the auth session resolves. One breathing
 * green point — the same point of light the splash begins with — so
 * the hold reads as part of the brand, not a gap in it.
 */
function AuthHoldScreen({ background }: { background: string }) {
    const breath = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(breath, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(breath, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={[holdStyles.root, { backgroundColor: background }]}>
            {/* Expanding halo */}
            <Animated.View style={[holdStyles.halo, {
                opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
                transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
            }]} />
            {/* The point */}
            <Animated.View style={[holdStyles.dot, {
                opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
            }]} />
        </View>
    );
}

const holdStyles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    halo: {
        position: 'absolute',
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        borderWidth: 1.5,
        borderColor: '#22C55E',
    },
    dot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        backgroundColor: '#22C55E',
    },
});

export default function RootNavigator() {
    const { user, loading, hasAccount } = useAuth();
    const { colors, isDark } = useTheme();
    const navRef = useRef<NavigationContainerRef<any>>(null);

    // First-run check — unseen onboarding routes new users to the carousel
    const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
    useEffect(() => {
        AsyncStorage.getItem('@onboarding_seen')
            .then(v => setOnboardingSeen(v === 'true'))
            .catch(() => setOnboardingSeen(true));
    }, []);

    // Deep link handler: tandempay://join/{token} or https://tandempay.ca/join/{token}
    useEffect(() => {
        if (loading) return;

        const handleURL = async (url: string) => {
            const match = url.match(/\/join\/([A-Za-z0-9_-]+)/);
            if (!match) return;
            const token = match[1];

            if (user) {
                const tryNav = () => {
                    if (navRef.current?.isReady()) {
                        navRef.current.navigate('JoinGroup' as never, { token } as never);
                    } else {
                        setTimeout(tryNav, 100);
                    }
                };
                tryNav();
            } else {
                await AsyncStorage.setItem('@pending_invite_token', token);
            }
        };

        Linking.getInitialURL().then(url => { if (url) handleURL(url); });
        const sub = Linking.addEventListener('url', ({ url }) => handleURL(url));
        return () => sub.remove();
    }, [user, loading]);

    // Consume any pending invite token saved before the user was logged in
    useEffect(() => {
        if (!user || loading) return;
        AsyncStorage.getItem('@pending_invite_token').then(token => {
            if (!token) return;
            AsyncStorage.removeItem('@pending_invite_token');
            const tryNav = () => {
                if (navRef.current?.isReady()) {
                    navRef.current.navigate('JoinGroup' as never, { token } as never);
                } else {
                    setTimeout(tryNav, 100);
                }
            };
            tryNav();
        });
    }, [user, loading]);

    if (loading || (!user && onboardingSeen === null)) {
        return <AuthHoldScreen background={colors.background} />;
    }

    const navigationTheme = {
        ...(isDark ? DarkTheme : DefaultTheme),
        colors: {
            ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
        },
    };

    return (
        <Fragment>
        <NavigationContainer ref={navRef} theme={navigationTheme}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    // Modal presentation for creation flows
                    animation: 'slide_from_bottom',
                }}
            >
                {!user ? (
                    <Stack.Group screenOptions={{ animation: 'fade' }}>
                        {/* First screen in the group is the initial route.
                            A returning signed-out user (hasAccount) skips
                            straight to Login; otherwise fall back to the
                            existing first-run logic. */}
                        {hasAccount ? (
                            <Stack.Screen name="Login" component={LoginScreen} />
                        ) : (
                            !onboardingSeen && <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        )}
                        <Stack.Screen name="Landing" component={LandingScreen} />
                        {!hasAccount && <Stack.Screen name="Login" component={LoginScreen} />}
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </Stack.Group>
                ) : (
                    <Stack.Group>
                        {/* Main tab app */}
                        <Stack.Screen
                            name="MainTabs"
                            component={MainTabNavigator}
                            options={{ animation: 'fade' }}
                        />

                        {/* Full-screen detail screens */}
                        <Stack.Screen name="Group" component={GroupDetailScreen} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ animation: 'slide_from_right' }} />

                        {/* Modal-style creation screens */}
                        <Stack.Screen
                            name="CreateGroup"
                            component={CreateGroupScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="AddExpense"
                            component={AddExpenseScreen as any}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="AddFriend"
                            component={AddFriendScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="Tutorial"
                            component={TutorialScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="ProUpgrade"
                            component={ProUpgradeScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Recurring"
                            component={RecurringScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Export"
                            component={ExportScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Notifications"
                            component={NotificationsScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="SettleUp"
                            component={SettleUpScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Appearance"
                            component={AppearanceScreen}
                            options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="ReceiptScan"
                            component={ReceiptScanScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="SmartSplit"
                            component={SmartSplitScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="FriendsHub"
                            component={FriendsScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Subscription"
                            component={SubscriptionScreen}
                            options={{ animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="JoinGroup"
                            component={JoinGroupScreen}
                            options={{ animation: 'slide_from_bottom' }}
                        />
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
        <CharacterSetupModal visible={!!user && user.character_nickname === null} />
        </Fragment>
    );
}
