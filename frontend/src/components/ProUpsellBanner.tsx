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
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);

    if (user?.subscription_tier === 'pro' || dismissed) return null;

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
        <div className="relative mb-10 rounded-[2rem] border border-accent/25 bg-surface/50 backdrop-blur-xl shadow-xl shadow-black/30 overflow-hidden">
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent via-[#22C55E] to-accent/20" />

            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-indigo/5 pointer-events-none" />

            <div className="relative z-10 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/20 flex items-center justify-center shadow-inner shrink-0">
                            <Crown className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-primary tracking-tight">Unlock TandemPay Pro</h3>
                            <p className="text-xs text-secondary font-medium">From $4.99/month</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1.5 text-secondary hover:text-primary hover:bg-surface-light rounded-lg transition-colors shrink-0 cursor-pointer"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-6">
                    {FEATURES.map(({ icon: Icon, label, description }) => (
                        <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg/40 border border-border/50">
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <span className="text-sm text-primary font-semibold leading-tight">
                                {label}
                                <span className="text-secondary font-normal"> — {description}</span>
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={startCheckout}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] hover:from-[#22C55E] hover:to-[#16a34a] text-[#064E3B] text-sm font-bold px-6 py-3 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Upgrade to Pro →
                </button>
            </div>
        </div>
    );
}
