import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { GroupMember, expensesApi, Expense } from '../services/api';

interface AddExpenseModalProps {
    groupId: string;
    members: GroupMember[];
    expense?: Expense; // If provided, we are editing
    onClose: () => void;
    onCreated?: (expense: Expense) => void;
    onUpdated?: (expense: Expense) => void;
}

export default function AddExpenseModal({
    groupId,
    members,
    expense,
    onClose,
    onCreated,
    onUpdated
}: AddExpenseModalProps) {
    const isEditMode = !!expense;
    const navigate = useNavigate();

    const [title, setTitle] = useState(expense?.title || '');
    const [amount, setAmount] = useState(expense ? expense.amount.toString() : '');
    const [paidBy, setPaidBy] = useState(expense?.paid_by || members[0]?.user_id || '');
    // Only used in edit mode — participant selection is handled by SplitCanvas for new expenses
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
        expense ? expense.participants.map(p => p.user_id) : members.map(m => m.user_id)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleParticipant = (userId: string) => {
        setSelectedParticipants(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);

        if (!title.trim() || !parsedAmount || parsedAmount <= 0 || !paidBy) {
            setError('Please fill in a description, amount, and who paid');
            return;
        }

        // Edit mode — submit directly with participant selection
        if (isEditMode && expense && onUpdated) {
            if (selectedParticipants.length === 0) {
                setError('Select at least one participant');
                return;
            }
            setLoading(true);
            setError('');
            try {
                const updatedExpense = await expensesApi.update(groupId, expense.id, {
                    title: title.trim(),
                    amount: parsedAmount,
                    paid_by: paidBy,
                    participant_ids: selectedParticipants,
                });
                onUpdated(updatedExpense);
            } catch (err: any) {
                setError(err.message || 'Failed to save expense');
                setLoading(false);
            }
            return;
        }

        // Create mode — hand off to SplitCanvas for participant selection
        const params = new URLSearchParams({
            name: title.trim(),
            amount: parsedAmount.toString(),
            paidBy,
        });
        onClose();
        navigate(`/groups/${groupId}/split?${params.toString()}`);
    };

    const splitAmount = selectedParticipants.length > 0
        ? (parseFloat(amount || '0') / selectedParticipants.length).toFixed(2)
        : '0.00';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-surface border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-primary">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4 text-secondary" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Description</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Dinner, Uber, Groceries"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-lg font-semibold">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-bg border border-border rounded-xl pl-9 pr-4 py-3 text-lg font-semibold text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Paid by</label>
                        <select
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                        >
                            {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Participant selection — edit mode only; SplitCanvas handles this for new expenses */}
                    {isEditMode && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-2">Split between</label>
                                <div className="space-y-2">
                                    {members.map((m) => (
                                        <label
                                            key={m.user_id}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${selectedParticipants.includes(m.user_id)
                                                ? 'bg-accent/5 border-accent/30'
                                                : 'bg-bg border-border hover:border-border'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedParticipants.includes(m.user_id)}
                                                onChange={() => toggleParticipant(m.user_id)}
                                                className="sr-only"
                                            />
                                            <div
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedParticipants.includes(m.user_id)
                                                    ? 'bg-accent border-accent'
                                                    : 'border-border'
                                                    }`}
                                            >
                                                {selectedParticipants.includes(m.user_id) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-primary flex-1">{m.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {parseFloat(amount || '0') > 0 && selectedParticipants.length > 0 && (
                                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                                    <p className="text-sm text-secondary">
                                        Each person pays <span className="text-accent font-bold">${splitAmount}</span>
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {!isEditMode && (
                        <p className="text-xs text-secondary/60 text-center -mt-1">
                            You'll choose who's splitting on the next screen
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : isEditMode ? 'Save Changes' : (
                            <>Choose who's splitting <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
