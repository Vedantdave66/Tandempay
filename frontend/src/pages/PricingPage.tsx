import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Loader2, Wallet } from 'lucide-react';
import { BASE_URL } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const FREE_FEATURES = [
    'Unlimited friends',
    'Group expense splitting',
    'Equal splits',
    'Debt simplification',
    'Settlement tracking',
    'Interac guidance',
    'Notifications',
    'Activity feed',
    'Invite links',
];

const PRO_FEATURES = [
    'Everything in Free',
    'Recurring expenses automation',
    'CSV & PDF exports',
    'Receipt OCR',
    'Advanced splits (%, itemized, weights)',
    'Auto Interac confirmation',
    'Smart reminders',
    'Spending analytics',
    'Travel mode',
    'AI expense parsing',
    'Premium support',
];

export default function PricingPage() {
    const [loading, setLoading] = useState(false);

    const startCheckout = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/register';
            return;
        }
        setLoading(true);
        try {
            const resp = await fetch(`${BASE_URL}/subscription/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
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
        <div className="min-h-screen bg-bg text-primary transition-colors duration-500">
            {/* Ambient glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

            {/* Nav */}
            <nav className="border-b border-border bg-bg/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-accent to-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-accent/20">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-primary">Tandem</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link to="/login" className="text-sm font-medium text-secondary hover:text-primary transition-colors px-4 py-2">
                            Log in
                        </Link>
                        <Link to="/register" className="text-sm font-bold px-4 py-2 rounded-xl bg-primary text-bg hover:opacity-90 transition-opacity">
                            Get started
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
                {/* Header */}
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">Pricing</p>
                    <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight mb-3">
                        Simple pricing. Cancel anytime.
                    </h1>
                    <p className="text-secondary text-lg max-w-md mx-auto">
                        Start free, upgrade when you need more.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-6 items-stretch">
                    {/* FREE */}
                    <div className="rounded-2xl border border-border bg-surface p-8 flex flex-col">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-primary mb-2">Free</h2>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-primary">$0</span>
                                <span className="text-secondary font-medium">/ forever</span>
                            </div>
                        </div>

                        <ul className="space-y-3 flex-1 mb-8">
                            {FREE_FEATURES.map(f => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                                    <Check className="w-4 h-4 text-accent shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <Link
                            to="/register"
                            className="block text-center py-3 px-6 rounded-xl border border-border text-primary font-bold hover:bg-surface-hover transition-colors"
                        >
                            Get started free
                        </Link>
                    </div>

                    {/* PRO */}
                    <div className="relative rounded-2xl border border-accent/40 bg-surface p-8 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(74,222,128,0.08)]">
                        {/* Accent top bar */}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent via-emerald-400 to-accent/20" />

                        {/* Background glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />

                        {/* Most Popular badge */}
                        <div className="absolute top-5 right-5">
                            <span className="text-xs font-bold text-[#064E3B] bg-gradient-to-br from-[#4ADE80] to-[#22C55E] px-3 py-1 rounded-full shadow-sm">
                                Most Popular
                            </span>
                        </div>

                        <div className="relative mb-8">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-5 h-5 text-accent" />
                                <h2 className="text-xl font-bold text-primary">Pro</h2>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-primary">$4.99</span>
                                <span className="text-secondary font-medium">/ month</span>
                            </div>
                        </div>

                        <ul className="relative space-y-3 flex-1 mb-8">
                            {PRO_FEATURES.map(f => (
                                <li key={f} className="flex items-center gap-2.5 text-sm">
                                    <Check className={`w-4 h-4 shrink-0 ${f === 'Everything in Free' ? 'text-secondary' : 'text-accent'}`} />
                                    <span className={f === 'Everything in Free' ? 'text-secondary italic' : 'text-secondary'}>
                                        {f}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={startCheckout}
                            disabled={loading}
                            className="relative inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] hover:from-[#22C55E] hover:to-[#16a34a] text-[#064E3B] text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Upgrade to Pro →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
