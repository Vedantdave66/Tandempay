import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import MainTabNavigator from './MainTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import LandingScreen from '../screens/LandingScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TutorialScreen from '../screens/TutorialScreen';
// TODO(sentry-validation): TEMPORARY — remove import + Stack.Screen after validation
import SentryTestScreen from '../screens/SentryTestScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, loading } = useAuth();
    const { colors, isDark } = useTheme();

    if (loading) {
        return null;
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
        <NavigationContainer theme={navigationTheme}>
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
                        <Stack.Screen name="Landing" component={LandingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
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

                        {/* Modal-style creation screens */}
                        <Stack.Screen
                            name="CreateGroup"
                            component={CreateGroupScreen}
                            options={{ presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="AddExpense"
                            component={AddExpenseScreen}
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
                        {/* TODO(sentry-validation): TEMPORARY — remove after validation */}
                        {__DEV__ && (
                            <Stack.Screen
                                name="SentryTest"
                                component={SentryTestScreen}
                                options={{ presentation: 'modal', title: 'Sentry Test' }}
                            />
                        )}
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
