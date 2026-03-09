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
                className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                aria-label="Notifications"
            >
                <Bell className="w-[18px] h-[18px] text-white/50 group-hover:text-white/80 transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent text-[10px] font-black text-[#064E3B] rounded-full flex items-center justify-center px-1 shadow-lg shadow-accent/30 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-[#0C0E14] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1 text-[10px] text-white/40 hover:text-accent uppercase tracking-widest transition-colors cursor-pointer"
                                >
                                    <Check className="w-3 h-3" /> Read all
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5 text-white/40" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[400px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                <p className="text-sm text-white/30">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer text-left ${notif.read
                                            ? 'hover:bg-white/[0.02]'
                                            : 'bg-accent/[0.03] hover:bg-accent/[0.06]'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notif.read ? 'bg-white/5' : 'bg-white/[0.08]'
                                        }`}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold mb-0.5 ${notif.read ? 'text-white/50' : 'text-white/90'}`}>
                                            {notif.title}
                                        </p>
                                        <p className={`text-[11px] leading-relaxed ${notif.read ? 'text-white/30' : 'text-white/50'}`}>
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-white/20 mt-1">{getTimeAgo(notif.created_at)}</p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
