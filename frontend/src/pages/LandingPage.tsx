import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, ArrowLeftRight, RefreshCw, UserCheck, CreditCard, Mail,
} from 'lucide-react';

// ── Animated background paths (BackgroundPaths-style via framer-motion) ────
function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M${-380 + i * 5 * position} -189 C${-312 + i * 5} 216 ${-100 + i * 5} 216 C${200 + i * 5} -324 ${500 + i * 5} -324 C${800 + i * 5} 216 ${1000 + i * 5} 216`,
        width: 0.4 + (i / 36) * 1.2,
        duration: 18 + (i % 8) * 2,
        delay: -(i * 0.5),
        opacity: 0.018 + (i / 36) * 0.052,
    }));

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="-400 -400 1600 750"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            aria-hidden="true"
        >
            {paths.map((p) => (
                <motion.path
                    key={p.id}
                    d={p.d}
                    stroke={`rgba(255,255,255,${p.opacity})`}
                    strokeWidth={p.width}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: [0, 0.6, 0], opacity: [0, 1, 0] }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: p.delay,
                        repeatDelay: 0.5,
                    }}
                />
            ))}
        </svg>
    );
}

// ── Data ───────────────────────────────────────────────────────────────────
const FEATURES = [
    {
        Icon: Users,
        title: 'Group Expenses',
        desc: 'Add any expense and split it equally or by custom amounts.',
        pro: false,
    },
    {
        Icon: ArrowLeftRight,
        title: 'Smart Settle Up',
        desc: 'See exactly who pays whom. No spreadsheets required.',
        pro: false,
    },
    {
        Icon: RefreshCw,
        title: 'Recurring Bills',
        desc: 'Automate monthly shared expenses like rent and utilities.',
        pro: true,
    },
    {
        Icon: UserCheck,
        title: 'Friends & Balances',
        desc: 'Track what you owe across all your friends in one place.',
        pro: false,
    },
    {
        Icon: CreditCard,
        title: 'Pay Without the App',
        desc: 'Send a Stripe payment link — friends pay by card, no download needed.',
        pro: false,
    },
    {
        Icon: Mail,
        title: 'Auto Confirmation',
        desc: 'TandemPay reads your Interac email and marks it paid automatically.',
        pro: true,
    },
] as const;

const STEPS = [
    {
        n: '1',
        title: 'Add an expense',
        desc: 'Someone pays the bill — you log it in TandemPay in seconds.',
    },
    {
        n: '2',
        title: 'See who owes what',
        desc: 'Balances update instantly across the group. No math required.',
    },
    {
        n: '3',
        title: 'Settle up',
        desc: 'Follow the instructions, mark it paid, done. Clean slate.',
    },
] as const;

// ── Page ───────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">

            {/* ── NAV ─────────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <span className="text-lg font-bold text-white tracking-tight">TandemPay</span>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Log in
                        </Link>
                        <Link
                            to="/register"
                            className="px-4 py-2 text-sm font-bold bg-white text-zinc-950 rounded-xl hover:bg-zinc-100 transition-colors"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 pt-16">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />

                {/* Ambient amber glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[560px] h-[560px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
                </div>

                <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55 }}
                    >
                        <span className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
                            Built for Canadian roommates 🍁
                        </span>
                    </motion.div>

                    <motion.h1
                        className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.1 }}
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                            Split bills.<br />Not friendships.
                        </span>
                    </motion.h1>

                    <motion.p
                        className="text-zinc-400 text-lg max-w-md mx-auto mb-10 leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.2 }}
                    >
                        TandemPay tracks shared expenses, simplifies who owes what,
                        and tells you exactly how to settle up — no awkward conversations needed.
                    </motion.p>

                    <motion.div
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.3 }}
                    >
                        <Link
                            to="/register"
                            className="w-full sm:w-auto px-7 py-3.5 bg-white text-zinc-950 text-sm font-bold rounded-xl hover:bg-zinc-100 transition-colors text-center"
                        >
                            Get started free
                        </Link>
                        <Link
                            to="/pricing"
                            className="w-full sm:w-auto px-7 py-3.5 border border-zinc-700 text-white text-sm font-semibold rounded-xl hover:border-zinc-500 hover:bg-zinc-900/50 transition-colors text-center"
                        >
                            See pricing
                        </Link>
                    </motion.div>

                    <motion.p
                        className="text-zinc-500 text-xs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.55, delay: 0.45 }}
                    >
                        Free forever · No credit card required · Built for Canada
                    </motion.p>
                </div>
            </section>

            {/* ── FEATURES ────────────────────────────────────────────────── */}
            <section className="py-24 border-t border-zinc-900">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Features</p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything your group needs</h2>
                    </div>

                    {/* Horizontal scroll row */}
                    <div className="overflow-x-auto pb-4 -mx-6 px-6">
                        <div className="flex gap-4 min-w-max">
                            {FEATURES.map(({ Icon, title, desc, pro }) => (
                                <div
                                    key={title}
                                    className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 min-w-[260px] max-w-[300px]"
                                >
                                    {pro && (
                                        <span className="absolute top-4 right-4 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5">
                                            Pro
                                        </span>
                                    )}
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <p className="font-semibold text-white text-sm">{title}</p>
                                    <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
            <section className="py-24 border-t border-zinc-900 bg-[#08080A]">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">How it works</p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">Three steps. Done.</h2>
                    </div>

                    <div className="flex flex-col md:flex-row">
                        {STEPS.map(({ n, title, desc }, i) => (
                            <div key={n} className={`flex-1 px-8 py-8 md:py-0 ${i > 0 ? 'md:border-l border-zinc-800' : ''} ${i < STEPS.length - 1 ? 'border-b md:border-b-0 border-zinc-800' : ''}`}>
                                <span className="text-5xl font-black text-amber-500 block mb-4">{n}</span>
                                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FOOTER CTA ──────────────────────────────────────────────── */}
            <section className="py-24 border-t border-zinc-900 text-center px-6">
                <div className="max-w-xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8 leading-tight">
                        Ready to stop doing math<br className="hidden sm:block" /> in your head?
                    </h2>
                    <Link
                        to="/register"
                        className="inline-block px-8 py-4 bg-white text-zinc-950 text-sm font-bold rounded-xl hover:bg-zinc-100 transition-colors mb-12"
                    >
                        Create your free account
                    </Link>

                    <div className="flex items-center justify-center gap-6 text-sm text-zinc-500 mb-12">
                        <Link to="/pricing" className="hover:text-zinc-300 transition-colors">Pricing</Link>
                        <span className="text-zinc-800">·</span>
                        <Link to="/login" className="hover:text-zinc-300 transition-colors">Log in</Link>
                        <span className="text-zinc-800">·</span>
                        <Link to="/register" className="hover:text-zinc-300 transition-colors">Register</Link>
                    </div>

                    <p className="text-zinc-600 text-xs">© 2025 TandemPay · Built in Canada 🍁</p>
                </div>
            </section>
        </div>
    );
}
