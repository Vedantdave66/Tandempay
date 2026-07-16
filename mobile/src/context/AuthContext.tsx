import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, User } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
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
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
