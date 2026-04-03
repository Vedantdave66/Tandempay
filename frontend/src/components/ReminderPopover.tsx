import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, Clock, Loader2 } from 'lucide-react';
import { remindersApi, Reminder } from '../services/api';

interface ReminderPopoverProps {
    groupId: string;
    expenseId: string;
}

export default function ReminderPopover({ groupId, expenseId }: ReminderPopoverProps) {
    const [open, setOpen] = useState(false);
    const [reminder, setReminder] = useState<Reminder | null>(null);
    const [intervalDays, setIntervalDays] = useState(3);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Fetch current reminder when popover opens
    useEffect(() => {
        if (!open) return;
        const fetchReminder = async () => {
            setFetching(true);
            setError('');
            try {
                const data = await remindersApi.get(groupId, expenseId);
                setReminder(data);
                if (data) setIntervalDays(data.interval_days);
            } catch {
                // No reminder set — that's fine
                setReminder(null);
            } finally {
                setFetching(false);
            }
        };
        fetchReminder();
    }, [open, groupId, expenseId]);

    const handleSetReminder = async () => {
        if (intervalDays < 1) {
            setError('Minimum 1 day');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await remindersApi.create(groupId, expenseId, intervalDays);
            setReminder(data);
        } catch (err: any) {
            setError(err.message || 'Failed to set reminder');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReminder = async () => {
        setLoading(true);
        setError('');
        try {
            await remindersApi.delete(groupId, expenseId);
            setReminder(null);
        } catch (err: any) {
            setError(err.message || 'Failed to cancel reminder');
        } finally {
            setLoading(false);
        }
    };

    const hasActiveReminder = reminder?.is_active;

    const formatNextDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Bell Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hasActiveReminder
                        ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                }`}
                title={hasActiveReminder ? 'Reminder active' : 'Set reminder'}
            >
                {hasActiveReminder ? (
                    <BellRing className="w-3.5 h-3.5" />
                ) : (
                    <Bell className="w-3.5 h-3.5" />
                )}
            </button>

            {/* Popover */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl z-50 animate-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-primary">Reminders</span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-light transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5 text-secondary" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        {fetching ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                            </div>
                        ) : hasActiveReminder ? (
                            /* Active reminder state */
                            <div className="space-y-3">
                                <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BellRing className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm font-semibold text-amber-400">Active</span>
                                    </div>
                                    <p className="text-xs text-secondary">
                                        Reminding every <span className="text-primary font-bold">{reminder!.interval_days} day{reminder!.interval_days !== 1 ? 's' : ''}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-secondary">
                                        <Clock className="w-3 h-3" />
                                        <span>Next: {formatNextDate(reminder!.next_reminder_at)}</span>
                                    </div>
                                </div>

                                {/* Update interval */}
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1.5">Update interval</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-secondary whitespace-nowrap">Every</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={intervalDays}
                                            onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-16 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-primary text-center focus:outline-none focus:border-accent transition-colors"
                                        />
                                        <span className="text-xs text-secondary whitespace-nowrap">day{intervalDays !== 1 ? 's' : ''}</span>
                                        <button
                                            onClick={handleSetReminder}
                                            disabled={loading || intervalDays === reminder!.interval_days}
                                            className="ml-auto px-3 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
                                        >
                                            {loading ? '...' : 'Update'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCancelReminder}
                                    disabled={loading}
                                    className="w-full py-2 bg-danger/5 hover:bg-danger/10 border border-danger/20 text-danger text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Cancelling...' : 'Cancel Reminder'}
                                </button>
                            </div>
                        ) : (
                            /* No reminder state */
                            <div className="space-y-3">
                                <p className="text-xs text-secondary">
                                    Set a recurring reminder to notify all participants about this expense.
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-secondary whitespace-nowrap">Remind every</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={intervalDays}
                                        onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-16 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-primary text-center focus:outline-none focus:border-accent transition-colors"
                                    />
                                    <span className="text-xs text-secondary whitespace-nowrap">day{intervalDays !== 1 ? 's' : ''}</span>
                                </div>
                                <button
                                    onClick={handleSetReminder}
                                    disabled={loading}
                                    className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Setting...' : 'Set Reminder'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-danger mt-2">{error}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
