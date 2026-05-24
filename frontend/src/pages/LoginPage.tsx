import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, Wallet } from "lucide-react";

// TandemPay brand colors:
// Green character:  #34D399 (emerald accent)
// Dark character:   #27272A (zinc-900)
// Amber character:  #F59E0B (Pro amber)
// Light green:      #6EE7B7 (emerald-300)
// All pupils:       #1A1A1A

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "#1A1A1A", forceLookX, forceLookY }: PupilProps) => {
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
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
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
  forceLookX?: number; forceLookY?: number;
}

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "#1A1A1A", isBlinking = false, forceLookX, forceLookY }: EyeBallProps) => {
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
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isGreenBlinking, setIsGreenBlinking] = useState(false);
  const [isDarkBlinking, setIsDarkBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isGreenPeeking, setIsGreenPeeking] = useState(false);

  const greenRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const amberRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

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
    const t2 = scheduleBlink(setIsDarkBlinking);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setIsGreenPeeking(true);
        setTimeout(() => setIsGreenPeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    } else {
      setIsGreenPeeking(false);
    }
  }, [password, showPassword, isGreenPeeking]);

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
  const darkPos = calculatePosition(darkRef);
  const amberPos = calculatePosition(amberRef);
  const lightPos = calculatePosition(lightRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
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

        {/* Characters */}
        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <div className="relative" style={{ width: "550px", height: "400px" }}>

            {/* Green tall rectangle — back layer */}
            <div ref={greenRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "70px", width: "180px",
                height: (isTyping || (password.length > 0 && !showPassword)) ? "440px" : "400px",
                backgroundColor: "#34D399",
                borderRadius: "10px 10px 0 0", zIndex: 1,
                transform: (password.length > 0 && showPassword)
                  ? "skewX(0deg)"
                  : (isTyping || (password.length > 0 && !showPassword))
                    ? `skewX(${(greenPos.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${greenPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}>
              <div className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "20px" : isLookingAtEachOther ? "55px" : `${45 + greenPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? "35px" : isLookingAtEachOther ? "65px" : `${40 + greenPos.faceY}px`,
                }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isGreenBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isGreenPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isGreenPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isGreenBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isGreenPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isGreenPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
              </div>
            </div>

            {/* Dark zinc rectangle — middle layer */}
            <div ref={darkRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "240px", width: "120px", height: "310px",
                backgroundColor: "#27272A",
                borderRadius: "8px 8px 0 0", zIndex: 2,
                transform: (password.length > 0 && showPassword)
                  ? "skewX(0deg)"
                  : isLookingAtEachOther
                    ? `skewX(${(darkPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || (password.length > 0 && !showPassword))
                      ? `skewX(${(darkPos.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${darkPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}>
              <div className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "10px" : isLookingAtEachOther ? "32px" : `${26 + darkPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? "28px" : isLookingAtEachOther ? "12px" : `${32 + darkPos.faceY}px`,
                }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isDarkBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#1A1A1A" isBlinking={isDarkBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
              </div>
            </div>

            {/* Amber semi-circle — front left */}
            <div ref={amberRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "0px", width: "240px", height: "200px", zIndex: 3,
                backgroundColor: "#F59E0B",
                borderRadius: "120px 120px 0 0",
                transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${amberPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}>
              <div className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "50px" : `${82 + (amberPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "85px" : `${90 + (amberPos.faceY || 0)}px`,
                }}>
                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
            </div>

            {/* Light emerald rounded rectangle — front right */}
            <div ref={lightRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "310px", width: "140px", height: "230px",
                backgroundColor: "#6EE7B7",
                borderRadius: "70px 70px 0 0", zIndex: 4,
                transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${lightPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}>
              <div className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "20px" : `${52 + (lightPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "35px" : `${40 + (lightPos.faceY || 0)}px`,
                }}>
                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#1A1A1A" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
              <div className="absolute w-20 h-[4px] bg-[#1A1A1A] rounded-full transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "10px" : `${40 + (lightPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "88px" : `${88 + (lightPos.faceY || 0)}px`,
                }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-20 text-sm text-secondary">
          Free forever · Built in Canada 🍁
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

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Welcome back to TandemPay</h1>
            <p className="text-secondary text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-primary">Email</Label>
              <input id="email" type="email" placeholder="you@example.com" value={email} autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                required
                className="flex h-12 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-primary">Password</Label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl border border-border bg-surface px-4 pr-11 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-accent hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-base transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <div className="text-center text-sm text-secondary mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
