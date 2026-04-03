import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, Users, Receipt, TrendingUp, Bell, Handshake } from 'lucide-react';
import AuthBackground from '../components/AuthBackground';

const steps = [
    {
        id: 'groups',
        title: 'Create Groups & Add Friends',
        description: 'Start by creating a group for your trip, apartment, or night out. Invite friends via their email so everyone can collaborate.',
        icon: Users,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/20',
        content: (
            <div className="bg-[#09090B] border border-white/10 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-white font-bold text-sm">Miami Trip 🌴</div>
                        <div className="text-xs text-white/50">4 members</div>
                    </div>
                </div>
                <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-surface border-2 border-[#09090B] flex items-center justify-center text-xs text-secondary font-bold">
                            U{i}
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-accent text-[#064E3B] border-2 border-[#09090B] flex items-center justify-center text-xs font-bold shrink-0">
                        +
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'expenses',
        title: 'Log Shared Expenses',
        description: 'Who paid for what? Add expenses quickly and choose how to split them: equally or by exact amounts per person.',
        icon: Receipt,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        content: (
            <div className="bg-[#09090B] border border-white/10 rounded-xl p-5 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-white font-bold text-sm">Dinner at Carbone</div>
                        <div className="text-xs text-white/50">Paid by You</div>
                    </div>
                    <span className="text-white font-bold">$240.00</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden flex">
                            <div className="w-1/4 bg-yellow-400 border-r border-[#09090B]"></div>
                            <div className="w-1/4 bg-yellow-400 border-r border-[#09090B]"></div>
                            <div className="w-1/4 bg-yellow-400 border-r border-[#09090B]"></div>
                            <div className="w-1/4 bg-yellow-400"></div>
                        </div>
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest text-center">Split equally</div>
                </div>
            </div>
        )
    },
    {
        id: 'balances',
        title: 'Smart Balances',
        description: 'Tandem calculates debts automatically. Instead of a messy web of who-owes-who, we show you the minimum transactions needed.',
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/20',
        content: (
             <div className="bg-[#09090B] border border-white/10 rounded-xl p-5 shadow-lg">
                <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Suggested Settlements</div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg mb-2">
                    <span className="text-sm text-white/80">Dave <span className="text-white/40 px-1">→</span> You</span>
                    <span className="text-accent font-bold text-sm">$45.00</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-white/80">You <span className="text-white/40 px-1">→</span> Sarah</span>
                    <span className="text-danger font-bold text-sm">$12.50</span>
                </div>
            </div>
        )
    },
    {
        id: 'reminders',
        title: 'Automated Reminders',
        description: 'Tired of asking for money back? Set a recurring reminder on an expense, and Tandem will notify them automatically.',
        icon: Bell,
        color: 'text-amber-400',
        bg: 'bg-amber-500/20',
        content: (
            <div className="bg-[#09090B] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl" />
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-bold text-sm">Active Reminder</span>
                </div>
                <div className="text-xs text-white/60 relative z-10 mb-4">Notifying participants every 3 days.</div>
                <div className="w-full h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-xs text-secondary">
                    Next: Tomorrow at 2 PM
                </div>
            </div>
        )
    },
    {
        id: 'settle',
        title: 'Settle Up Securely',
        description: 'Ready to pay? Add your Interac e-Transfer email to your profile so friends can easily copy it and send you funds directly.',
        icon: Handshake,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        content: (
             <div className="bg-[#09090B] border border-white/10 rounded-xl p-5 shadow-lg">
                <div className="text-center mb-4">
                    <div className="text-xs text-white/50 mb-1">Pay to Jane Doe</div>
                    <div className="text-lg font-bold text-white">jane.doe@example.com</div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors">
                    Copy Email
                </button>
             </div>
        )
    }
];

export default function TutorialPage() {
    const [activeStep, setActiveStep] = useState(0);

    // Auto-advance logic for demonstration
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-bg relative overflow-hidden selection:bg-accent/30 selection:text-white">
            <AuthBackground />
            
            {/* Header */}
            <div className="relative z-10 border-b border-white/5 bg-[#09090B]/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-[#064E3B]" />
                        </div>
                        <span className="font-bold text-white">Tandem</span>
                    </div>
                </div>
            </div>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24">
                <div className="text-center mb-16 auth-entrance" style={{ animationDelay: '0ms' }}>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">How it works</h1>
                    <p className="text-lg text-secondary max-w-xl mx-auto">Master Tandem in just 5 easy steps. No more spreadsheets, no more stress.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    {/* Left: Interactions */}
                    <div className="auth-entrance bg-surface border border-border rounded-3xl p-6 md:p-10 shadow-2xl relative" style={{ animationDelay: '100ms' }}>
                         {/* Dynamic Glow matching active step */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${steps[activeStep].bg.replace('/20', '/10')}`} />
                        
                        <div className="relative z-10 h-[300px] flex items-center justify-center perspective-1000">
                             {steps.map((step, idx) => (
                                 <div 
                                    key={step.id} 
                                    className={`absolute w-full max-w-sm transition-all duration-700 ease-out ${
                                        idx === activeStep 
                                            ? 'opacity-100 translate-y-0 scale-100' 
                                            : idx < activeStep 
                                                ? 'opacity-0 -translate-y-12 scale-95'
                                                : 'opacity-0 translate-y-12 scale-95'
                                    }`}
                                >
                                     {step.content}
                                 </div>
                             ))}
                        </div>
                    </div>

                    {/* Right: Step List */}
                    <div className="auth-entrance space-y-6" style={{ animationDelay: '200ms' }}>
                        {steps.map((step, idx) => {
                            const isActive = idx === activeStep;
                            const Icon = step.icon;
                            return (
                                <div 
                                    key={step.id} 
                                    onClick={() => setActiveStep(idx)}
                                    className={`group flex gap-4 cursor-pointer p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/[0.02] border border-transparent'}`}
                                >
                                    <div className="shrink-0 mt-1">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive ? step.bg : 'bg-surface border border-border group-hover:border-white/20'}`}>
                                            <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? step.color : 'text-secondary group-hover:text-white/70'}`} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold mb-2 transition-colors duration-300 ${isActive ? 'text-white' : 'text-secondary group-hover:text-white/90'}`}>
                                            {idx + 1}. {step.title}
                                        </h3>
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <p className="text-sm text-secondary/80 leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div className="pt-8">
                            <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent-hover hover:to-emerald-600 text-[#064E3B] text-base font-bold transition-transform transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                                Get Started Now
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

