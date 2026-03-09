import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Receipt, Handshake, UserPlus, Send, AlertCircle } from 'lucide-react';
import { notificationsApi, AppNotification } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch unread count on mount and every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const data = await notificationsApi.unreadCount();
            setUnreadCount(data.count);
        } catch { /* silent */ }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationsApi.list();
            setNotifications(data);
            const unread = data.filter(n => !n.read).length;
            setUnreadCount(unread);
        } catch { /* silent */ }
        setLoading(false);
    };

    const handleToggle = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAllRead = async () => {
        await notificationsApi.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleNotificationClick = async (notif: AppNotification) => {
        if (!notif.read) {
            await notificationsApi.markRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        if (notif.group_id) {
            navigate(`/groups/${notif.group_id}`);
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'expense_added': return <Receipt className="w-4 h-4 text-accent" />;
            case 'settlement_requested': return <Handshake className="w-4 h-4 text-indigo" />;
            case 'payment_sent': return <Send className="w-4 h-4 text-amber-400" />;
            case 'payment_confirmed': return <CheckCheck className="w-4 h-4 text-accent" />;
            case 'payment_declined': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'member_added': return <UserPlus className="w-4 h-4 text-indigo" />;
            default: return <Bell className="w-4 h-4 text-white/50" />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        return `${diffDay}d ago`;
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                className="relative w-11 h-11 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg shadow-sm"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                aria-expanded={isOpen}
            >
                <Bell className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-accent text-[11px] font-black text-[#064E3B] rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-accent/30 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-[#0C0E14] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-[360px] md:max-h-[80vh] md:border md:border-white/10 md:rounded-2xl md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col md:block"
                    role="dialog"
                    aria-label="Notifications Panel"
                >
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 pt-safe-top">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-bold">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-accent font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                    aria-label="Mark all notifications as read"
                                >
                                    <Check className="w-4 h-4" /> Read all
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
                                aria-label="Close notifications panel"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1 md:max-h-[400px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-20 text-center px-6">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <Bell className="w-8 h-8 text-white/30" />
                                </div>
                                <p className="text-base font-medium text-white/80 mb-1">All caught up!</p>
                                <p className="text-sm text-white/40">You have no new notifications.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/10 ${notif.read
                                            ? 'hover:bg-white/[0.04]'
                                            : 'bg-accent/5 hover:bg-accent/10 border-l-2 border-accent'
                                            }`}
                                        aria-label={`${notif.read ? 'Read notification' : 'Unread notification'}: ${notif.title}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${notif.read ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'
                                            }`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold mb-1 ${notif.read ? 'text-white/60' : 'text-white'}`}>
                                                {notif.title}
                                            </p>
                                            <p className={`text-xs leading-relaxed ${notif.read ? 'text-white/40' : 'text-white/70'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-[11px] font-medium text-white/30 mt-2 uppercase tracking-wider">{getTimeAgo(notif.created_at)}</p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2 shadow-[0_0_8px_theme('colors.accent')]" aria-hidden="true" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
