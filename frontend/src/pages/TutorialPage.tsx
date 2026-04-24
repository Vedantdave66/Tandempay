import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Wallet, ArrowLeft, Users, Receipt, TrendingUp,
    Bell, CreditCard, Send, ArrowRight, ChevronDown
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const steps = [
    {
        id: 'groups',
        step: '01',
        title: 'Create Groups & Add Friends',
        description: 'Start by creating a group for your trip, apartment, or night out. Invite friends via their email so everyone can collaborate and see the same real-time balances.',
        icon: Users,
        accent: '#6366F1',
        accentBg: 'rgba(99,102,241,0.08)',
        accentGlow: 'rgba(99,102,241,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs">
                <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                        <Users className="w-5 h-5" style={{ color: '#6366F1' }} />
                    </div>
                    <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--color-primary-base)' }}>Miami Trip 🌴</div>
                        <div className="text-xs" style={{ color: 'var(--color-secondary-base)' }}>4 members</div>
                    </div>
                </div>
                <div className="flex -space-x-3">
                    {['AL', 'KM', 'JD', 'SR'].map((initials, i) => (
                        <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2" style={{ background: 'var(--color-surface-light-base)', borderColor: 'var(--color-surface-base)', color: 'var(--color-secondary-base)' }}>{initials}</div>
                    ))}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 text-white" style={{ background: '#6366F1', borderColor: 'var(--color-surface-base)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>+</div>
                </div>
            </div>
        ),
    },
    {
        id: 'expenses',
        step: '02',
        title: 'Log Shared Expenses',
        description: 'Who paid for what? Add expenses in seconds. Split equally or by exact amounts per person. No math, no drama — Tandem handles it all automatically.',
        icon: Receipt,
        accent: '#F59E0B',
        accentBg: 'rgba(245,158,11,0.08)',
        accentGlow: 'rgba(245,158,11,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs">
                <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-secondary-base)' }}>Recent Expenses</div>
                {[{ label: 'Dinner at Carbone', amount: '$240.00' }, { label: 'Uber to Hotel', amount: '$34.50' }].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl mb-2" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-base)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-primary-base)' }}>{item.label}</span>
                        <span className="font-bold text-sm" style={{ color: '#F59E0B' }}>{item.amount}</span>
                    </div>
                ))}
                <div className="mt-4 flex gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-base)' }}>
                        <div className="h-full w-1/4 rounded-full" style={{ background: '#F59E0B' }} />
                    </div>
                </div>
                <div className="text-xs text-center mt-2" style={{ color: 'var(--color-secondary-base)' }}>Split equally • 4 people</div>
            </div>
        ),
    },
    {
        id: 'balances',
        step: '03',
        title: 'Smart Balance Simplification',
        description: "Tandem's algorithm calculates the minimum number of transactions needed to settle everyone up. A owes B, B owes C? We collapse it into one clean payment.",
        icon: TrendingUp,
        accent: '#4ADE80',
        accentBg: 'rgba(74,222,128,0.08)',
        accentGlow: 'rgba(74,222,128,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs">
                <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-secondary-base)' }}>Suggested Settlements</div>
                {[
                    { from: 'Dave', to: 'You', amount: '$45.00', color: '#4ADE80' },
                    { from: 'You', to: 'Sarah', amount: '$12.50', color: '#EF4444' },
                ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-base)' }}>
                        <span className="text-sm" style={{ color: 'var(--color-primary-base)' }}>
                            {item.from} <span style={{ color: 'var(--color-secondary-base)' }}>→</span> {item.to}
                        </span>
                        <span className="font-bold text-sm" style={{ color: item.color }}>{item.amount}</span>
                    </div>
                ))}
                <div className="mt-4 text-xs text-center font-medium" style={{ color: '#4ADE80' }}>2 payments instead of 6 ✓</div>
            </div>
        ),
    },
    {
        id: 'reminders',
        step: '04',
        title: 'Automated Reminders',
        description: "Tired of awkwardly asking for money? Set a recurring reminder on any expense. Tandem will gently notify your friend every few days — so you don't have to.",
        icon: Bell,
        accent: '#FB923C',
        accentBg: 'rgba(251,146,60,0.08)',
        accentGlow: 'rgba(251,146,60,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.15)' }}>
                        <Bell className="w-4 h-4" style={{ color: '#FB923C' }} />
                    </div>
                    <span className="font-bold text-sm" style={{ color: '#FB923C' }}>Active Reminder</span>
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--color-secondary-base)' }}>Notifying Alex every <strong style={{ color: 'var(--color-primary-base)' }}>3 days</strong> about Dinner ($60.00)</div>
                <div className="p-3 rounded-xl flex justify-between items-center" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-base)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-secondary-base)' }}>Next reminder</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-primary-base)' }}>Tomorrow 2 PM</span>
                </div>
            </div>
        ),
    },
    {
        id: 'bank',
        step: '05',
        title: 'Connect Your Bank Account',
        description: 'Link your bank securely via Stripe Connect — the same technology used by Amazon and Shopify. Takes 2 minutes. You keep full control, always.',
        icon: CreditCard,
        accent: '#818CF8',
        accentBg: 'rgba(129,140,248,0.08)',
        accentGlow: 'rgba(129,140,248,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-base)' }}>
                    <CreditCard className="w-8 h-8" style={{ color: '#818CF8' }} />
                </div>
                <div className="font-bold text-lg mb-1" style={{ color: 'var(--color-primary-base)' }}>Receive Payments</div>
                <div className="text-xs mb-5 px-2" style={{ color: 'var(--color-secondary-base)' }}>Bank-level encryption via Stripe Connect</div>
                <div className="w-full py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)', boxShadow: '0 0 20px rgba(129,140,248,0.35)' }}>
                    Connect with Stripe
                </div>
            </div>
        ),
    },
    {
        id: 'settle',
        step: '06',
        title: 'Pay Right Inside the App',
        description: "No more app-switching. Pay with Apple Pay, Google Pay, or card directly through Tandem. Balances update instantly. Everyone sees it. Done.",
        icon: Send,
        accent: '#4ADE80',
        accentBg: 'rgba(74,222,128,0.08)',
        accentGlow: 'rgba(74,222,128,0.2)',
        card: (
            <div style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-base)' }} className="rounded-2xl p-6 shadow-2xl w-full max-w-xs">
                <div className="text-center mb-5">
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-secondary-base)' }}>Sending to Jane Doe</div>
                    <div className="text-4xl font-black" style={{ color: 'var(--color-primary-base)' }}>$75.50</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-base)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-light-base)', border: '1px solid var(--color-border-base)' }}>
                        <CreditCard className="w-4 h-4" style={{ color: 'var(--color-primary-base)' }} />
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-primary-base)' }}>Chase Checking •••• 1234</div>
                </div>
                <div className="w-full py-3 rounded-xl font-bold text-white text-center" style={{ background: 'linear-gradient(135deg, #4ADE80, #16A34A)', boxShadow: '0 0 20px rgba(74,222,128,0.35)' }}>
                    Pay Now
                </div>
            </div>
        ),
    },
];

export default function TutorialPage() {
    const [activeStep, setActiveStep] = useState(0);
    const sectionRefs = useRef<(HTMLElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track which section is in view
    useEffect(() => {
        const observers: IntersectionObserver[] = [];

        sectionRefs.current.forEach((el, idx) => {
            if (!el) return;
            const obs = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveStep(idx);
                },
                { threshold: 0.55 }
            );
            obs.observe(el);
            observers.push(obs);
        });

        return () => observers.forEach(o => o.disconnect());
    }, []);

    const scrollToStep = (idx: number) => {
        sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' });
    };

    const step = steps[activeStep];

    return (
        <div style={{ background: 'var(--color-bg-base)', color: 'var(--color-primary-base)' }} className="transition-colors duration-500">

            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{ background: 'rgba(var(--color-bg-base), 0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border-base)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-sm font-medium transition-colors"
                        style={{ color: 'var(--color-secondary-base)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-base)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-secondary-base)')}>
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4ADE80, #16A34A)', boxShadow: '0 4px 14px rgba(74,222,128,0.3)' }}>
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold hidden sm:block" style={{ color: 'var(--color-primary-base)' }}>Tandem</span>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Fixed right-side step indicator */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 hidden md:flex">
                {steps.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => scrollToStep(i)}
                        title={s.title}
                        className="transition-all duration-300 rounded-full"
                        style={{
                            width: i === activeStep ? '10px' : '6px',
                            height: i === activeStep ? '10px' : '6px',
                            background: i === activeStep ? step.accent : 'var(--color-border-base)',
                            boxShadow: i === activeStep ? `0 0 12px ${step.accentGlow}` : 'none',
                        }}
                    />
                ))}
            </div>

            {/* Scroll container */}
            <div ref={containerRef} className="snap-container">
                {steps.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                        <section
                            key={s.id}
                            ref={el => { sectionRefs.current[idx] = el; }}
                            className="snap-section relative flex items-center justify-center overflow-hidden"
                        >
                            {/* Ambient glow */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${s.accentBg}, transparent)`
                            }} />

                            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-20 pb-12 grid md:grid-cols-2 gap-16 items-center">

                                {/* Left: Text content */}
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
                                        style={{ background: s.accentBg, color: s.accent, border: `1px solid ${s.accentGlow}` }}>
                                        <Icon className="w-3.5 h-3.5" />
                                        Step {s.step}
                                    </div>

                                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.08]"
                                        style={{ color: 'var(--color-primary-base)' }}>
                                        {s.title}
                                    </h2>

                                    <p className="text-lg leading-relaxed mb-10 max-w-md"
                                        style={{ color: 'var(--color-secondary-base)' }}>
                                        {s.description}
                                    </p>

                                    <div className="flex items-center gap-4">
                                        {idx < steps.length - 1 ? (
                                            <button
                                                onClick={() => scrollToStep(idx + 1)}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                                style={{ background: s.accent, color: '#fff', boxShadow: `0 0 24px ${s.accentGlow}` }}>
                                                Next
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <Link to="/register"
                                                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                                style={{ background: 'linear-gradient(135deg, #4ADE80, #16A34A)', boxShadow: '0 0 30px rgba(74,222,128,0.3)' }}>
                                                Get Started Free
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        )}
                                        <span className="text-xs font-medium" style={{ color: 'var(--color-secondary-base)' }}>
                                            {idx + 1} / {steps.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Interactive Card */}
                                <div className="flex items-center justify-center">
                                    <div style={{ filter: `drop-shadow(0 0 60px ${s.accentGlow})` }}>
                                        {s.card}
                                    </div>
                                </div>
                            </div>

                            {/* Scroll hint (first section only) */}
                            {idx === 0 && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce"
                                    style={{ color: 'var(--color-secondary-base)' }}>
                                    <span className="text-xs font-medium">Scroll to explore</span>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
