import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Wallet } from 'lucide-react';
import TandemPayLogo from '../components/TandemPayLogo';
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

const FORGOT_MAX_PHRASES = ["We got you! 💪", "Back in no time!", "You've got this!", "Reset and conquer!"];
const FORGOT_RUE_PHRASES = ["Forgot it again huh.", "It happens to the best of us.", "Classic.", "No judgment. Much judgment."];
const FORGOT_KAI_PHRASES = ["Don't worry at all! 🌸", "We'll fix this together!", "It's totally okay!", "You're doing great! 💚"];

type Speaker = 'max' | 'rue' | 'kai';

const BUBBLE_STYLE: React.CSSProperties = {
  position: 'absolute',
  transform: 'translateX(-50%)',
  transition: 'opacity 300ms ease',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '5px 10px',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  maxWidth: '190px',
  textAlign: 'center',
  pointerEvents: 'none',
  zIndex: 30,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  lineHeight: '1.4',
};

const TAIL_BORDER: React.CSSProperties = {
  position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)',
  width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
  borderTop: '7px solid var(--border-color)',
};
const TAIL_FILL: React.CSSProperties = {
  position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
  width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
  borderTop: '6px solid var(--bg-secondary)',
};


export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [mouseX, setMouseX] = useState<number>(0);
    const [mouseY, setMouseY] = useState<number>(0);
    const [isGreenBlinking, setIsGreenBlinking] = useState(false);

    // ── Shared bubble state (one speaker at a time) ──
    const [activeSpeaker, setActiveSpeaker] = useState<Speaker>('max');
    const [currentPhrase, setCurrentPhrase] = useState(FORGOT_MAX_PHRASES[0]);
    const [bubbleVisible, setBubbleVisible] = useState(true);
    const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);

    const speakerRef = useRef<Speaker>('max');
    const phraseIdxRef = useRef<Record<Speaker, number>>({ max: 0, rue: 0, kai: 0 });
    const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerActiveRef = useRef(false);
    const fireTriggerRef = useRef<(s: Speaker, p: string, permanent?: boolean) => void>(() => {});

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

    // ── Bubble cycling system ──
    useEffect(() => {
        const phrases: Record<Speaker, string[]> = {
            max: FORGOT_MAX_PHRASES, rue: FORGOT_RUE_PHRASES, kai: FORGOT_KAI_PHRASES,
        };
        const all: Speaker[] = ['max', 'rue', 'kai'];

        const transition = (next: Speaker, phrase: string) => {
            setBubbleVisible(false);
            setTimeout(() => {
                speakerRef.current = next;
                setActiveSpeaker(next);
                setCurrentPhrase(phrase);
                setBubbleVisible(true);
            }, 300);
        };

        const startCycle = () => {
            if (cycleRef.current) clearTimeout(cycleRef.current);
            cycleRef.current = setTimeout(() => {
                if (triggerActiveRef.current) { startCycle(); return; }
                const others = all.filter(s => s !== speakerRef.current);
                const next = others[Math.floor(Math.random() * others.length)];
                phraseIdxRef.current[next] = (phraseIdxRef.current[next] + 1) % phrases[next].length;
                transition(next, phrases[next][phraseIdxRef.current[next]]);
                setTimeout(startCycle, 300);
            }, 4000);
        };

        const fireTrigger = (speaker: Speaker, phrase: string, permanent = false) => {
            triggerActiveRef.current = true;
            if (cycleRef.current) clearTimeout(cycleRef.current);
            if (resumeRef.current) clearTimeout(resumeRef.current);
            transition(speaker, phrase);
            if (!permanent) {
                resumeRef.current = setTimeout(() => {
                    triggerActiveRef.current = false;
                    startCycle();
                }, 3300);
            }
        };

        fireTriggerRef.current = fireTrigger;
        startCycle();

        return () => {
            if (cycleRef.current) clearTimeout(cycleRef.current);
            if (resumeRef.current) clearTimeout(resumeRef.current);
        };
    }, []);

    // Trigger hooks
    useEffect(() => { if (isTyping) fireTriggerRef.current('kai', "Ooh they're typing! 👀"); }, [isTyping]);
    useEffect(() => { if (isHoveringSubmit) fireTriggerRef.current('max', "DO IT! DO IT! DO IT!"); }, [isHoveringSubmit]);
    useEffect(() => { if (submitted) fireTriggerRef.current('kai', "Check your inbox! We sent it! 🎉", true); }, [submitted]);

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
                    <TandemPayLogo size="nav" />
                </div>

                {/* Characters — green (Max), amber (Rue), light (Kai) */}
                <div className="relative z-20 flex items-end justify-center h-[500px]">
                    <div className="relative" style={{ width: "550px", height: "400px" }}>

                        {/* Green tall rectangle — back layer (Max) */}
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

                        {/* Amber semi-circle — front left (Rue) */}
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

                        {/* Light emerald rounded rectangle — front right (Kai) */}
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

                        {/* ── Speech bubbles — one visible at a time ── */}
                        {/* Max — green, center x=170, above height 400 */}
                        <div style={{ ...BUBBLE_STYLE, bottom: '414px', left: '170px', opacity: activeSpeaker === 'max' && bubbleVisible ? 1 : 0 }}>
                            {currentPhrase}<div style={TAIL_BORDER} /><div style={TAIL_FILL} />
                        </div>

                        {/* Rue — amber, center x=120, above height 200 */}
                        <div style={{ ...BUBBLE_STYLE, bottom: '214px', left: '120px', opacity: activeSpeaker === 'rue' && bubbleVisible ? 1 : 0 }}>
                            {currentPhrase}<div style={TAIL_BORDER} /><div style={TAIL_FILL} />
                        </div>

                        {/* Kai — light, center x=390, above height 230 */}
                        <div style={{ ...BUBBLE_STYLE, bottom: '244px', left: '390px', opacity: activeSpeaker === 'kai' && bubbleVisible ? 1 : 0 }}>
                            {currentPhrase}<div style={TAIL_BORDER} /><div style={TAIL_FILL} />
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
                        <TandemPayLogo size="nav" />
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
                                            onFocus={() => setIsTyping(true)}
                                            onBlur={() => setIsTyping(false)}
                                            placeholder="you@example.com"
                                            required
                                            className="flex h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    onMouseEnter={() => setIsHoveringSubmit(true)}
                                    onMouseLeave={() => setIsHoveringSubmit(false)}
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
