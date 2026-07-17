import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, User } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasAccount: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    hasAccount: false,
    login: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    // Set once login() ever succeeds (login or registration) and never
    // cleared by logout() — lets RootNavigator route a returning signed-out
    // user to Login instead of Landing/Onboarding. Lives here, not as a
    // separate AsyncStorage read in RootNavigator, so login() can update it
    // in the same render cycle as `user` — a value read independently on
    // mount elsewhere would go stale the moment login() ran without a
    // full app restart in between.
    const [hasAccount, setHasAccount] = useState(false);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
            const storedHasAccount = await AsyncStorage.getItem('@has_account');
            setHasAccount(storedHasAccount === 'true');

            const token = await AsyncStorage.getItem('token');
            if (token) {
                const u = await authApi.me();
                setUser(u);
                registerForPushNotificationsAsync().catch(() => {});
            }
        } catch (error) {
            console.log('Failed to fetch user with token', error);
            await AsyncStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (token: string) => {
        await AsyncStorage.setItem('token', token);
        const u = await authApi.me();
        setUser(u);
        // Persists past logout — tells RootNavigator this device has a real
        // account, so signing out lands on Login rather than the first-run
        // Landing/Onboarding flow. Covers both login and registration, since
        // RegisterScreen also completes by calling this same login().
        await AsyncStorage.setItem('@has_account', 'true');
        setHasAccount(true);
        registerForPushNotificationsAsync().catch(() => {});
    };

    const logout = async () => {
        // Best-effort server-side revocation — must run before the token is
        // cleared locally (it's read from storage at call time), but a failed
        // or offline request should never block signing out locally.
        try {
            await authApi.logout();
        } catch (error) {
            console.log('Failed to revoke token server-side', error);
        }
        await AsyncStorage.removeItem('token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                const u = await authApi.me();
                setUser(u);
            }
        } catch (e) { console.error('[Auth] Failed to restore session:', e); }
    };

    return (
        <AuthContext.Provider value={{ user, loading, hasAccount, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
