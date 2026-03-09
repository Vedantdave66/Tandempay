import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    // Fetch unread count on mount and every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const data = await notificationsApi.unreadCount();
            setUnreadCount(data.count);
        } catch { /* silent */ }
    };

    const handleClick = () => {
        navigate('/friends?tab=activity');
    };

    return (
        <button
            onClick={handleClick}
            className="relative w-11 h-11 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg shadow-sm"
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
            <Bell className="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-accent text-[11px] font-black text-[#064E3B] rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-accent/30 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
