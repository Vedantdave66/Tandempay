import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
// import GroupScreen from '../screens/GroupScreen'; // Will add later

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return null; // Or a splash screen
    }

    const MyTheme = {
        ...DarkTheme,
        colors: {
            ...DarkTheme.colors,
            background: '#09090B',
            text: '#F5F7FA',
        },
    };

    return (
        <NavigationContainer theme={MyTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Unauthenticated Stack
                    <Stack.Group>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </Stack.Group>
                ) : (
                    // Authenticated Stack
                    <Stack.Group>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        {/* <Stack.Screen name="Group" component={GroupScreen} /> */}
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
