import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    recurringApi,
    RecurringExpense,
    RecurrenceFrequency,
} from '../services/api';
import { RefreshCw, Plus, Pencil, Trash2, X, Loader2, Crown, Lock } from 'lucide-react';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
};

function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

interface FormState {
    description: string;
    amount: string;
    frequency: RecurrenceFrequency;
    next_run_date: string;
}

const EMPTY_FORM: FormState = {
    description: '',
    amount: '',
    frequency: 'monthly',
    next_run_date: new Date().toISOString().split('T')[0],
};

export default function RecurringPage() {
    const { user } = useAuth();
    const isPro = user?.subscription_tier === 'pro';

    const [items, setItems] = useState<RecurringExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchItems = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await recurringApi.list();
            setItems(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load recurring expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowForm(true);
    };

    const openEdit = (rec: RecurringExpense) => {
        setEditingId(rec.id);
        setForm({
            description: rec.description,
            amount: rec.amount,
            frequency: rec.frequency,
            next_run_date: rec.next_run_date,
        });
        setFormError('');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
    };

    const handleSubmit = async () => {
        if (!form.description.trim()) { setFormError('Description is required'); return; }
        const amt = parseFloat(form.amount);
        if (!form.amount || isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount greater than 0'); return; }
        if (!form.next_run_date) { setFormError('Start date is required'); return; }

        setSubmitting(true);
        setFormError('');
        try {
            if (editingId) {
                const updated = await recurringApi.update(editingId, {
                    description: form.description.trim(),
                    amount: parseFloat(form.amount).toFixed(2),
                    frequency: form.frequency,
                    next_run_date: form.next_run_date,
                });
                setItems(prev => prev.map(r => r.id === editingId ? updated : r));
            } else {
                const created = await recurringApi.create({
                    description: form.description.trim(),
                    amount: parseFloat(form.amount).toFixed(2),
                    frequency: form.frequency,
                    next_run_date: form.next_run_date,
                });
                setItems(prev => [created, ...prev]);
            }
            closeForm();
        } catch (e: any) {
            setFormError(e.message || 'Save failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await recurringApi.delete(id);
            setItems(prev => prev.map(r => r.id === id ? { ...r, is_active: false } : r));
        } catch (e: any) {
            setError(e.message || 'Failed to deactivate');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-accent" />
                        Recurring Expenses
                        {isPro && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-accent/10 text-accent rounded-full">
                                <Crown className="w-3 h-3" /> Pro
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-secondary mt-1">
                        Auto-split expenses on a schedule
                    </p>
                </div>
                {isPro ? (
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Recurring
                    </button>
                ) : (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-secondary text-sm font-semibold rounded-xl cursor-not-allowed opacity-60"
                    >
                        <Lock className="w-4 h-4" />
                        Add Recurring
                    </button>
                )}
            </div>

            {!isPro && (
                <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-2xl flex items-start gap-3">
                    <Crown className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-primary">Upgrade to Pro to create recurring expenses</p>
                        <p className="text-xs text-secondary mt-0.5">
                            Pro members can set up automatic splits for rent, subscriptions, and more.
                        </p>
                        <a
                            href="/settings"
                            className="inline-block mt-2 text-xs font-bold text-accent hover:underline"
                        >
                            Upgrade now &rarr;
                        </a>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-secondary">
                    <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No recurring expenses yet</p>
                    {isPro && (
                        <p className="text-sm mt-1">
                            Click <strong>Add Recurring</strong> to get started.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(rec => (
                        <div
                            key={rec.id}
                            className={`p-4 bg-surface border border-border rounded-2xl flex items-center gap-4 ${!rec.is_active ? 'opacity-50' : ''}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-primary truncate">{rec.description}</p>
                                    {!rec.is_active && (
                                        <span className="text-xs text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
                                            inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-secondary mt-0.5">
                                    {FREQUENCY_LABELS[rec.frequency]} · {rec.currency} ${parseFloat(rec.amount).toFixed(2)}
                                </p>
                                <p className="text-xs text-secondary/70 mt-0.5">
                                    Next run: {formatDate(rec.next_run_date)}
                                </p>
                            </div>

                            {isPro && rec.is_active && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => openEdit(rec)}
                                        className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                                        aria-label="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rec.id)}
                                        className="p-2 text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                                        aria-label="Deactivate"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-bg border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-primary">
                                {editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
                            </h2>
                            <button
                                onClick={closeForm}
                                className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-secondary mb-1">Description</label>
                                <input
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Monthly rent, Netflix subscription…"
                                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                                    maxLength={255}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-secondary mb-1">Amount (CAD)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-secondary mb-1">Frequency</label>
                                <select
                                    value={form.frequency}
                                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurrenceFrequency }))}
                                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-secondary mb-1">Start date</label>
                                <input
                                    type="date"
                                    value={form.next_run_date}
                                    onChange={e => setForm(f => ({ ...f, next_run_date: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
                                />
                            </div>
                        </div>

                        {formError && (
                            <p className="mt-3 text-xs text-danger">{formError}</p>
                        )}

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={closeForm}
                                className="flex-1 py-2.5 text-sm text-secondary hover:text-primary bg-surface hover:bg-border rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 py-2.5 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Add')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
