import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TandemPayLogo from './TandemPayLogo';

const KEYFRAMES = `
  @keyframes tp-hop {
    0%, 100% { transform: translateY(0)     scale(1, 1); }
    24%      { transform: translateY(-26px) scale(0.965, 1.04); }
    48%      { transform: translateY(0)     scale(1.07, 0.92); }
    60%      { transform: translateY(0)     scale(1, 1); }
  }
  @keyframes tp-shadow {
    0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: 1; }
    24%      { transform: translateX(-50%) scaleX(0.68); opacity: 0.45; }
    48%      { transform: translateX(-50%) scaleX(1.08); opacity: 1; }
  }
  @keyframes tp-glow {
    0%, 100% { opacity: .6; transform: translate(-50%,-70%) scale(1); }
    50%      { opacity: 1;  transform: translate(-50%,-70%) scale(1.08); }
  }
  @keyframes tp-sweep { 0% { left: -42%; } 100% { left: 100%; } }
  @keyframes tp-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
  @media (prefers-reduced-motion: reduce) {
    .tp-body, .tp-shadow, .tp-glow, .tp-comet, .tp-eye { animation: none !important; }
    .tp-comet { left: 30% !important; }
  }
`;

type Theme = {
  bg: string; glow: string; ink: string; accent: string; sub: string;
  track: string; shadow: string; pillBg: string; pillInk: string;
  supp: string[];
};

const THEMES: Record<'dark' | 'light', Theme> = {
  dark: {
    bg: 'radial-gradient(42% 38% at 50% 45%, rgba(45,224,107,0.12), rgba(7,16,11,0) 72%), #07100B',
    glow: 'rgba(45,224,107,0.30)', ink: '#F2FBF5', accent: '#2DE06B', sub: '#6E7C73',
    track: 'rgba(255,255,255,0.07)', shadow: 'rgba(0,0,0,0.45)',
    pillBg: 'rgba(255,255,255,0.08)', pillInk: '#CFE9D8',
    supp: ['linear-gradient(180deg,#3BEB7E,#23C766)', 'linear-gradient(180deg,#F4B544,#E8972A)', 'linear-gradient(180deg,#7DEFC0,#52DBA0)'],
  },
  light: {
    bg: 'radial-gradient(46% 42% at 50% 44%, rgba(22,163,74,0.14), rgba(240,247,240,0) 72%), #EAF3EC',
    glow: 'rgba(34,197,94,0.22)', ink: '#0E140F', accent: '#0E9F4F', sub: '#5E6F64',
    track: 'rgba(0,0,0,0.07)', shadow: 'rgba(20,60,35,0.18)',
    pillBg: 'rgba(20,60,35,0.08)', pillInk: '#2C5840',
    supp: ['linear-gradient(180deg,#3DD978,#1FB862)', 'linear-gradient(180deg,#F2AC36,#E0901F)', 'linear-gradient(180deg,#74E3B5,#46C892)'],
  },
};

const SHAPES: Record<string, { w: number; h: number; r: string; eyeTop: number }> = {
  rect:  { w: 58, h: 104, r: '14px 14px 4px 4px', eyeTop: 18 },
  tall:  { w: 42, h: 124, r: '10px 10px 4px 4px', eyeTop: 20 },
  semi:  { w: 104, h: 58, r: '52px 52px 6px 6px', eyeTop: 16 },
  round: { w: 74, h: 104, r: '37px 37px 4px 4px', eyeTop: 20 },
};

const SUPPORT = [
  { w: 50, h: 96,  r: '14px 14px 4px 4px', eyeTop: 16 },
  { w: 78, h: 42,  r: '42px 42px 6px 6px', eyeTop: 13 },
  { w: 46, h: 88,  r: '24px 24px 4px 4px', eyeTop: 15 },
];

function useDarkMode() {
  const isDarkNow = () =>
    document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.classList.contains('dark');

  const [isDark, setIsDark] = useState(isDarkNow);

  useEffect(() => {
    setIsDark(isDarkNow());
    const obs = new MutationObserver(() => setIsDark(isDarkNow()));
    obs.observe(document.documentElement, { attributes: true });
    obs.observe(document.body, { attributes: true });
    return () => obs.disconnect();
  }, []);

  return isDark;
}

function Eyes({ top, size, gap, pupil }: { top: number; size: number; gap: number; pupil: number }) {
  const eye = (): React.CSSProperties => ({
    width: size, height: size, background: '#fff', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transformOrigin: 'center', overflow: 'hidden',
    animation: `tp-blink ${(3.2 + Math.random() * 2.4).toFixed(2)}s ${(Math.random() * 1.5).toFixed(2)}s infinite`,
  });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap }}>
      <div className="tp-eye" style={eye()}><div style={{ width: pupil, height: pupil, background: '#15211A', borderRadius: '50%' }} /></div>
      <div className="tp-eye" style={eye()}><div style={{ width: pupil, height: pupil, background: '#15211A', borderRadius: '50%' }} /></div>
    </div>
  );
}

function Toon({ grad, w, h, r, eyeTop, delay, t, hero, label }: {
  grad: string; w: number; h: number; r: string; eyeTop: number;
  delay: number; t: Theme; hero?: boolean; label?: string;
}) {
  const size = hero ? 13 : 11, gap = hero ? 11 : 9, pupil = hero ? 5 : 4;
  const shadow = hero
    ? 'inset 0 -12px 26px rgba(0,0,0,0.14), inset 0 9px 18px rgba(255,255,255,0.20), 0 8px 28px rgba(0,0,0,0.25)'
    : 'inset 0 -10px 22px rgba(0,0,0,0.12), inset 0 8px 16px rgba(255,255,255,0.16)';
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        className="tp-body"
        style={{ position: 'relative', width: w, height: h, background: grad, borderRadius: r, transformOrigin: 'bottom center', animation: `tp-hop 1.3s ease-in-out ${delay}s infinite`, boxShadow: shadow }}
      >
        <Eyes top={eyeTop} size={size} gap={gap} pupil={pupil} />
      </div>
      {label && (
        <div style={{ marginTop: 12, background: t.pillBg, color: t.pillInk, fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {label}
        </div>
      )}
      <div
        className="tp-shadow"
        style={{ position: 'absolute', bottom: -14, left: '50%', width: '70%', height: 12, borderRadius: '50%', background: t.shadow, filter: 'blur(3px)', animation: `tp-shadow 1.3s ease-in-out ${delay}s infinite` }}
      />
    </div>
  );
}

export default function LoadingScreen() {
  const isDark = useDarkMode();
  const { user } = useAuth();
  const t = THEMES[isDark ? 'dark' : 'light'];

  const shape = (user?.character_shape && SHAPES[user.character_shape]) ? user.character_shape : 'rect';
  const s = SHAPES[shape];
  const heroColor = user?.character_color || user?.avatar_color || '#34D399';
  const nick = user?.character_nickname || null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: t.bg, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div
          className="tp-glow"
          style={{ position: 'absolute', top: '50%', left: '50%', width: 380, height: 380, transform: 'translate(-50%,-70%)', filter: 'blur(6px)', pointerEvents: 'none', background: `radial-gradient(circle, ${t.glow}, transparent 60%)`, animation: 'tp-glow 3.6s ease-in-out infinite' }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 22 }}>
          <Toon t={t} grad={t.supp[0]} {...SUPPORT[0]} delay={0} />
          <Toon t={t} grad={t.supp[1]} {...SUPPORT[1]} delay={0.11} />
          <Toon t={t} grad={heroColor} w={s.w} h={s.h} r={s.r} eyeTop={s.eyeTop} delay={0.22} hero label={nick ? `You · ${nick}` : 'You'} />
          <Toon t={t} grad={t.supp[2]} {...SUPPORT[2]} delay={0.33} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 30 }}>
          <TandemPayLogo size={26} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, marginTop: 8, fontSize: 13.5, fontWeight: 600, color: t.sub }}>
          {nick ? `Hi ${nick} — getting your groups in order…` : 'Getting your groups in order…'}
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 26, width: 200, height: 3, borderRadius: 3, overflow: 'hidden', background: t.track }}>
          <div
            className="tp-comet"
            style={{ position: 'absolute', top: 0, left: '-42%', width: '42%', height: '100%', borderRadius: 3, background: `linear-gradient(90deg, transparent 0%, ${t.accent} 60%, #9CF7C2 100%)`, boxShadow: `0 0 12px ${t.glow}`, animation: 'tp-sweep 1.5s cubic-bezier(.65,0,.35,1) infinite' }}
          />
        </div>
      </div>
    </>
  );
}
