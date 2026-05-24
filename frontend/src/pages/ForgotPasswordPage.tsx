import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Wallet } from 'lucide-react';
import { authApi } from '../services/api';

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "#1A1A1A" }: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    const pupil = pupilRef.current.getBoundingClientRect();
    const deltaX = mouseX - (pupil.left + pupil.width / 2);
    const deltaY = mouseY - (pupil.top + pupil.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };
  const pos = calculatePupilPosition();
  return (
    <div ref={pupilRef} className="rounded-full" style={{ width: `${size}px`, height: `${size}px`, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.1s ease-out" }} />
  );
};

interface EyeBallProps {
  size?: number; pupilSize?: number; maxDistance?: number;
  eyeColor?: string; pupilColor?: string; isBlinking?: boolean;
}

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "#1A1A1A", isBlinking = false }: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    const eye = eyeRef.current.getBoundingClientRect();
    const deltaX = mouseX - (eye.left + eye.width / 2);
    const deltaY = mouseY - (eye.top + eye.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };
  const pos = calculatePupilPosition();
  return (
    <div ref={eyeRef} className="rounded-full flex items-center justify-center transition-all duration-150" style={{ width: `${size}px`, height: isBlinking ? "2px" : `${size}px`, backgroundColor: eyeColor, overflow: "hidden" }}>
      {!isBlinking && <div className="rounded-full" style={{ width: `${pupilSize}px`, height: `${pupilSize}px`, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.1s ease-out" }} />}
    </div>
  );
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [mouseX, setMouseX] = useState<number>(0);
    const [mouseY, setMouseY] = useState<number>(0);
    const [isGreenBlinking, setIsGreenBlinking] = useState(false);

    const greenRef = useRef<HTMLDivElement>(null);
    const amberRef = useRef<HTMLDivElement>(null);
    const lightRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        const scheduleBlink = (setter: (v: boolean) => void) => {
            const t = setTimeout(() => {
                setter(true);
                setTimeout(() => { setter(false); scheduleBlink(setter); }, 150);
            }, Math.random() * 4000 + 3000);
            return t;
        };
        const t1 = scheduleBlink(setIsGreenBlinking);
        return () => { clearTimeout(t1); };
    }, []);

    const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
        const rect = ref.current.getBoundingClientRect();
        const deltaX = mouseX - (rect.left + rect.width / 2);
        const deltaY = mouseY - (rect.top + rect.height / 3);
        return {
            faceX: Math.max(-15, Math.min(15, deltaX / 20)),
            faceY: Math.max(-10, Math.min(10, deltaY / 30)),
            bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
        };
    };

    const greenPos = calculatePosition(greenRef);
    const amberPos = calculatePosition(amberRef);
    const lightPos = calculatePosition(lightRef);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authApi.forgotPassword(email);
            setSubmitted(true);
        } catch (err: any) {
            console.error('Password reset request failed:', err);
            setError(err.message || 'No account found with this email address.');
        } finally {
            setLoading(false);
        }
    };

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

                {/* Characters — green, amber, light emerald */}
                <div className="relative z-20 flex items-end justify-center h-[500px]">
                    <div className="relative" style={{ width: "550px", height: "400px" }}>

                        {/* Green tall rectangle — back layer */}
                        <div ref={greenRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
                            style={{
                                left: "80px", width: "180px", height: "400px",
                                backgroundColor: "#34D399",
                                borderRadius: "10px 10px 0 0", zIndex: 1,
                                transform: `skewX(${greenPos.bodySkew || 0}deg)`,
                                transformOrigin: "bottom center",
                            }}>
                            <div className="absolute flex gap-8 transition-all duration-200 ease-out"
                                style={{
                                    left: `${45 + greenPos.faceX}px`,
                                    top: `${40 + greenPos.faceY}px`,
                                }}>
                                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isGreenBlinking} />
                                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isGreenBlinking} />
                            </div>
                        </div>

                        {/* Amber semi-circle — front left */}
                        <div ref={amberRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
                            style={{
                                left: "0px", width: "240px", height: "200px", zIndex: 3,
                                backgroundColor: "#F59E0B",
                                borderRadius: "120px 120px 0 0",
                                transform: `skewX(${amberPos.bodySkew || 0}deg)`,
                                transformOrigin: "bottom center",
                            }}>
                            <div className="absolute flex gap-8 transition-all duration-200 ease-out"
                                style={{
                                    left: `${82 + (amberPos.faceX || 0)}px`,
                                    top: `${90 + (amberPos.faceY || 0)}px`,
                                }}>
                                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" />
                                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" />
                            </div>
                        </div>

                        {/* Light emerald rounded rectangle — front right */}
                        <div ref={lightRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
                            style={{
                                left: "320px", width: "140px", height: "230px",
                                backgroundColor: "#6EE7B7",
                                borderRadius: "70px 70px 0 0", zIndex: 4,
                                transform: `skewX(${lightPos.bodySkew || 0}deg)`,
                                transformOrigin: "bottom center",
                            }}>
                            <div className="absolute flex gap-6 transition-all duration-200 ease-out"
                                style={{
                                    left: `${52 + (lightPos.faceX || 0)}px`,
                                    top: `${40 + (lightPos.faceY || 0)}px`,
                                }}>
                                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" />
                                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" />
                            </div>
                            <div className="absolute w-20 h-[4px] bg-[#1A1A1A] rounded-full transition-all duration-200 ease-out"
                                style={{
                                    left: `${40 + (lightPos.faceX || 0)}px`,
                                    top: `${88 + (lightPos.faceY || 0)}px`,
                                }} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-20 text-sm text-secondary">
                    <p className="font-semibold text-primary mb-0.5">We've got you covered</p>
                    <p>Reset link sent in seconds</p>
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

                    {!submitted ? (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Reset password</h1>
                                <p className="text-secondary text-sm">Enter your email and we'll send you a link to reset your password.</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                                    <p className="text-sm text-danger">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Email address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-secondary" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-base transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </div>
                                    ) : (
                                        'Send reset link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center text-sm">
                                <Link to="/login" className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to log in
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-accent" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-primary mb-2">Check your email</h2>
                            <p className="text-secondary text-sm mb-8">
                                We've sent a password reset link to <span className="font-semibold text-primary">{email}</span>.
                            </p>
                            <Link
                                to="/login"
                                className="w-full bg-bg hover:bg-surface-hover border border-border text-primary font-semibold py-3 rounded-xl transition-all duration-200 block text-center"
                            >
                                Back to Log in
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
