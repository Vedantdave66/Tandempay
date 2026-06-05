import React, { useEffect, useState } from 'react';

type LogoVariant = 'light' | 'dark' | 'green' | 'auto';
type LogoSize    = 'nav' | 'md' | 'lg';

interface TandemPayLogoProps {
  variant?:   LogoVariant;
  size?:      LogoSize;
  className?: string;
  style?:     React.CSSProperties;
}

const SIZES: Record<LogoSize, number> = {
  nav: 19,
  md:  32,
  lg:  48,
};

const COLORS: Record<Exclude<LogoVariant, 'auto'>, { tandem: string; slash: string; pay: string; slashOpacity: number }> = {
  light: { tandem: '#020617', slash: '#16A34A', pay: '#16A34A', slashOpacity: 0.85 },
  dark:  { tandem: '#ffffff', slash: '#16A34A', pay: '#16A34A', slashOpacity: 0.85 },
  green: { tandem: '#ffffff', slash: 'rgba(255,255,255,0.5)', pay: 'rgba(255,255,255,0.70)', slashOpacity: 1 },
};

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

export const TandemPayLogo: React.FC<TandemPayLogoProps> = ({
  variant = 'auto',
  size = 'nav',
  className,
  style,
}) => {
  const isDark = useDarkMode();
  const fs = SIZES[size];
  const resolvedVariant: Exclude<LogoVariant, 'auto'> =
    variant === 'auto' ? (isDark ? 'dark' : 'light') : variant;
  const colors = COLORS[resolvedVariant];

  return (
    <span
      className={className}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        fontWeight:    800,
        fontSize:      fs,
        letterSpacing: '-0.025em',
        lineHeight:    1,
        userSelect:    'none',
        // Pointer-events on wrapper only — prevents gap-flicker in hover menus
        // caused by the rotated slash's visual bounds extending beyond its CSS box.
        pointerEvents: 'none',
        ...style,
      }}
    >
      <span style={{ color: colors.tandem, pointerEvents: 'none' }}>Tandem</span>

      <span
        aria-hidden="true"
        style={{
          display:       'inline-block',
          flexShrink:    0,
          alignSelf:     'center',
          width:         '1.5px',
          height:        `${1.1 * fs}px`,
          background:    colors.slash,
          opacity:       colors.slashOpacity,
          transform:     'rotate(18deg)',
          margin:        `0.05em ${0.18 * fs}px 0`,
          borderRadius:  '0.75px',
          pointerEvents: 'none',
        }}
      />

      <span style={{ color: colors.pay, pointerEvents: 'none' }}>Pay</span>
    </span>
  );
};

export default TandemPayLogo;
