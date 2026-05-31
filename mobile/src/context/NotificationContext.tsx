import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
    ReactNode,
} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { notificationsApi, NotificationOut } from '../services/api';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { Bell } from 'lucide-react-native';

const POLL_INTERVAL = 30_000; // 30 seconds

interface NotificationContextType {
    unreadCount: number;
    notifications: NotificationOut[];
    refreshNotifications: () => Promise<void>;
    clearUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    notifications: [],
    refreshNotifications: async () => {},
    clearUnread: () => {},
});

export function useNotifications() {
    return useContext(NotificationContext);
}

// ─── Toast Banner ────────────────────────────────────────────────────────────
function ToastBanner({ message, visible, colors }: { message: string; visible: boolean; colors: any }) {
    const translateY = useRef(new Animated.Value(-80)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 60,
                friction: 10,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: -80,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.toast,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.accent,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Bell size={16} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={1}>
                {message}
            </Text>
        </Animated.View>
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
    const { colors } = useTheme();
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<NotificationOut[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);

    const prevIdsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (msg: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage(msg);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 3000);
    };

    const refreshNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data: NotificationOut[] = await notificationsApi.list();
            const arr = data || [];

            // Detect new notifications since last poll
            const newItems = arr.filter(n => !prevIdsRef.current.has(n.id));
            if (prevIdsRef.current.size > 0 && newItems.length > 0) {
                // Show toast for the most recent new notification
                showToast(newItems[0].title || 'New notification');
            }
            // Update known IDs
            prevIdsRef.current = new Set(arr.map(n => n.id));

            setNotifications(arr);
            setUnreadCount(arr.filter(n => !n.read).length);
        } catch (_) {
            // Silent fail — don't disturb the user on poll errors
        }
    }, [user]);

    const clearUnread = useCallback(() => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    // Initial load + 30-second polling
    useEffect(() => {
        if (!user) return;
        refreshNotifications();
        const interval = setInterval(refreshNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [user, refreshNotifications]);

    return (
        <NotificationContext.Provider value={{ unreadCount, notifications, refreshNotifications, clearUnread }}>
            {children}
            <ToastBanner message={toastMessage} visible={toastVisible} colors={colors} />
        </NotificationContext.Provider>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 10,
    },
    toastText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
