import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Wallet } from 'lucide-react';
import Characters from '../components/Characters';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [interacEmail, setInteracEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showColdStartWarning, setShowColdStartWarning] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (!loading) setShowColdStartWarning(false);
    }, [loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');

        const warningTimer = setTimeout(() => {
            setShowColdStartWarning(true);
        }, 5000);

        try {
            await register(name, email, password, interacEmail || undefined);
            clearTimeout(warningTimer);
            const returnTo = searchParams.get('returnTo');
            navigate(returnTo || '/dashboard');
        } catch (err: any) {
            clearTimeout(warningTimer);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStrength = (pw: string) => {
        if (!pw) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-danger' };
        if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-warning' };
        if (score <= 3) return { level: 3, label: 'Good', color: 'bg-accent/70' };
        return { level: 4, label: 'Strong', color: 'bg-accent' };
    };

    const strength = getStrength(password);

    return (
        <div className="relative min-h-screen grid lg:grid-cols-2 bg-bg">
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(150,150,150,0.18) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none z-0 opacity-[0.06]"
                style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            />

            {/* Left panel — characters */}
            <div className="relative hidden lg:flex flex-col justify-between p-12">
                {/* Branding */}
                <div className="relative z-20 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-primary">TandemPay</span>
                </div>

                {/* Characters */}
                <div className="relative z-20 flex items-end justify-center h-[500px]">
                    <div className="relative" style={{ width: "550px", height: "400px" }}>
                        <Characters
                            isTyping={isTyping}
                            isHoveringSubmit={isHoveringSubmit}
                            password={password}
                            showPassword={showPassword}
                            isLoading={loading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-20 text-sm text-secondary">
                    Join thousands of Canadians splitting smarter
                </div>

                {/* Decorative */}
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            </div>

            {/* Right panel — form */}
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-[420px]">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-primary">TandemPay</span>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Create your account</h1>
                        <p className="text-secondary text-sm">Start splitting expenses with friends</p>
                    </div>

                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl p-3 mb-5">
                            {error}
                        </div>
                    )}

                    {showColdStartWarning && !error && (
                        <div className="bg-accent/10 border border-accent/30 text-accent text-sm rounded-xl p-3 mb-5">
                            <p className="font-semibold mb-1">Server is waking up 😴</p>
                            <p>Since we're using a free server tier, the database spins down when not in use. This first request might take up to 50 seconds to complete. Please hang tight!</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-secondary" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    required
                                    className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-secondary" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    placeholder="you@example.com"
                                    required
                                    className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Interac e-Transfer Email <span className="text-secondary font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-secondary" />
                                </div>
                                <input
                                    type="email"
                                    value={interacEmail}
                                    onChange={(e) => setInteracEmail(e.target.value)}
                                    placeholder="For friends to pay you back"
                                    className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                />
                            </div>
                            <p className="text-[11px] text-secondary mt-1.5 ml-1">If provided, this is the email friends will see when paying balances via E-Transfer.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-secondary" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-11 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                                    i <= strength.level ? strength.color : 'bg-border'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-[11px] font-medium ${
                                        strength.level <= 1 ? 'text-danger' :
                                        strength.level <= 2 ? 'text-warning' : 'text-accent'
                                    }`}>
                                        {strength.label}
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            onMouseEnter={() => setIsHoveringSubmit(true)}
                            onMouseLeave={() => setIsHoveringSubmit(false)}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-base transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </div>
                            ) : (
                                'Create account'
                            )}
                        </button>
                    </form>

                    <div className="text-center text-sm text-secondary mt-8">
                        Already have an account?{' '}
                        <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
