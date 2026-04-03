import { Link } from 'react-router-dom';
import { Wallet, Shield, Zap, TrendingUp, Users, ArrowRight, PlayCircle, Bell, UserPlus, CheckCircle2 } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import React, { useEffect, useState } from 'react';

// Reusable animated wrapper for scroll reveals
function Reveal({ children, className = '', delay = 0, fadeOnly = false }: { children: React.ReactNode, className?: string, delay?: number, fadeOnly?: boolean }) {
    const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
    const baseClass = fadeOnly ? 'reveal-fade' : 'reveal-up';
    return (
        <div ref={ref} className={`${baseClass} ${isVisible ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#09090B] selection:bg-accent/30 selection:text-white overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px] pointer-events-none animate-mesh" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none animate-mesh" style={{ animationDelay: '-7s' }} />

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 relative group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="absolute inset-0 bg-accent/20 rounded-xl blur-lg group-hover:bg-accent/40 transition-all duration-300" />
                        <div className="relative w-10 h-10 bg-gradient-to-br from-accent to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                            <Wallet className="w-5 h-5 text-[#064E3B]" />
                        </div>
                        <span className="relative text-xl font-bold tracking-tight text-white hidden sm:block">Tandem</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-6">
                        <Link to="/tutorial" className="hidden md:flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
                            <PlayCircle className="w-4 h-4" />
                            How it works
                        </Link>
                        <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Log in
                        </Link>
                        <Link to="/register" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-transform transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32">
                {/* Hero Section */}
                <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-32 flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 text-center lg:text-left z-10">
                        <Reveal>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-8 backdrop-blur-md">
                                <SparklesIcon className="w-4 h-4" />
                                <span>The new standard for group expenses</span>
                            </div>
                        </Reveal>

                        <Reveal delay={100}>
                            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight mb-8 leading-[1.1]">
                                Split expenses.<br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-emerald-400 to-emerald-600 animate-pulse">
                                    Settle instantly.
                                </span>
                            </h1>
                        </Reveal>

                        <Reveal delay={200}>
                            <p className="text-lg text-secondary max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                                Say goodbye to awkward money conversations. Track shared expenses, simplify group balances, and send gentle reminders using a modern, fast, and secure platform.
                            </p>
                        </Reveal>

                        <Reveal delay={300}>
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent-hover hover:to-emerald-600 text-[#064E3B] text-base font-bold transition-transform transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(52,211,153,0.5)] flex items-center justify-center gap-2">
                                    Create Free Account
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link to="/tutorial" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-base font-bold transition-colors flex items-center justify-center gap-2">
                                    <PlayCircle className="w-5 h-5" />
                                    See how it works
                                </Link>
                            </div>
                        </Reveal>
                    </div>

                    {/* Interactive Abstract UI element */}
                    <div className="flex-1 w-full max-w-lg lg:max-w-none relative h-[400px] hidden md:block perspective-1000">
                        <Reveal fadeOnly delay={400} className="absolute inset-0">
                            {/* Glow behind the cards */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 rounded-full blur-[80px]" />
                            
                            {/* Card 1: Balance */}
                            <div className="absolute top-[10%] left-[10%] w-72 bg-[#111318]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-float" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-10deg) rotateX(5deg)' }}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">JD</div>
                                        <div>
                                            <div className="text-sm font-bold text-white">John Doe</div>
                                            <div className="text-xs text-white/50">Owes you</div>
                                        </div>
                                    </div>
                                    <span className="text-accent font-bold">$45.00</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent w-1/3 rounded-full" />
                                </div>
                            </div>

                            {/* Card 2: Notification */}
                            <div className="absolute bottom-[20%] right-[5%] w-64 bg-[#111318]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-float-slow z-10" style={{ transformStyle: 'preserve-3d', transform: 'translateZ(50px)' }}>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                                        <Bell className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Reminder</div>
                                        <div className="text-xs text-white/60 mt-1 leading-relaxed">It's been 3 days. Time to settle up for "Dinner at Joey's".</div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* Feature 1: Lightning Fast Logging */}
                <section className="py-24 border-t border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                        <Reveal>
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/10 rounded-3xl blur-2xl" />
                                <div className="relative bg-[#111318] border border-white/10 rounded-3xl p-8 shadow-2xl">
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                                        <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-yellow-500" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg">Add Expense</div>
                                            <div className="text-white/40 text-sm">Split equally or by exact amounts</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                            <span className="text-white/80 font-medium">Uber to Concert</span>
                                            <span className="text-white font-bold">$34.50</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                            <span className="text-white/80 font-medium">Drinks</span>
                                            <span className="text-white font-bold">$82.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                        <Reveal delay={200}>
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Lightning Fast Logging</h2>
                            <p className="text-lg text-secondary leading-relaxed mb-6">
                                Create an expense in seconds. Whether you're splitting a simple cab ride equally, or itemizing a complex grocery receipt, Tandem handles the math so you don't have to.
                            </p>
                            <ul className="space-y-3">
                                {['Equal splits', 'Exact amount splits', 'Receipt-based entry (Coming soon)'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-white/80">
                                        <CheckCircle2 className="w-5 h-5 text-accent" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>
                </section>

                {/* Feature 2: Smart Balances */}
                <section className="py-24 border-t border-white/5 relative overflow-hidden bg-[#0C0E14]">
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                        <Reveal delay={200} className="order-2 md:order-1">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Smart Balance Simplification</h2>
                            <p className="text-lg text-secondary leading-relaxed mb-6">
                                Inside a group, debt can get messy. A owes B, B owes C, C owes A. Tandem's algorithm automatically optimizes these debts behind the scenes.
                            </p>
                            <p className="text-lg text-secondary leading-relaxed">
                                We calculate the <strong>minimum number of transactions</strong> needed to settle everyone up. Less transfers, less fees, less hassle.
                            </p>
                        </Reveal>
                        <Reveal className="order-1 md:order-2">
                             <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-2xl" />
                                <div className="relative bg-[#111318] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-4">
                                     <div className="flex items-center gap-4 text-white/50 text-sm mb-2">
                                         <TrendingUp className="w-4 h-4 text-accent" />
                                         Balances simplified
                                     </div>
                                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">AL</div>
                                            <ArrowRight className="w-4 h-4 text-white/30" />
                                            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">CH</div>
                                         </div>
                                         <span className="text-white font-bold tracking-tight">$120.00</span>
                                     </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* Feature 3: Settling Up */}
                <section className="py-32 border-t border-white/5 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 text-center mb-16">
                         <Reveal>
                            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">Pay balances your way</h2>
                            <p className="text-lg text-secondary max-w-2xl mx-auto">
                                Settle up securely without leaving a paper trail of IOUs.
                            </p>
                         </Reveal>
                    </div>

                    <div className="max-w-4xl mx-auto px-6">
                        <Reveal delay={200}>
                            <div className="bg-[#111318] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                                
                                <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                                    <div className="space-y-8">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                <UserPlus className="w-5 h-5 text-white/80" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold mb-1">Add Interac Email</h3>
                                                <p className="text-sm text-secondary">Set your e-transfer email in your profile so friends know exactly where to send the funds.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5 text-white/80" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold mb-1">Automated Reminders</h3>
                                                <p className="text-sm text-secondary">Set recurring reminders on specific expenses (e.g., every 3 days) to gently nudge friends.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#09090B] border border-white/5 rounded-2xl p-6 shadow-xl relative animate-float-slow">
                                        <div className="text-xs text-white/40 uppercase tracking-wider font-bold mb-4">Pending Settlement</div>
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-white font-medium">To: Jane Smith</span>
                                            <span className="text-2xl font-bold text-white">$75.50</span>
                                        </div>
                                        <button className="w-full py-3 rounded-xl bg-accent text-[#064E3B] font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] transition-shadow">
                                            Mark as Paid
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#0C0E14] relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                         <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <Wallet className="w-5 h-5 text-accent" />
                                <span className="text-xl font-bold text-white">Tandem</span>
                            </div>
                            <p className="text-sm text-secondary max-w-xs">
                                The stress-free way to share expenses and settle balances with friends and flatmates.
                            </p>
                         </div>
                         <div>
                            <h4 className="text-white font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-secondary">
                                <li><Link to="/register" className="hover:text-accent transition-colors">Sign Up</Link></li>
                                <li><Link to="/login" className="hover:text-accent transition-colors">Log In</Link></li>
                                <li><Link to="/tutorial" className="hover:text-accent transition-colors text-white font-medium">How it works</Link></li>
                            </ul>
                         </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
                        <p>© {new Date().getFullYear()} TandemPay. All rights reserved.</p>
                        <p>Designed with precision.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="Mm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
