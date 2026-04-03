import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import AuthCard from '../components/AuthCard';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [interacEmail, setInteracEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showColdStartWarning, setShowColdStartWarning] = useState(false);
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

    // Password strength
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
        <AuthCard
            footer={
                <p className="text-center text-sm text-secondary mt-6">
                    Already have an account?{' '}
                    <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-accent hover:text-accent-hover font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            }
        >
            <div className="mb-8 auth-field" style={{ animationDelay: '200ms' }}>
                <h1 className="text-xl font-bold text-primary mb-1">Create account</h1>
                <p className="text-sm text-secondary">Start splitting expenses with friends</p>
            </div>

            {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg p-3 mb-5 auth-field" style={{ animationDelay: '200ms' }}>
                    {error}
                </div>
            )}

            {showColdStartWarning && !error && (
                <div className="bg-accent/10 border border-accent/30 text-accent text-sm rounded-lg p-3 mb-5 auth-field" style={{ animationDelay: '200ms' }}>
                    <p className="font-semibold mb-1">Server is waking up 😴</p>
                    <p>Since we're using a free server tier, the database spins down when not in use. This first request might take up to 50 seconds to complete. Please hang tight!</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="auth-field" style={{ animationDelay: '300ms' }}>
                    <label className="block text-sm font-medium text-secondary mb-2">Name</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-secondary/60" />
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                            className="auth-input w-full bg-bg border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-primary placeholder-secondary/50 focus:outline-none transition-all duration-200"
                        />
                    </div>
                </div>
                <div className="auth-field" style={{ animationDelay: '350ms' }}>
                    <label className="block text-sm font-medium text-secondary mb-2">Email</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-secondary/60" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="auth-input w-full bg-bg border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-primary placeholder-secondary/50 focus:outline-none transition-all duration-200"
                        />
                    </div>
                </div>
                <div className="auth-field" style={{ animationDelay: '400ms' }}>
                    <label className="block text-sm font-medium text-secondary mb-2">Interac e-Transfer Email <span className="text-secondary/50 font-normal">(Optional)</span></label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-secondary/60" />
                        </div>
                        <input
                            type="email"
                            value={interacEmail}
                            onChange={(e) => setInteracEmail(e.target.value)}
                            placeholder="For friends to pay you back"
                            className="auth-input w-full bg-bg border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-primary placeholder-secondary/50 focus:outline-none transition-all duration-200"
                        />
                    </div>
                    <p className="text-[11px] text-secondary/60 mt-1.5 ml-1">If provided, this is the email friends will see when paying balances via E-Transfer.</p>
                </div>
                <div className="auth-field" style={{ animationDelay: '450ms' }}>
                    <label className="block text-sm font-medium text-secondary mb-2">Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-secondary/60" />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="auth-input w-full bg-bg border border-border rounded-xl pl-11 pr-11 py-3 text-sm text-primary placeholder-secondary/50 focus:outline-none transition-all duration-200"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {/* Password strength bar */}
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
                <div className="auth-field" style={{ animationDelay: '500ms' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 mt-2 cursor-pointer hover:shadow-lg hover:shadow-accent/20"
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
                </div>
            </form>
        </AuthCard>
    );
}
