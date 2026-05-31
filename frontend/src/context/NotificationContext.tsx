import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { notificationsApi } from '../services/api';

interface NotificationContextType {
    unreadCount: number;
    clearUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    clearUnread: () => {},
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const data = await notificationsApi.unreadCount();
            setUnreadCount(data.count);
        } catch { /* silent */ }
    }, [user]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30_000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const clearUnread = useCallback(() => setUnreadCount(0), []);

    return (
        <NotificationContext.Provider value={{ unreadCount, clearUnread }}>
            {children}
        </NotificationContext.Provider>
    );
}
