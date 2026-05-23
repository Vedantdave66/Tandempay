import { useState } from 'react';
import { Crown, X, RefreshCw, Download, ScanLine, Sliders, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../services/api';

const FEATURES = [
    { icon: RefreshCw, label: 'Recurring expenses', description: 'auto-split monthly bills' },
    { icon: Download,  label: 'CSV & PDF exports', description: 'download your full history' },
    { icon: ScanLine,  label: 'Receipt OCR', description: 'scan and split itemized receipts' },
    { icon: Sliders,   label: 'Advanced splits', description: 'percentages, weights, itemized' },
    { icon: Zap,       label: 'Auto Interac confirmation', description: 'no manual tap required' },
];

export default function ProUpsellBanner() {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(
        () => localStorage.getItem('proUpsellDismissed') === 'true'
    );
    const [loading, setLoading] = useState(false);

    if (user?.subscription_tier === 'pro' || dismissed) return null;

    const dismiss = () => {
        localStorage.setItem('proUpsellDismissed', 'true');
        setDismissed(true);
    };

    const startCheckout = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${BASE_URL}/subscription/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!resp.ok) throw new Error('checkout failed');
            const { checkout_url } = await resp.json();
            window.location.href = checkout_url;
        } catch {
            alert('Failed to start checkout. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="relative mb-8 rounded-2xl border border-border bg-surface/60 overflow-hidden">
            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2.5">
                        <Crown className="w-4 h-4 text-accent shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-primary">When you're ready to go further</h3>
                            <p className="text-xs text-secondary">From $4.99/month</p>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors shrink-0 cursor-pointer"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {FEATURES.map(({ icon: Icon, label, description }) => (
                        <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-bg/50">
                            <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="text-xs text-primary font-medium leading-tight">
                                {label}
                                <span className="text-secondary font-normal"> — {description}</span>
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={startCheckout}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Upgrade to Pro →
                </button>
            </div>
        </div>
    );
}
